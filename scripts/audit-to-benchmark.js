#!/usr/bin/env node
// Turns real questions from the NLSQL_AuditLog table into benchmark candidates.
// The 44 hand-written benchmark questions use catalog wording; real users do
// not. A benchmark that looks like real traffic is the only way to know whether
// a change actually helps (Step 0 of the accuracy plan).
//
// 1. In SSMS, run on the audit database and save the result as CSV
//    (Tools > Options > Query Results > SQL Server > Results to Grid >
//    "Quote strings containing list separators when saving .csv results" ON),
//    or export it as a JSON array of objects:
//      SELECT id, created_at, question, generated_sql, understood_query, attempt, status, row_count
//      FROM [dbo].[NLSQL_AuditLog] ORDER BY id;
// 2. node scripts/audit-to-benchmark.js --input audit.csv
//      [--out benchmark/02/candidates.local.json] [--min-count 1]
// 3. Open the output, pick representative questions, check/correct draft_sql
//    against the physical tables in SSMS, and add them to benchmark/02/questions.json
//    with a category, expected_entities, gold_sql and score_on.
//
// The output holds real users' questions, so it is written to a *.local.json
// file that .gitignore keeps out of the repository. Usernames are never copied.
// Questions already in any benchmark file are skipped; repeats are merged and
// counted, most frequent first.

const fs = require('fs');
const path = require('path');
const { questionKey } = require('./lib/persian-text');
const { parseCsv } = require('./lib/csv');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const args = {
    input: null,
    out: path.join(ROOT, 'benchmark', '02', 'candidates.local.json'),
    benchmarkDir: path.join(ROOT, 'benchmark', '02'),
    minCount: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--benchmark-dir') args.benchmarkDir = argv[++i];
    else if (a === '--min-count') args.minCount = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/audit-to-benchmark.js --input <audit.csv|audit.json> [--out <file>] [--min-count <n>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.input) throw new Error('--input is required (CSV or JSON export of NLSQL_AuditLog)');
  return args;
}

function readAuditRows(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.json$/i.test(file)) {
    const data = JSON.parse(text.replace(/^﻿/, ''));
    const rows = Array.isArray(data) ? data : data.rows || [];
    return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v])));
  }
  return parseCsv(text);
}

function benchmarkKeys(dir) {
  const keys = new Set();
  if (!fs.existsSync(dir)) return keys;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.endsWith('.local.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const q of data.questions || []) keys.add(questionKey(q.question));
  }
  return keys;
}

// [{ id, question, seen, first_seen, last_seen, draft_sql, understood, retried, row_count, needs_review }]
function buildCandidates(rows, existing, { minCount = 1 } = {}) {
  const byKey = new Map();
  for (const r of rows) {
    const question = String(r.question || '').trim();
    const key = questionKey(question);
    if (!key || existing.has(key)) continue;
    const when = String(r.created_at || '');
    const c = byKey.get(key) || {
      question, seen: 0, first_seen: when, last_seen: when,
      draft_sql: '', understood: '', retried: false, row_count: null,
    };
    c.seen++;
    if (when && (!c.first_seen || when < c.first_seen)) c.first_seen = when;
    if (when && when >= c.last_seen) {
      // the latest answer is the most interesting draft (catalog/prompt improved since)
      c.last_seen = when;
      c.draft_sql = String(r.generated_sql || '');
      c.understood = String(r.understood_query || '');
      c.retried = Number(r.attempt) === 2;
      c.row_count = r.row_count === '' || r.row_count == null ? null : Number(r.row_count);
    }
    byKey.set(key, c);
  }
  return [...byKey.values()]
    .filter((c) => c.seen >= minCount)
    .sort((a, b) => b.seen - a.seen || a.question.localeCompare(b.question))
    .map((c, i) => Object.assign({ id: `cand_${String(i + 1).padStart(3, '0')}` }, c, { needs_review: true }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = readAuditRows(args.input);
  const candidates = buildCandidates(rows, benchmarkKeys(args.benchmarkDir), { minCount: args.minCount });
  const out = {
    description: 'Benchmark candidates mined from NLSQL_AuditLog by scripts/audit-to-benchmark.js. '
      + 'draft_sql is what the system answered (entity names, CTE-wrapped) - NOT a gold answer. '
      + 'Review, write gold_sql on the physical tables, then copy chosen questions into questions.json. '
      + 'Holds real users\' questions: never commit this file.',
    generatedAt: new Date().toISOString(),
    sourceRows: rows.length,
    candidates,
  };
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(out, null, 2) + '\n');
  console.log(`${rows.length} audit rows -> ${candidates.length} new distinct questions -> ${path.relative(ROOT, args.out)}`);
}

if (require.main === module) {
  try { main(); } catch (err) { console.error('audit-to-benchmark failed:', err.message); process.exit(1); }
}

module.exports = { buildCandidates, benchmarkKeys };
