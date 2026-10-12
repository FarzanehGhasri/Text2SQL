#!/usr/bin/env node
// Fits the table-relevance model (catalog/retrieval-model.json) from the labelled benchmark questions:
// the weight of every kind of evidence and the thresholds that act on the probability. Nobody chooses them.
//
//   node scripts/train-retrieval.js                       keyword evidence only (works anywhere)
//   ... --out catalog-service/text2sql/baseline-model.json   the committed baseline (keyword-only, with --report)
// Output: catalog/retrieval-model.json (not in git: on the server it is trained with the real embeddings and must not
// conflict with a git pull); catalog-service falls back to the baseline while it does not exist.
//   node scripts/train-retrieval.js --embed-url http://host.docker.internal:11434/api/embed?model=bge-m3
//                                                         + meaning (bge-m3; default EMBED_URL), as indexer-watch runs it
//   ... --rerank-url http://reranker:80/rerank            + a cross-encoder reranker (optional service)
//   ... --report                                          + an honest measurement: 10-fold cross-validation
//                                                           (every question answered by a model that never saw
//                                                           it) and paraphrases answered by a model trained
//                                                           without them; takes a few minutes
//   ... --beta 2                                          how many times a missing table counts over an extra one
//                                                         when choosing thresholds (F-beta; default 4: of 2 and 4, 4 kept more
//                                                         questions whole on unseen data at nearly the same prompt size)
//   ... --force / --quiet
//
// Training data: benchmark/02/questions.json, paraphrase_questions.json, join_path_questions.json and
// confirmed.json - every question with expected_entities is a labelled example; not_supported questions teach
// when to say "probably not answerable". More ✅-ticked answers (learn-from-inbox.js) = more training data.
//
// One model per combination of available signals (keyword; + meaning; + reranker), so catalog-service always has a
// model trained for exactly the signals it has. Does nothing when catalogs, questions and signals are unchanged.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createEmbedClient } = require('./lib/embed-client');
const { createReranker } = require('../catalog-service/clients');
const { rerankCandidates } = require('../catalog-service/text2sql/find-tables');
const { cardTexts } = require('./lib/catalog-texts');
const T = require('./lib/retrieval-training');

const ROOT = path.join(__dirname, '..');
const MODEL_NAME = 'retrieval-model.json';
const QUESTION_FILES = ['questions.json', 'paraphrase_questions.json', 'join_path_questions.json', 'confirmed.json'];

function parseArgs(argv) {
  const a = { catalogDir: path.join(ROOT, 'catalog'), questionsDir: path.join(ROOT, 'benchmark', '02'), out: null,
              embedUrl: process.env.EMBED_URL || null, rerankUrl: process.env.RERANK_URL || null, report: false, force: false, quiet: false, beta: 4 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--catalog-dir') a.catalogDir = argv[++i];
    else if (k === '--questions-dir') a.questionsDir = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--embed-url') a.embedUrl = argv[++i];
    else if (k === '--rerank-url') a.rerankUrl = argv[++i] || null;
    else if (k === '--report') a.report = true;
    else if (k === '--beta') a.beta = Number(argv[++i]);
    else if (k === '--force') a.force = true;
    else if (k === '--quiet') a.quiet = true;
    else throw new Error(`Unknown argument: ${k}`);
  }
  a.out = a.out || path.join(a.catalogDir, MODEL_NAME);
  return a;
}

// every catalog/*.json except the model itself: catalogs, embedding sidecars, query bank, values, rules
function loadItems(catalogDir) {
  const files = fs.readdirSync(catalogDir).filter((f) => f.endsWith('.json') && f !== MODEL_NAME).sort();
  return { files, items: files.map((f) => JSON.parse(fs.readFileSync(path.join(catalogDir, f), 'utf8'))) };
}

function loadQuestions(dir) {
  const out = [];
  for (const f of QUESTION_FILES) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    for (const q of JSON.parse(fs.readFileSync(p, 'utf8')).questions || []) {
      const expected = (q.expected_entities || []).length ? new Set(q.expected_entities) : null;
      if (!expected && q.category !== 'not_supported') continue;
      out.push({ id: q.id, set: f.replace(/\.json$/, ''), question: q.question, groups: q.run_as_groups || null, expected });
    }
  }
  return out;
}

function dataHash(catalogDir, files, questions, signals) {
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(f).update(fs.readFileSync(path.join(catalogDir, f)));
  h.update(JSON.stringify(questions.map((q) => [q.id, q.question, q.groups, q.expected ? [...q.expected].sort() : null])));
  h.update(JSON.stringify(signals));
  return h.digest('hex');
}

async function embedQuestions(url, questions, log) {
  try {
    const vectors = await createEmbedClient(url, { batchSize: 16 }).embedMany(questions.map((q) => q.question));
    questions.forEach((q, i) => { q.vector = vectors[i]; });
    return true;
  } catch (e) {
    log(`embeddings not used: ${e.message}`);
    return false;
  }
}

// reranker scores for each question's candidates, ranked by the best model trained so far
async function rerankQuestions(url, items, partialFile, questions, log) {
  const rerank = createReranker(url, { timeoutMs: 60000, log });
  const cardOf = cardTexts(items.filter((j) => Array.isArray(j.entities)));
  for (const q of questions) {
    const cands = rerankCandidates({ items: [...items, partialFile], question: q.question, groups: q.groups || ['NLSQL-Full'],
                                     questionEmbedding: q.vector || null }, cardOf);
    const scores = await rerank(q.question, cands.map((c) => c.text));
    if (!scores) return false;
    q.rerank = new Map(cands.map((c, i) => [c.name, scores[i]]));
  }
  return true;
}

const pct = (a, b) => `${a}/${b}`;
function printSummary(title, by, log) {
  log(title);
  for (const [set, s] of Object.entries(by)) {
    const parts = [];
    if (s.questions) parts.push(`passed ${pct(s.passed, s.questions)}`, `F${T.getBeta()} ${s.f2}`, `${s.tables} tables`, `${s.chars} chars`, `answerable flagged ${s.answerableFlagged}`);
    if (s.unanswerable) parts.push(`not answerable flagged ${pct(s.flagged, s.unanswerable)}`);
    log(`  ${set.padEnd(22)} ${parts.join(' | ')}`);
  }
}

async function run(args, { log = console.log } = {}) {
  if (!(args.beta > 0)) throw new Error('--beta must be a positive number');
  T.setBeta(args.beta);
  const { files, items } = loadItems(args.catalogDir);
  const questions = loadQuestions(args.questionsDir);
  // the hash says what the model would be trained on, before any (slow) embedding call: indexer-watch runs this
  // every minute and it must do nothing until a catalog, a question or the available signals change
  const hasSidecars = items.some((j) => j.embeddingIndex === true);
  const wanted = { semantic: Boolean(args.embedUrl && hasSidecars), rerank: Boolean(args.rerankUrl), beta: args.beta };
  const existing = fs.existsSync(args.out) ? JSON.parse(fs.readFileSync(args.out, 'utf8')) : null;
  if (!args.force && !args.report && existing && existing.dataHash === dataHash(args.catalogDir, files, questions, wanted)) {
    if (!args.quiet) log(`${path.basename(args.out)}: up to date`);
    return { status: 'skipped', file: existing };
  }
  const semantic = wanted.semantic && await embedQuestions(args.embedUrl, questions, log);

  const sets = [['lexical']];
  if (semantic) sets.push(['lexical', 'semantic']);
  const file = { retrievalModel: true, formatVersion: 1,
    description: 'Learned by scripts/train-retrieval.js - do not edit. Weights and thresholds of the table relevance model.',
    dataHash: null,
    trainedOn: { labelled: questions.filter((q) => q.expected).length, notAnswerable: questions.filter((q) => !q.expected).length, beta: args.beta },
    models: [] };
  for (const s of sets) file.models.push(T.train(items, questions, s));

  const reranked = wanted.rerank && await rerankQuestions(args.rerankUrl, items, file, questions, log);
  if (reranked) for (const s of sets.map((x) => [...x, 'rerank'])) file.models.push(T.train(items, questions, s));
  // recorded with what really worked: a failed embeddings call or reranker makes the next run try again
  file.dataHash = dataHash(args.catalogDir, files, questions, { semantic, rerank: reranked, beta: args.beta });

  for (const m of file.models) {
    m.inSample = T.summarise(T.evaluate(items, m, questions));
    if (args.report) {
      m.crossValidated = T.summarise(T.crossValidate(items, questions, m.signals, 10));
      const notParaphrase = questions.filter((q) => q.set !== 'paraphrase_questions');
      const paraphrase = questions.filter((q) => q.set === 'paraphrase_questions');
      m.paraphrasesUnseen = T.summarise(T.evaluate(items, T.train(items, notParaphrase, m.signals), paraphrase));
    }
  }
  fs.writeFileSync(args.out, JSON.stringify(file, null, 2) + '\n');
  if (!args.quiet || args.report) {
    for (const m of file.models) {
      log(`\nmodel ${m.signals.join('+')}: L2 ${m.l2}, select ≥ ${m.thresholds.select}, domains within ${m.thresholds.domainRatio} × best (at most ${m.thresholds.maxDomains}), join path ≥ ${m.thresholds.joinPath}, confident ≥ ${m.thresholds.confident}`);
      log('  weights (log-odds per standard deviation): ' + m.features.map((f, j) => `${f} ${m.weights[j].toFixed(2)}`).join(', '));
      printSummary('  in sample (trained on these questions):', m.inSample, log);
      if (m.crossValidated) printSummary('  cross-validated (each question unseen):', m.crossValidated, log);
      if (m.paraphrasesUnseen) printSummary('  paraphrases, model trained without any paraphrase:', m.paraphrasesUnseen, log);
    }
  }
  log(`${path.basename(args.out)}: wrote ${file.models.length} model(s) - ${file.models.map((m) => m.signals.join('+')).join(', ')}`);
  return { status: 'trained', file };
}

if (require.main === module) {
  run(parseArgs(process.argv.slice(2))).catch((e) => { console.error('train-retrieval failed:', e.message); process.exit(1); });
}

module.exports = { run, parseArgs, loadQuestions, loadItems };
