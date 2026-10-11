// The review loop: n8n writes a note per answered question, a reviewer ticks ✅ / ❌, learn-from-inbox.js
// turns ✅ into a verified query-bank example and a confirmed benchmark question. Nobody writes SQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runCodeNode, runBuildPrompt, runAuthCheck } = require('../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { learn, parseNote } = require('../scripts/learn-from-inbox');

const ROOT = path.join(__dirname, '..');
const CATALOGS = loadCatalogs(path.join(ROOT, 'catalog')).map((c) => c.data);

// A real answered note, produced by the workflow's own nodes.
function answeredNote({ question, groups = ['IT - Data'], modelSql }) {
  const bp = runBuildPrompt({ inputs: CATALOGS, nodes: { 'Embed Question': {}, AuthCheck: { groups }, Webhook: { body: { question } } } }).json;
  const sec = runCodeNode('Security', { inputs: [{ response: `UNDERSTOOD: test\nSQL:\n${modelSql}` }], nodes: { BuildPrompt: bp } }).json;
  const nodes = { Webhook: { body: { question } }, AuthCheck: runAuthCheck(groups), BuildPrompt: bp, Security: sec, 'Format Answer': { answer: 'x' } };
  const { result } = runCodeNode('Obsidian note', { inputs: [{ answer: '<think>plan</think>\n| a |\n| --- |\n| 1 |' }], nodes });
  return result.length ? { name: result[0].binary.data.fileName, text: Buffer.from(result[0].binary.data.data, 'base64').toString('utf8') } : null;
}

const SQL = 'SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) AS [Net] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name]';

test('an answered question becomes a review note only for reviewers; benchmark runs never write one', () => {
  const note = answeredNote({ question: 'فروش خالص به تفکیک دفتر فروش در این ماه', modelSql: SQL });
  assert.match(note.name, /answered question\.md$/);
  assert.match(note.text, /^type: answered-question$/m);
  assert.match(note.text, /^- \[ \] ✅ correct$/m);
  assert.match(note.text, /^- \[ \] ❌ wrong$/m);
  assert.ok(!/<think>/.test(note.text));
  assert.match(note.text, /\[\[Fact_Sales\]\] - /);          // with the reason it was chosen
  const parsed = parseNote(note.text);
  assert.equal(parsed.verdict, null);
  assert.match(parsed.data.sql, /^WITH \[Fact_Sales\] AS/);   // the exact query that ran
  assert.equal(answeredNote({ question: 'فروش خالص', groups: ['NLSQL-sales'], modelSql: SQL }), null);
  assert.deepEqual(runCodeNode('Obsidian note', { inputs: [{ answer: 'x', rows: [] }], nodes: {} }).result, []);
});

test('✅ becomes a verified example and a confirmed question; ❌, unticked and contradictory notes stay', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'learn-'));
  const catalogDir = path.join(tmp, 'catalog');
  const inbox = path.join(tmp, 'inbox');
  fs.mkdirSync(catalogDir); fs.mkdirSync(inbox);
  for (const f of fs.readdirSync(path.join(ROOT, 'catalog')).filter((x) => x.endsWith('.json') && !x.includes('embeddings'))) {
    fs.copyFileSync(path.join(ROOT, 'catalog', f), path.join(catalogDir, f));
  }
  const confirmedPath = path.join(tmp, 'confirmed.json');
  fs.writeFileSync(confirmedPath, JSON.stringify({ questions: [] }));
  const write = (name, text) => fs.writeFileSync(path.join(inbox, name), text);
  const base = answeredNote({ question: 'فروش خالص به تفکیک دفتر فروش در این ماه', modelSql: SQL }).text;
  write('2026-10-11 101500 answered question.md', base.replace('- [ ] ✅ correct', '- [x] ✅ correct'));
  write('2026-10-11 101600 answered question.md',
    answeredNote({ question: 'فروش خالص هر دفتر فروش در سال گذشته', modelSql: SQL }).text.replace('- [ ] ❌ wrong', '- [x] ❌ wrong'));
  write('2026-10-11 101700 answered question.md', answeredNote({ question: 'جمع فروش خالص دفترهای فروش', modelSql: SQL }).text);
  write('2026-10-11 101800 answered question.md', answeredNote({ question: 'فروش خالص دفتر فروش تهران', modelSql: SQL }).text
    .replace('- [ ] ✅ correct', '- [x] ✅ correct').replace('- [ ] ❌ wrong', '- [x] ❌ wrong'));
  write('2026-10-11 101900 failed question.md', '---\ntype: failed-question\n---\n# x\n');

  const r = learn({ paths: { inbox, catalogDir, confirmed: confirmedPath }, log: () => {} });
  assert.deepEqual(r.learned.map((l) => l.id), ['conf_20261011_101500']);
  assert.equal(r.wrong.length, 1);
  assert.equal(r.unticked, 1);
  assert.equal(r.skipped.length, 1);

  const bank = JSON.parse(fs.readFileSync(path.join(catalogDir, 'query_bank.json'), 'utf8'));
  const ex = bank.examples.find((e) => e.id === 'conf_20261011_101500');
  assert.equal(ex.status, 'verified');
  assert.ok(ex.sql.startsWith('SELECT [Dim_SalesOffice]'), 'the TOP 200 cap Security adds is removed');
  const conf = JSON.parse(fs.readFileSync(confirmedPath, 'utf8')).questions[0];
  assert.equal(conf.category, 'confirmed');
  assert.match(conf.gold_sql, /^WITH \[Fact_Sales\] AS \(SELECT .* FROM \[dbo\]\.\[Fact_Sales\]\)/);
  assert.deepEqual(conf.expected_entities.sort(), ['Dim_SalesOffice', 'Fact_Sales']);
  assert.deepEqual(conf.score_on, []);

  const left = fs.readdirSync(inbox).sort();
  assert.ok(!left.includes('2026-10-11 101500 answered question.md'), 'a learned note is removed');
  assert.equal(left.length, 4);

  // running again learns nothing new
  assert.equal(learn({ paths: { inbox, catalogDir, confirmed: confirmedPath }, log: () => {} }).learned.length, 0);
});
