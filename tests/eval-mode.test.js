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
    const { json } = runCodeNode('Format Answer', { inputs: ROWS, nodes: nodes(headers, groups) });
    assert.deepEqual(Object.keys(json), ['answer']);
    assert.match(json.answer, /\| Name \| Total \|/);
  }
});

test('formatter: eval mode returns rows, SQL and the retry flag', () => {
  const { json } = runCodeNode('Format Answer', { inputs: ROWS, nodes: nodes({ 'x-eval-mode': 'true' }, ['IT - Data']) });
  assert.deepEqual(json.rows, ROWS);
  assert.equal(json.sql, security.sql);
  assert.equal(json.modelSql, 'SELECT 1');
  assert.equal(json.retried, true);
  assert.ok(json.answer);
});

test('formatter: an empty item from the SQL node counts as no rows', () => {
  const { json } = runCodeNode('Format Answer', { inputs: [{}], nodes: nodes({ 'x-eval-mode': 'true' }, ['IT - Data']) });
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
  let r = runCodeNode('Format Answer', { inputs: ROWS, nodes: n }).json;
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

// ---------- error details only for the IT groups; tables that cannot break; the 200-row cap is visible ----------
test('ErrorFormat: technical details only for IT groups, a generic message for everyone else', () => {
  const sqlErr = [{ error: { message: "Invalid column name 'Foo'." } }];
  const as = (groups) => runCodeNode('ErrorFormat', { inputs: sqlErr, nodes: nodes({}, groups) }).json.answer;
  assert.match(as(['IT - Data']), /Invalid column name 'Foo'/);
  assert.match(as(['IT - Security']), /Invalid column name 'Foo'/);
  assert.doesNotMatch(as(['NLSQL-sales']), /Foo/);
  assert.match(as(['NLSQL-sales']), /^⛔ در پردازش درخواست شما خطایی رخ داد/);
  // messages written for users (⛔ ...) are always shown as they are
  const denied = runCodeNode('ErrorFormat', { inputs: [{ error: { message: '⛔ شما دسترسی ندارید.' } }], nodes: nodes({}, ['NLSQL-sales']) }).json;
  assert.equal(denied.answer, '⛔ شما دسترسی ندارید.');
});

test('Format Answer: | and line breaks cannot break the table; a capped result says so', () => {
  const tricky = [{ 'نام|ستون': 'الف|ب', Total: 1 }, { 'نام|ستون': 'خط\nدوم', Total: 2 }];
  const { json } = runCodeNode('Format Answer', { inputs: tricky, nodes: nodes({}, ['NLSQL-sales']) });
  assert.match(json.answer, /\| نام\\\|ستون \| Total \|/);
  assert.match(json.answer, /\| الف\\\|ب \| 1 \|/);
  assert.match(json.answer, /\| خط دوم \| 2 \|/);
  const many = Array.from({ length: 200 }, (_, i) => ({ Name: `n${i}`, Total: i }));
  const capped = runCodeNode('Format Answer', { inputs: many, nodes: nodes({}, ['NLSQL-sales']) }).json.answer;
  assert.match(capped, /به 200 ردیف محدود شده/);
});

test('AuthCheck: group names come from memberOf; unknown or ambiguous users are refused', () => {
  const wh = { Webhook: { body: { email: ' Ali@Corp.IR ', username: 'ali' } } };
  const { json } = runCodeNode('AuthCheck', {
    inputs: [{ sAMAccountName: 'a.ahmadi', memberOf: ['CN=IT - Security,OU=Groups,DC=alborz,DC=local', 'CN=NLSQL-sales,OU=G,DC=x'] }],
    nodes: wh,
  });
  assert.deepEqual(json, { username: 'a.ahmadi', email: 'ali@corp.ir', groups: ['IT - Security', 'NLSQL-sales'] });
  assert.throws(() => runCodeNode('AuthCheck', { inputs: [{}], nodes: wh }), /یافت نشد/);
  assert.throws(() => runCodeNode('AuthCheck', { inputs: [{ cn: 'a' }, { cn: 'b' }], nodes: wh }), /چند رکورد/);
  assert.throws(() => runCodeNode('AuthCheck', { inputs: [{ cn: 'a' }], nodes: { Webhook: { body: {} } } }), /ایمیل/);
});
