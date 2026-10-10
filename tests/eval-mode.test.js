// The benchmark runner needs raw rows / SQL / errors from the main workflow.
// That "eval mode" must switch on only for the header AND an IT - Data member.
const test = require('node:test');
const assert = require('node:assert/strict');
const { runCodeNode } = require('../scripts/lib/n8n-code-runner');

const security = { sql: 'WITH [Fact_Sales] AS (...) SELECT 1', modelSql: 'SELECT 1', understood: 'u', thinking: '', attempt: 2 };
const nodes = (headers, groups) => ({
  Security: security,
  Webhook: { headers, body: { question: 'فروش هر دفتر' } },
  AuthCheck: { groups },
});
const ROWS = [{ Name: 'A', Total: 10 }, { Name: 'B', Total: 5 }];

test('formatter: normal requests still get only { answer }', () => {
  for (const [headers, groups] of [[{}, ['IT - Data']], [{ 'x-eval-mode': 'true' }, ['NLSQL-Full']]]) {
    const { json } = runCodeNode('Code in JavaScript', { inputs: ROWS, nodes: nodes(headers, groups) });
    assert.deepEqual(Object.keys(json), ['answer']);
    assert.match(json.answer, /\| Name \| Total \|/);
  }
});

test('formatter: eval mode returns rows, SQL and the retry flag', () => {
  const { json } = runCodeNode('Code in JavaScript', { inputs: ROWS, nodes: nodes({ 'x-eval-mode': 'true' }, ['IT - Data']) });
  assert.deepEqual(json.rows, ROWS);
  assert.equal(json.sql, security.sql);
  assert.equal(json.modelSql, 'SELECT 1');
  assert.equal(json.retried, true);
  assert.ok(json.answer);
});

test('formatter: an empty item from the SQL node counts as no rows', () => {
  const { json } = runCodeNode('Code in JavaScript', { inputs: [{}], nodes: nodes({ 'x-eval-mode': 'true' }, ['IT - Data']) });
  assert.deepEqual(json.rows, []);
  assert.match(json.answer, /نتیجه‌ای یافت نشد/);
});

test('ErrorFormat: error field only in eval mode, and never before AuthCheck ran', () => {
  const err = { error: { message: '⛔ عملیات مجاز نیست: فقط SELECT.' } };
  let r = runCodeNode('ErrorFormat', { inputs: [err], nodes: nodes({ 'x-eval-mode': 'true' }, ['IT - Data']) }).json;
  assert.equal(r.error, '⛔ عملیات مجاز نیست: فقط SELECT.');
  r = runCodeNode('ErrorFormat', { inputs: [err], nodes: nodes({}, ['IT - Data']) }).json;
  assert.deepEqual(Object.keys(r), ['answer']);
  // LDAP failed: no AuthCheck output - eval mode must stay off
  r = runCodeNode('ErrorFormat', { inputs: [err], nodes: { Webhook: { headers: { 'x-eval-mode': 'true' } } } }).json;
  assert.deepEqual(Object.keys(r), ['answer']);
});

test('eval responses carry the tables BuildPrompt selected (for retrieval_miss scoring)', () => {
  const n = { ...nodes({ 'x-eval-mode': 'true' }, ['IT - Data']), BuildPrompt: { selectedEntities: ['Fact_Sales', 'Dim_SalesOffice'] } };
  let r = runCodeNode('Code in JavaScript', { inputs: ROWS, nodes: n }).json;
  assert.deepEqual(r.selectedEntities, ['Fact_Sales', 'Dim_SalesOffice']);
  r = runCodeNode('ErrorFormat', { inputs: [{ error: { message: 'boom' } }], nodes: n }).json;
  assert.deepEqual(r.selectedEntities, ['Fact_Sales', 'Dim_SalesOffice']);
  // BuildPrompt never ran (e.g. LDAP error): an empty list, not a crash
  r = runCodeNode('ErrorFormat', { inputs: [{ error: { message: 'boom' } }], nodes: nodes({ 'x-eval-mode': 'true' }, ['IT - Data']) }).json;
  assert.deepEqual(r.selectedEntities, []);
});

// ---------- Obsidian note for a failed question (writes into obsidian/Inbox/n8n) ----------
test('Obsidian note: one Markdown file per failed question, with no user identity', () => {
  const n = {
    Webhook: { headers: {}, body: { question: 'فروش  هر دفتر\nفروش', email: 'ali@corp.ir', username: 'ali' } },
    AuthCheck: { groups: ['NLSQL-Full'], email: 'ali@corp.ir', username: 'ali' },
    BuildPrompt: { selectedEntities: ['Fact_Sales'], retrieval: { activeDomains: ['sales'], lowConfidence: false,
      scores: [{ entity: 'Fact_Sales', score: 4 }] } },
  };
  const { result } = runCodeNode('Obsidian note', { inputs: [{ answer: '⛔ این سوال قابل پاسخ نیست.\nجزئیات' }], nodes: n });
  const { json, binary } = result[0];
  assert.match(json.path, /^\/home\/node\/\.n8n-files\/obsidian-inbox\/\d{4}-\d{2}-\d{2} \d{6} failed question\.md$/);
  const md = Buffer.from(binary.data.data, 'base64').toString('utf8');
  assert.match(md, /^---\ntype: failed-question\nstatus: open\n/);
  assert.match(md, /# فروش هر دفتر فروش\n/);
  assert.match(md, /\*\*Answer sent:\*\* ⛔ این سوال قابل پاسخ نیست\.\n/);
  assert.match(md, /- \[\[Fact_Sales\]\]/);
  assert.ok(!/ali/.test(md), 'no username or email in the note');
});

test('Obsidian note: benchmark runs (eval mode) and errors before BuildPrompt', () => {
  assert.deepEqual(runCodeNode('Obsidian note', { inputs: [{ answer: 'x', error: 'x' }], nodes: {} }).result, []);
  const { result } = runCodeNode('Obsidian note', { inputs: [{ answer: '⛔ کاربر در دایرکتوری یافت نشد' }], nodes: {} });
  assert.match(Buffer.from(result[0].binary.data.data, 'base64').toString('utf8'), /# \(no question\)[\s\S]*- \(none\)/);
});
