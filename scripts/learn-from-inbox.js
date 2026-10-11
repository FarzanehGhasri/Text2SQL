#!/usr/bin/env node
// Learns from the answers a reviewer ticked in Obsidian - nobody has to write SQL.
//
// n8n writes a note into obsidian/Inbox/n8n for every question a member of IT - Data / IT - Security got
// an answer to ("answered question", with a ✅ correct / ❌ wrong checkbox). Tick one box, then run:
//
//   node scripts/learn-from-inbox.js            (or: docker compose run --rm indexer node scripts/learn-from-inbox.js)
//   node scripts/learn-from-inbox.js --dry-run  (only show what would happen)
//
// For every note ticked ✅ correct:
//   - the question and the SQL the model wrote become a verified example in catalog/query_bank.json
//     (similar questions get it as a few-shot example from now on);
//   - the question and the exact query that produced the approved answer become a "confirmed" question in
//     benchmark/02/confirmed.json (the benchmark then warns if a later change breaks it);
//   - the note is deleted.
// Notes ticked ❌ wrong stay in the inbox: they say what to fix. Unticked notes are left alone.
// Afterwards it regenerates sql/check_query_bank.sql and the benchmark runner, then says what to commit.

const fs = require('fs');
const path = require('path');
const { loadCatalogs } = require('./lib/catalog-loader');
const { loadQueryBank, exampleEntities } = require('./lib/query-bank');
const { validateCatalogs } = require('./lib/catalog-validator');
const { questionKey } = require('./lib/persian-text');

const ROOT = path.join(__dirname, '..');
const PATHS = {
  inbox: path.join(ROOT, 'obsidian', 'Inbox', 'n8n'),
  catalogDir: path.join(ROOT, 'catalog'),
  confirmed: path.join(ROOT, 'benchmark', '02', 'confirmed.json'),
};
const ROW_CAP_TOP = /^(\s*SELECT\s+)TOP\s+200\s+/i; // the cap Security adds - not part of what the model meant

// { verdict: 'correct' | 'wrong' | 'both' | null, data } for an "answered question" note, else null.
function parseNote(text) {
  if (!/^type: answered-question$/m.test(text)) return null;
  const m = text.match(/%% text2sql ([A-Za-z0-9+/=]+) %%/);
  if (!m) return null;
  let data;
  try { data = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8')); } catch (e) { return null; }
  const ok = /^- \[[xX]\] ✅/m.test(text);
  const wrong = /^- \[[xX]\] ❌/m.test(text);
  return { verdict: ok && wrong ? 'both' : ok ? 'correct' : wrong ? 'wrong' : null, data };
}

// "2026-10-10 142233 answered question.md" -> "20261010_142233"
const stampOf = (file) => (file.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{6})/) || []).slice(1).join('').replace(/^(\d{8})/, '$1_') || String(Date.now());

function learn({ paths = PATHS, dryRun = false, log = console.log } = {}) {
  const result = { learned: [], wrong: [], unticked: 0, skipped: [] };
  if (!fs.existsSync(paths.inbox)) { log('No inbox folder: ' + paths.inbox); return result; }

  const catalogFiles = loadCatalogs(paths.catalogDir);
  const catalogs = catalogFiles.filter((c) => c.data).map((c) => c.data);
  const realName = new Map(catalogs.flatMap((c) => (c.entities || []).map((e) => [e.name.toLowerCase(), e.name])));
  const bankFile = loadQueryBank(paths.catalogDir);
  if (!bankFile || !bankFile.data) throw new Error('catalog/query_bank.json is missing or invalid');
  const bank = bankFile.data;
  const confirmed = fs.existsSync(paths.confirmed)
    ? JSON.parse(fs.readFileSync(paths.confirmed, 'utf8'))
    : { description: '', questions: [] };
  const known = new Set([...bank.examples.map((e) => questionKey(e.q)), ...confirmed.questions.map((q) => questionKey(q.question))]);
  const toDelete = [];

  for (const file of fs.readdirSync(paths.inbox).filter((f) => f.endsWith('.md')).sort()) {
    const note = parseNote(fs.readFileSync(path.join(paths.inbox, file), 'utf8'));
    if (!note) continue;
    if (note.verdict === null) { result.unticked++; continue; }
    if (note.verdict === 'both') { result.skipped.push(`${file}: both boxes ticked`); continue; }
    if (note.verdict === 'wrong') { result.wrong.push(file); continue; }

    const { question, model_sql: modelSql, sql, used = [], domains = [] } = note.data;
    if (!question || !modelSql || !sql) { result.skipped.push(`${file}: the note has no SQL`); continue; }
    const key = questionKey(question);
    if (known.has(key)) { result.skipped.push(`${file}: already learned`); toDelete.push(file); continue; }

    const id = `conf_${stampOf(file)}`;
    const example = { id, q: question, sql: modelSql.replace(ROW_CAP_TOP, '$1'), status: 'verified' };
    // the example must pass the same checks as every other bank example
    const trial = { file: 'query_bank.json', data: Object.assign({}, bank, { examples: [...bank.examples, example] }) };
    const problems = validateCatalogs(catalogFiles, { queryBank: trial }).errors.filter((e) => e.message.includes(id));
    if (problems.length) { result.skipped.push(`${file}: ${problems[0].message}`); continue; }

    const tables = [...new Set([...used, ...exampleEntities(modelSql)].map((n) => realName.get(String(n).toLowerCase())).filter(Boolean))];
    bank.examples.push(example);
    confirmed.questions.push({
      id, domain: domains[0] || 'mixed', category: 'confirmed', difficulty: 'real',
      question, expected_entities: tables, gold_sql: sql, score_on: [],
    });
    known.add(key);
    toDelete.push(file);
    result.learned.push({ file, id, question });
  }

  if (!dryRun && (result.learned.length || toDelete.length)) {
    if (result.learned.length) {
      fs.writeFileSync(bankFile.path, JSON.stringify(bank, null, 2) + '\n');
      fs.writeFileSync(paths.confirmed, JSON.stringify(confirmed, null, 2) + '\n');
    }
    for (const f of toDelete) fs.unlinkSync(path.join(paths.inbox, f));
  }
  return result;
}

// Files generated from the bank and the benchmark questions.
function regenerate() {
  const bankSql = require('./generate-bank-check-sql');
  const { catalogs, bank } = bankSql.load();
  fs.writeFileSync(bankSql.OUT, bankSql.generate(catalogs, bank));
  require('./build-benchmark-questions').write();
  require('./sync-workflow-code').writeAll({ log: () => {} });
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const r = learn({ dryRun });
  for (const l of r.learned) console.log(`✅ learned ${l.id}: ${l.question}`);
  for (const s of r.skipped) console.log(`   skipped ${s}`);
  if (r.wrong.length) console.log(`❌ ${r.wrong.length} note(s) marked wrong stay in obsidian/Inbox/n8n - each says what to fix.`);
  if (r.unticked) console.log(`   ${r.unticked} note(s) not ticked yet.`);
  if (!r.learned.length) { console.log('Nothing new to learn.'); return; }
  if (dryRun) { console.log('(dry run - nothing was changed)'); return; }
  regenerate();
  console.log(`\nAdded ${r.learned.length} verified example(s) and confirmed question(s).`
    + '\nNow commit and push: catalog/query_bank.json, benchmark/02/confirmed.json, sql/check_query_bank.sql, n8n_workflows/'
    + '\n(n8n picks up the new examples by itself; re-import the benchmark workflow only when you run the benchmark).');
}

if (require.main === module) {
  try { main(); } catch (err) { console.error('learn-from-inbox failed:', err.message); process.exit(1); }
}

module.exports = { learn, parseNote };
