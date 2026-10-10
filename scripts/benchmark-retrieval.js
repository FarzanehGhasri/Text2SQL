#!/usr/bin/env node
// Offline retrieval benchmark: runs the real BuildPrompt node code (from
// n8n_workflows/code/) for every benchmark question and checks whether the
// tables the question needs actually reach the prompt - no LLM, no database.
// Retrieval is the first thing that can go wrong: if the right table is not in
// the prompt, no model can write the right SQL.
//
// Usage (from the repo root):
//   node scripts/benchmark-retrieval.js
//       keyword scoring only (no embeddings service needed)
//   node scripts/benchmark-retrieval.js --embed-url http://localhost:8080/embed
//       also semantic scoring, exactly as in production: embeds each question and
//       uses the catalog/*.embeddings.json sidecars built by the indexer
//   ... --questions benchmark/02/questions.json --json --min-recall 0.9
//
// Per question it reports: expected entities missing from the prompt, entities
// from domains the question's user may not see (allowed_domains), active
// domains and prompt size. Exit code 1 when mean recall is below --min-recall.

const fs = require('fs');
const path = require('path');
const { loadCatalogs, SIDECAR_SUFFIX } = require('./lib/catalog-loader');
const { loadQueryBank } = require('./lib/query-bank');
const { runCodeNode } = require('./lib/n8n-code-runner');
const { createEmbedClient } = require('./lib/embed-client');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const args = {
    questions: path.join(ROOT, 'benchmark', '02', 'questions.json'),
    catalogDir: path.join(ROOT, 'catalog'),
    embedUrl: null,
    json: false,
    minRecall: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--questions') args.questions = argv[++i];
    else if (a === '--catalog-dir') args.catalogDir = argv[++i];
    else if (a === '--embed-url') args.embedUrl = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--min-recall') args.minRecall = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/benchmark-retrieval.js [--questions <file>] [--catalog-dir <dir>] [--embed-url <url>] [--json] [--min-recall <0..1>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

// Everything else n8n's ReadCatalog hands to BuildPrompt besides the catalogs:
// the query bank (examples) and, when it has been built, catalog/values.json.
function loadExtras(catalogDir) {
  const bank = loadQueryBank(catalogDir);
  const out = bank && bank.data ? [bank.data] : [];
  const values = path.join(catalogDir, 'values.json');
  if (fs.existsSync(values)) out.push(JSON.parse(fs.readFileSync(values, 'utf8')));
  return out;
}

function loadSidecars(catalogDir) {
  return fs.readdirSync(catalogDir)
    .filter((f) => f.endsWith(SIDECAR_SUFFIX))
    .map((f) => JSON.parse(fs.readFileSync(path.join(catalogDir, f), 'utf8')));
}

// Entity name -> domain, used to detect entities leaking from other domains.
function domainIndex(catalogs) {
  const map = new Map();
  for (const c of catalogs) for (const e of c.entities || []) map.set(e.name, c.shared ? '(shared)' : c.domain);
  return map;
}

function isRetrievalQuestion(q) {
  return (q.expected_entities && q.expected_entities.length > 0) || Array.isArray(q.allowed_domains);
}

// Returns one result per question. `embed(text)` -> vector | null.
async function evaluate(questions, catalogs, sidecars, embed, extras = []) {
  const domainOf = domainIndex(catalogs);
  const results = [];
  for (const q of questions) {
    const groups = q.run_as_groups || ['NLSQL-Full'];
    const vector = embed ? await embed(q.question) : null;
    const r = { id: q.id, domain: q.domain, category: q.category, groups, checked: isRetrievalQuestion(q) };
    try {
      const { json } = runCodeNode('BuildPrompt', {
        inputs: [...catalogs, ...extras, ...sidecars],
        nodes: {
          'Embed Question': vector ? [vector] : {},
          AuthCheck: { groups, email: 'benchmark@local' },
          Webhook: { body: { question: q.question } },
        },
      });
      const selected = new Set(json.selectedEntities);
      const expected = q.expected_entities || [];
      r.missing = expected.filter((n) => !selected.has(n));
      r.recall = expected.length ? (expected.length - r.missing.length) / expected.length : null;
      r.leaked = Array.isArray(q.allowed_domains)
        ? json.selectedEntities.filter((n) => !q.allowed_domains.includes(domainOf.get(n)))
        : [];
      r.pass = r.missing.length === 0 && r.leaked.length === 0;
      r.activeDomains = json.retrieval.activeDomains;
      r.lowConfidence = json.retrieval.lowConfidence;
      r.semanticUsed = json.retrieval.semanticUsed;
      r.promptChars = json.promptChars;
      r.selected = json.selectedEntities.length;
      r.examples = json.retrieval.examples.map((e) => e.id);
    } catch (err) {
      // An access-denied error is the right outcome for a user with no domain at all.
      r.error = err.message.split('\n')[0];
      r.missing = q.expected_entities || [];
      r.recall = r.missing.length ? 0 : null;
      r.leaked = [];
      r.pass = r.missing.length === 0;
    }
    results.push(r);
  }
  return results;
}

function summarize(results) {
  const checked = results.filter((r) => r.checked);
  const withRecall = checked.filter((r) => r.recall !== null);
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const byDomain = {};
  for (const r of checked) {
    const d = (byDomain[r.domain] = byDomain[r.domain] || { passed: 0, total: 0 });
    d.total++;
    if (r.pass) d.passed++;
  }
  return {
    checked: checked.length,
    passed: checked.filter((r) => r.pass).length,
    meanRecall: mean(withRecall.map((r) => r.recall)),
    leaks: checked.filter((r) => r.leaked.length).length,
    semanticUsed: results.some((r) => r.semanticUsed),
    byDomain,
  };
}

function printReport(results, summary) {
  for (const r of results.filter((x) => x.checked)) {
    const status = r.pass ? 'PASS' : 'FAIL';
    const extra = [
      r.missing.length ? `missing: ${r.missing.join(', ')}` : '',
      r.leaked.length ? `leaked: ${r.leaked.join(', ')}` : '',
      r.error ? `error: ${r.error}` : '',
    ].filter(Boolean).join(' | ');
    console.log(`${status} ${r.id.padEnd(10)} domains=${(r.activeDomains || []).join(',') || '-'} `
      + `tables=${r.selected ?? '-'} chars=${r.promptChars ?? '-'} examples=${(r.examples || []).join(',') || '-'}`
      + `${extra ? ' | ' + extra : ''}`);
  }
  const lowConf = results.filter((r) => r.category === 'not_supported');
  if (lowConf.length) {
    console.log(`not_supported questions flagged low-confidence: ${lowConf.filter((r) => r.lowConfidence).length}/${lowConf.length}`);
  }
  console.log(`\nRetrieval: ${summary.passed}/${summary.checked} passed, mean recall `
    + `${summary.meanRecall === null ? '-' : summary.meanRecall.toFixed(3)}, questions with leaks: ${summary.leaks}, `
    + `semantic scoring: ${summary.semanticUsed ? 'on' : 'off (keyword only)'}`);
  for (const [d, v] of Object.entries(summary.byDomain)) console.log(`  ${d.padEnd(15)} ${v.passed}/${v.total}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const questions = JSON.parse(fs.readFileSync(args.questions, 'utf8')).questions;
  const catalogs = loadCatalogs(args.catalogDir).filter((c) => c.data).map((c) => c.data);
  const sidecars = args.embedUrl ? loadSidecars(args.catalogDir) : [];
  let embed = null;
  if (args.embedUrl) {
    if (!sidecars.length) throw new Error('No *.embeddings.json in the catalog dir - run the indexer first');
    const client = createEmbedClient(args.embedUrl, { batchSize: 1 });
    embed = async (text) => (await client.embedMany([text]))[0];
  }
  const results = await evaluate(questions, catalogs, sidecars, embed, loadExtras(args.catalogDir));
  const summary = summarize(results);
  if (args.json) console.log(JSON.stringify({ summary, results }, null, 2));
  else printReport(results, summary);
  if (args.minRecall !== null && (summary.meanRecall === null || summary.meanRecall < args.minRecall)) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Benchmark failed:', err.message);
    process.exit(1);
  });
}

module.exports = { evaluate, summarize, loadExtras };
