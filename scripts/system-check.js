#!/usr/bin/env node
// The system checks itself and writes the result, in plain words, into Obsidian:
// obsidian/Inbox/System check.md. Runs by itself in the indexer-watch container (docker-compose.yml);
// no Qwen, no database, nothing to type.
//
// What it checks:
//   0. the catalog notes in obsidian/Catalog can be read (otherwise the model keeps the last good catalog);
//   1. the catalogs are valid (a broken catalog file makes n8n fail on EVERY question);
//   2. the right tables are found for the benchmark questions - with the real embeddings when the
//      embeddings service answers, otherwise keyword-only (and it says so);
//   3. "not answerable" questions are recognised as such.
// For each question whose table was not found it says which table and what to add.
//
// It only runs again when something changed (catalogs, embeddings, value index, Find Tables code,
// benchmark questions, the embeddings service going up or down) or the report is older than a day.
//
// Usage: node scripts/system-check.js [--embed-url <bge-m3 address, default EMBED_URL>] [--force] [--quiet]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadCatalogs } = require('./lib/catalog-loader');
const { loadQueryBank } = require('./lib/query-bank');
const { validateCatalogs } = require('./lib/catalog-validator');
const { createEmbedClient } = require('./lib/embed-client');
const { evaluate, summarize, loadExtras, loadSidecars } = require('./benchmark-retrieval');
const notesImport = require('./obsidian-to-catalog');

const ROOT = path.join(__dirname, '..');
const PATHS = {
  catalogDir: path.join(ROOT, 'catalog'),
  notesDir: path.join(ROOT, 'obsidian', 'Catalog'),
  benchmarkDir: path.join(ROOT, 'benchmark', '02'),
  code: path.join(ROOT, 'catalog-service', 'text2sql', 'find-tables.js'),
  report: path.join(ROOT, 'obsidian', 'Inbox', 'System check.md'),
};
const SETS = [
  ['questions.json', 'Questions in catalog wording'],
  ['paraphrase_questions.json', 'Reworded questions (as real users ask)'],
  ['join_path_questions.json', 'Questions that need a linking table'],
  ['confirmed.json', 'Answers you approved in Obsidian'],
];
const DAY = 24 * 3600 * 1000;

function parseArgs(argv) {
  const a = { embedUrl: process.env.EMBED_URL || null, force: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--embed-url') a.embedUrl = argv[++i];
    else if (argv[i] === '--force') a.force = true;
    else if (argv[i] === '--quiet') a.quiet = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return a;
}

// Hash of everything the result depends on.
function fingerprint(paths, mode = '') {
  const h = crypto.createHash('sha256').update(mode);
  const files = [
    ...fs.readdirSync(paths.catalogDir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(paths.catalogDir, f)),
    ...SETS.map(([f]) => path.join(paths.benchmarkDir, f)),
    paths.code,
  ];
  if (paths.notesDir) {
    for (const [f, text] of Object.entries(notesImport.readNotes(paths.notesDir)).sort()) h.update(f).update(text);
  }
  for (const f of files) if (fs.existsSync(f)) h.update(f).update(fs.readFileSync(f));
  return h.digest('hex').slice(0, 16);
}

function upToDate(paths, fp) {
  if (!fs.existsSync(paths.report)) return false;
  const text = fs.readFileSync(paths.report, 'utf8');
  return text.includes(`fingerprint: ${fp}`) && Date.now() - fs.statSync(paths.report).mtimeMs < DAY;
}

async function makeEmbed(url, catalogDir) {
  if (!url) return { embed: null, note: 'off (no --embed-url)' };
  if (!loadSidecars(catalogDir).length) return { embed: null, note: 'off - no *.embeddings.json yet (the indexer builds them)' };
  try {
    const client = createEmbedClient(url, { batchSize: 1 });
    await client.embedMany(['test']);
    return { embed: async (t) => (await client.embedMany([t]))[0], note: 'on (bge-m3)' };
  } catch (e) {
    return { embed: null, note: `off - the embeddings service did not answer (${e.message.slice(0, 80)})` };
  }
}

// embedding = makeEmbed()'s result; keyword-only when omitted.
async function check(paths = PATHS, embedding = { embed: null, note: 'off' }) {
  const files = loadCatalogs(paths.catalogDir);
  const { errors } = validateCatalogs(files, { queryBank: loadQueryBank(paths.catalogDir) });
  const catalogs = files.filter((c) => c.data).map((c) => c.data);
  const { embed, note } = embedding;
  const noteErrors = paths.notesDir ? notesImport.build(paths).errors : [];
  const sidecars = embed ? loadSidecars(paths.catalogDir) : [];
  const extras = loadExtras(paths.catalogDir);
  const sets = [];
  for (const [file, label] of SETS) {
    const f = path.join(paths.benchmarkDir, file);
    if (!fs.existsSync(f)) continue;
    const questions = JSON.parse(fs.readFileSync(f, 'utf8')).questions || [];
    if (!questions.length) continue;
    const results = await evaluate(questions, catalogs, sidecars, embed, extras);
    sets.push({ file, label, questions, results, summary: summarize(results) });
  }
  const modelFile = path.join(paths.catalogDir, 'retrieval-model.json');
  const model = fs.existsSync(modelFile) ? JSON.parse(fs.readFileSync(modelFile, 'utf8'))
    : Object.assign({ baseline: true }, require('../catalog-service/text2sql/baseline-model.json'));
  return { noteErrors, errors, embedding: note, sets, model };
}

// one line per learned model: which signals, how many questions it learned from, its thresholds
function modelLines(file) {
  if (!file) return [];
  const where = file.baseline ? 'the keyword-only baseline that comes with the code - the server model is not trained yet'
    : 'trained on this server';
  return [`Table-choice model: ${where}. Learned from ${file.trainedOn.labelled} labelled and ${file.trainedOn.notAnswerable} `
    + 'not-answerable questions (`scripts/train-retrieval.js`, retrained by itself when they or the catalog change):',
    ...file.models.map((m) => `- ${m.signals.join(' + ')}: a table is sent when its probability is ≥ ${m.thresholds.select}; `
      + `"probably not answerable" below ${m.thresholds.confident}`)];
}

function render(r, fp, now = new Date()) {
  const lines = [
    '---', 'type: system-check', `date: ${now.toISOString().slice(0, 16).replace('T', ' ')}`, `fingerprint: ${fp}`, '---',
    '# System check', '',
    '> Written by itself (indexer-watch container, `scripts/system-check.js`) - no Qwen, no database.',
    '> It checks that the right tables reach the model. A ✅ here does not prove the SQL is right;',
    '> that is what your ✅ / ❌ on answered questions is for.', '',
  ];
  if ((r.noteErrors || []).length) {
    lines.push('## ⛔ Catalog notes with a mistake - your last edit has NOT reached the model yet', '',
      'The model keeps using the last good version until these are fixed (then it updates within a minute).', '');
    for (const e of r.noteErrors.slice(0, 30)) lines.push(`- [[${e.note.replace(/\.md$/, '').split('/').pop()}]]: ${e.message}`);
    lines.push('');
  }
  if (r.errors.length) {
    lines.push('## ⛔ Catalog errors - n8n may fail on every question until these are fixed', '');
    for (const e of r.errors.slice(0, 20)) lines.push(`- \`${e.file}\`: ${e.message}`);
    lines.push('', 'Fix them, then run `node scripts/validate-catalogs.js` until it says `0 errors`.', '');
  }
  lines.push('## Finding the right tables', '', `Meaning search (embeddings): ${r.embedding}`, '', ...modelLines(r.model), '');
  for (const s of r.sets) {
    const ok = s.summary.passed === s.summary.checked;
    lines.push(`- ${ok ? '✅' : '⚠️'} ${s.label}: **${s.summary.passed} of ${s.summary.checked}**`);
  }
  const ns = r.sets.flatMap((s) => s.results).filter((x) => x.category === 'not_supported');
  if (ns.length) {
    const flagged = ns.filter((x) => x.lowConfidence).length;
    lines.push(`- ${flagged === ns.length ? '✅' : '⚠️'} "Not answerable" questions recognised: **${flagged} of ${ns.length}**`);
  }
  const misses = r.sets.flatMap((s) => s.results.filter((x) => x.checked && !x.pass)
    .map((x) => ({ x, q: s.questions.find((q) => q.id === x.id) })));
  if (misses.length) {
    lines.push('', '## Questions whose table was not found', '',
      'For each: open the table note and add a word the question uses to its `synonyms` - or tick ✅ on more answered',
      'questions: every approved answer becomes training data for the table-choice model.', '');
    for (const { x, q } of misses.slice(0, 30)) {
      const what = x.error ? `error: ${x.error}` : `needs ${x.missing.map((n) => `[[${n}]]`).join(', ')}`;
      lines.push(`- «${q ? q.question : x.id}» - ${what}`);
    }
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const embedding = await makeEmbed(args.embedUrl, PATHS.catalogDir);
  const fp = fingerprint(PATHS, embedding.embed ? 'embeddings on' : 'embeddings off');
  if (!args.force && upToDate(PATHS, fp)) { if (!args.quiet) console.log('System check: nothing changed.'); return; }
  const r = await check(PATHS, embedding);
  fs.mkdirSync(path.dirname(PATHS.report), { recursive: true });
  fs.writeFileSync(PATHS.report, render(r, fp));
  console.log(`System check written to ${path.relative(ROOT, PATHS.report)}: `
    + r.sets.map((s) => `${s.summary.passed}/${s.summary.checked}`).join(', ')
    + (r.errors.length ? ` - ${r.errors.length} CATALOG ERRORS` : '')
    + (r.noteErrors.length ? ` - ${r.noteErrors.length} NOTE MISTAKES` : ''));
}

if (require.main === module) {
  main().catch((err) => { console.error('System check failed:', err.message); process.exit(1); });
}

module.exports = { check, render, fingerprint, upToDate };
