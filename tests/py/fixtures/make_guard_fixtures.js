// Records the behaviour of the real Security Code node (n8n_workflows/code/Security.js) for a large set of
// inputs, so tests/py/test_guard.py can prove the Python port (text2sql/guard.py) behaves identically.
//
//   node tests/py/fixtures/make_guard_fixtures.js   ->  tests/py/fixtures/guard_cases.json
//
// Each case: { id, group, response (string | object), defs, retry, expect }, where defs names the
// entityDefs object in entitySets (stored once, they are large) and expect is { json, logs } for an
// accepted query or { error } for a rejected one.

const fs = require('fs');
const path = require('path');
const { runCodeNode, runBuildPrompt } = require('../../../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../../../scripts/lib/catalog-loader');

const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'guard_cases.json');

// ---------- entity sets, shaped like BuildPrompt's entityDefs ----------
const CATALOG = Object.fromEntries(loadCatalogs(path.join(ROOT, 'catalog'))
  .flatMap((c) => c.data.entities.map((e) => [e.name, e])));

function fromCatalog(name, maxCols = 5) {
  const e = CATALOG[name];
  return { name: e.name, kind: e.kind || 'table', source: e.source || null, sql: e.sql || null,
           columns: e.columns.slice(0, maxCols).map((c) => ({ name: c.name, alias: c.alias || null })) };
}
const defsOf = (...names) => Object.fromEntries(names.map((n) => [n, fromCatalog(n)]));

const SALES = defsOf('Fact_Sales', 'Dim_Customer', 'Dim_SalesOffice', 'Dim_Product');
const HR = defsOf('Fact_Employee', 'Fact_EmployeePeriodCalculation');
const PRC = { ...defsOf('Fact_Invoice', 'Procurement_Dim_Supplier'),
              PaymentReceiveInfo: fromCatalog('PaymentReceiveInfo', 10) };
const ALIASED = {
  Fact_Sales: { name: 'Fact_Sales', kind: 'table', source: '[dbo].[Fact_Sales]', sql: null,
                columns: [{ name: 'OrderRef', alias: null }, { name: 'Gross Sales', alias: 'GrossSales' },
                          { name: 'مبلغ خالص', alias: 'NetAmount' }, { name: 'X', alias: '' }] },
  Dim_Customer: fromCatalog('Dim_Customer', 3),
};
const VIRTUAL = {
  Fact_Sales: fromCatalog('Fact_Sales', 3),
  V_ActiveSales: { name: 'V_ActiveSales', kind: 'virtual', source: null,
                   sql: 'SELECT [OrderRef], [OrderDate] FROM [dbo].[Fact_Sales] WHERE [OrderItemState_Key] NOT IN (6, 7)',
                   columns: [{ name: 'OrderRef', alias: null }, { name: 'OrderDate', alias: null }] },
};
const BROKEN = {
  V_NoSql: { name: 'V_NoSql', kind: 'virtual', source: null, sql: null, columns: [] },
  T_NoSource: { name: 'T_NoSource', kind: 'table', source: null, sql: null, columns: [{ name: 'a', alias: null }] },
  T_View: { name: 'T_View', kind: 'view', source: '[dbo].[v]', sql: null, columns: [{ name: 'a', alias: null }] },
  T_NullKind: { name: 'T_NullKind', kind: null, source: '[dbo].[NullKind]', sql: null, columns: [{ name: 'a', alias: null }] },
  T_EmptyKind: { name: 'T_EmptyKind', kind: '', source: '[dbo].[EmptyKind]', sql: null, columns: [] },
  T_Key: { name: 'T_RealName', kind: 'table', source: '[dbo].[RealName]', sql: null, columns: [{ name: 'a', alias: null }] },
  V_EmptySql: { name: 'V_EmptySql', kind: 'virtual', source: null, sql: '', columns: [] },
};
const WEIRD = {
  B_Last: { name: 'B_Last', kind: 'table', source: '[dbo].[B]', sql: null, columns: [{ name: 'b', alias: null }] },
  '123': { name: '123', kind: 'table', source: '[dbo].[T123]', sql: null, columns: [{ name: 'n', alias: null }] },
  'Order Details': { name: 'Order Details', kind: 'table', source: '[dbo].[Order Details]', sql: null, columns: [{ name: 'Qty', alias: null }] },
  'a$&b': { name: 'a$&b', kind: 'table', source: '[dbo].[dollar]', sql: null, columns: [{ name: 'x', alias: null }] },
  "a$'b": { name: "a$'b", kind: 'table', source: '[dbo].[dollar2]', sql: null, columns: [{ name: 'x', alias: null }] },
  'a$$b$1': { name: 'a$$b$1', kind: 'table', source: '[dbo].[dollar3]', sql: null, columns: [{ name: 'x', alias: null }] },
  'فروش': { name: 'فروش', kind: 'table', source: '[dbo].[Fact_Sales]', sql: null, columns: [{ name: 'OrderRef', alias: 'شماره' }] },
  'İtem': { name: 'İtem', kind: 'table', source: '[dbo].[Item]', sql: null, columns: [{ name: 'i', alias: null }] },
  'E😀😀😀': { name: 'E😀😀😀', kind: 'table', source: '[dbo].[Emoji]', sql: null, columns: [{ name: 'e', alias: null }] },
  'abcdef': { name: 'abcdef', kind: 'table', source: '[dbo].[abcdef]', sql: null, columns: [{ name: 'e', alias: null }] },
  'dot.ted': { name: 'dot.ted', kind: 'table', source: '[dbo].[dotted]', sql: null, columns: [{ name: 'd', alias: null }] },
};
const SETS = { SALES, HR, PRC, ALIASED, VIRTUAL, BROKEN, WEIRD, EMPTY: {} };

// ---------- running the real node ----------
const cases = [];
const entitySets = {};
function setNameOf(entityDefs) {
  for (const [name, defs] of Object.entries(entitySets)) if (defs === entityDefs) return name;
  const name = Object.keys(SETS).find((k) => SETS[k] === entityDefs) || 'set' + Object.keys(entitySets).length;
  entitySets[name] = entityDefs;
  return name;
}
function add(group, response, entityDefs, retry = false) {
  const nodes = { BuildPrompt: { entityDefs } };
  if (retry) nodes['Build Fix Prompt'] = {};
  let expect;
  try {
    const { json, logs } = runCodeNode('Security', { inputs: [response], nodes });
    expect = { json, logs };
  } catch (err) {
    if (!(err instanceof Error) || !err.message.startsWith('⛔')) throw err;   // only guard rejections
    expect = { error: err.message };
  }
  cases.push({ id: cases.length + 1, group, response, defs: setNameOf(entityDefs), retry, expect });
}
const r = (text) => ({ response: text });     // the shape the LLM node gives Security

// ---------- 1. the cases of tests/security.test.js, with real BuildPrompt entityDefs ----------
const REAL = loadCatalogs(path.join(ROOT, 'catalog')).map((c) => c.data);
const bpCache = {};
function realDefs(question, groups = ['NLSQL-Full']) {
  const key = question + '|' + groups.join(',');
  if (!bpCache[key]) {
    bpCache[key] = runBuildPrompt({
      inputs: REAL, nodes: { 'Embed Question': {}, AuthCheck: { groups }, Webhook: { body: { question } } },
    }).json.entityDefs;
    entitySets['BuildPrompt: ' + question] = bpCache[key];
  }
  return bpCache[key];
}
{
  const prc = realDefs('مجموع مبلغ فاکتور خرید هر تامین کننده', ['NLSQL-procurement']);
  const hr = realDefs('تعداد کارمندان هر واحد', ['NLSQL-hr']);
  const weather = realDefs('پیش بینی آب و هوای فردا');
  const pay = realDefs('شماره درخواست پرداخت و مبلغ درخواستی اطلاعات دریافت پرداخت', ['NLSQL-procurement']);
  const hr2 = realDefs('کارکرد و اضافه کار کارمندان', ['NLSQL-hr']);
  const office = realDefs('فروش خالص هر دفتر فروش');
  const example = REAL.find((c) => c.domain === 'procurement').examples[0];
  const g = 'security.test.js';
  add(g, r(`UNDERSTOOD: total invoices per supplier\nSQL:\n${example.sql}`), prc);
  add(g, r('SQL:\nSELECT * FROM [Fact_Sales]'), hr);
  add(g, r("UNDERSTOOD: weather forecast is not available\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, 'No weather data in the schema' AS Reason"), weather);
  add(g, r("UNDERSTOOD: needs weather data\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status"), weather);
  add(g, r('SQL:\nDELETE FROM [Fact_Employee]'), hr);
  add(g, r('SQL:\nSELECT * FROM [Fact_Employee]; DROP TABLE x'), hr);
  add(g, r('SQL:\nSELECT COUNT(*) FROM [Fact_Employee]'), hr, true);
  add(g, r('SQL:\nSELECT TOP 10\n  [شماره درخواست پرداخت],\n  [مبلغ درخواستی(ریال)]\nFROM [PaymentReceiveInfo]'), pay);
  add(g, r('SQL:\nSELECT TOP 10\n  [Procurement_Dim_Supplier].[FullName] AS [نام تامین کننده],\n  SUM([Fact_Invoice].[NetPrice]) AS [جمع مبلغ]\n'
    + 'FROM [Fact_Invoice]\nINNER JOIN [Procurement_Dim_Supplier] ON [Fact_Invoice].[Supplier_Key] = [Procurement_Dim_Supplier].[Supplier_Key]\n'
    + 'GROUP BY [Procurement_Dim_Supplier].[FullName]'), prc);
  add(g, r("SELECT SUM([NetPrice]) FROM [Fact_Invoice]\nاین کوئری مجموع 'خالص' را حساب می‌کند"), prc);
  add(g, r('SQL:\nSELECT SUM([PRC].[Fact_Invoice].[NetPrice]) FROM [PRC].[Fact_Invoice]'), prc);
  add(g, r('SQL:\nSELECT COUNT(*) FROM [SA_DataWarehouse].[dbo].[Fact_Employee]'), hr);
  add(g, r('SQL:\nSELECT COUNT(*) FROM dbo.Fact_Employee'), hr);
  add(g, r('SQL:\nWITH [Fact_Sales] AS (SELECT 1 AS a) SELECT TOP 5 s.* FROM [Fact_Employee] e INNER JOIN [dbo].[Fact_Sales] s ON 1 = 1'), hr);
  add(g, r('SQL:\nWITH x AS (SELECT [Employee_Key] FROM [Fact_Employee]) SELECT COUNT(*) FROM x'), hr);
  add(g, r('SQL:\nSELECT COUNT(*) FROM dbo.Fact_Employee e INNER JOIN dbo.Fact_EmployeePeriodCalculation p ON p.Employee_Key = e.Employee_Key'), hr2);
  add(g, r([
    'UNDERSTOOD: net sales per sales office', 'PLAN:',
    '- tables: Fact_Sales joined with Dim_SalesOffice on SalesOffice_Key; select the office name',
    '- filters: OrderItemState_Key NOT IN (6, 7)',
    '- result: SUM of EffectiveNetPrice per office, ORDER BY total DESC', 'SQL:',
    'SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) AS [T] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name] ORDER BY [T] DESC',
  ].join('\n')), office);
  add(g, r([
    'UNDERSTOOD: net sales per office', '**PLAN:**', '- tables: join Fact_Sales with Dim_SalesOffice, select name',
    'SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) AS [T]',
    'FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key]',
    'GROUP BY [Dim_SalesOffice].[Name]',
  ].join('\n')), office);
  add(g, r('UNDERSTOOD: x\n**PLAN:**\n- tables: Fact_Sales\n**SQL:**\n```sql\nSELECT SUM([Fact_Sales].[EffectiveNetPrice]) AS [T] FROM [Fact_Sales]\n```'), office);
  add(g, r('UNDERSTOOD: total net sales SQL: SELECT SUM([Fact_Sales].[EffectiveNetPrice]) AS [T] FROM [Fact_Sales]'), office);
  add(g, r("UNDERSTOOD: weather is not available\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, 'no weather data' AS Reason"), weather);
}

// ---------- 2. query bodies x response wrappers ----------
// [entity set, sql]; every body goes through every wrapper below
const BODIES = [
  ['SALES', 'SELECT * FROM [Fact_Sales]'],
  ['SALES', 'SELECT COUNT(*) FROM Fact_Sales'],
  ['SALES', 'select top 10 [OrderRef] from [Fact_Sales] order by [OrderDate] desc'],
  ['SALES', 'SELECT s.[OrderRef], c.[CustomerName]\nFROM [Fact_Sales] s\nINNER JOIN [Dim_Customer] c ON s.[Customer_key] = c.[Customer_key]\nWHERE s.[OrderItemState_Key] NOT IN (6, 7)'],
  ['SALES', 'SELECT [OrderRef] FROM dbo.Fact_Sales'],
  ['SALES', 'SELECT [dbo].[Fact_Sales].[OrderRef] FROM [dbo].[Fact_Sales]'],
  ['SALES', 'SELECT COUNT(*) FROM [SA_DataWarehouse].[dbo].[Fact_Sales] s LEFT JOIN [dbo].[Dim_Customer] c ON s.Customer_key = c.Customer_key'],
  ['SALES', 'SELECT COUNT(*) FROM "Fact_Sales"'],
  ['SALES', 'SELECT COUNT(*) FROM "dbo"."Fact_Sales"'],
  ['SALES', 'SELECT DBO.Fact_Sales.OrderRef FROM dbo.fact_sales JOIN dbo.Fact_Sales x ON 1 = 1'],
  ['SALES', 'WITH x AS (SELECT [OrderRef], [Customer_key] FROM [Fact_Sales]) SELECT COUNT(*) FROM x INNER JOIN [Dim_Customer] c ON x.Customer_key = c.Customer_key'],
  ['SALES', 'WITH a AS (SELECT [OrderRef] FROM [Fact_Sales]),\n b AS (SELECT [Customer_key] FROM [Dim_Customer])\nSELECT (SELECT COUNT(*) FROM a) AS n, (SELECT COUNT(*) FROM b) AS m'],
  ['SALES', 'WITH [Fact_Sales] AS (SELECT 1 AS a) SELECT * FROM [Fact_Sales]'],
  ['SALES', 'WITH x AS (SELECT 1 AS a), fact_sales AS (SELECT 2 AS b) SELECT * FROM x'],
  ['SALES', 'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) SELECT * FROM [dbo].[x]'],
  ['SALES', 'SELECT [OrderRef] FROM [Fact_Sales] LIMIT 5'],
  ['SALES', 'SELECT TOP 3 [OrderRef] FROM [Fact_Sales] LIMIT 5'],
  ['SALES', 'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) SELECT * FROM x LIMIT 7'],
  ['SALES', "SELECT 'NOT_SUPPORTED' AS Status, 'داده آب و هوا در دسترس نیست' AS Reason"],
  ['SALES', "SELECT TOP 1 'NOT_SUPPORTED' AS [Status], 'it''s not here' AS [Reason]"],
  ['SALES', "SELECT 'NOT_SUPPORTED' AS Status"],
  ['SALES', 'SELECT * FROM [Secret]'],
  ['SALES', 'SELECT * FROM [Fact_Sales] s JOIN Secret x ON 1 = 1'],
  ['SALES', 'SELECT * FROM [dbo].[Secret]'],
  ['SALES', 'SELECT 1'],
  ['SALES', 'SELECT * FROM [Fact_Sales], [Dim_Customer]'],
  ['SALES', 'SELECT * FROM [Fact_Sales] WHERE [OrderRef] IN (SELECT [OrderRef] FROM [Fact_Sales] a, [Dim_Customer] b)'],
  ['SALES', 'SELECT COALESCE([OrderRef], 0), ISNULL([OrderDate], GETDATE()) FROM [Fact_Sales] WHERE [OrderRef] IN (1, 2, 3) GROUP BY [OrderRef], [OrderDate] ORDER BY 1, 2'],
  ['SALES', "SELECT [OrderRef] FROM [Fact_Sales] WHERE [OrderNumber] = N'الف، ب' AND [OrderRef] > 0"],
  ['SALES', 'SELECT * FROM [Fact_Sales] s JOIN [Dim_Customer] c ON s.Customer_key = c.Customer_key AND c.Customer_key IN (1,2)'],
  ['SALES', 'SELECT * FROM [Fact_Sales] somewhere, [Dim_Customer]'],
  ['SALES', 'SELECT * FROM [Fact_Sales] WHERE 1 = 1; DROP TABLE x'],
  ['SALES', 'SELECT * FROM [Fact_Sales] -- comment'],
  ['SALES', 'SELECT * /* x */ FROM [Fact_Sales]'],
  ['SALES', 'SELECT * INTO #t FROM [Fact_Sales]'],
  ['SALES', 'SELECT * FROM [Fact_Sales] CROSS APPLY dbo.fn(1) f'],
  ['SALES', 'SELECT [OrderRef] AS [فروش ماه], [OrderDate] AS تاریخ FROM [Fact_Sales] WHERE [OrderNumber] = N\'شماره ۱۲\''],
  ['SALES', 'SELECT\n  [OrderRef] AS [شماره سفارش],\n  [OrderDate]\nFROM [Fact_Sales]\nاین کوئری شماره سفارش را برمی‌گرداند'],
  ['SALES', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE [OrderDate] >= \'2024-01-01\' ORDER BY [OrderRef] OFFSET 0 ROWS'],
  ['SALES', 'SELECT Updated_At, Created_By, deleted_flag FROM [Fact_Sales]'],
  ['SALES', 'SELECT [delete] FROM [Fact_Sales]'],
  ['SALES', 'SELECT CASE WHEN [OrderRef] > 1 THEN \'a\' ELSE \'b\' END AS k FROM [Fact_Sales] UNION ALL SELECT \'c\' FROM [Dim_Customer]'],
  ['SALES', 'SELECT x.* FROM (SELECT [OrderRef], [OrderDate] FROM [Fact_Sales]) x INNER JOIN [Dim_Product] p ON 1 = 1'],
  ['HR', 'SELECT COUNT(*) FROM dbo.Fact_Employee e INNER JOIN dbo.Fact_EmployeePeriodCalculation p ON p.Employee_Key = e.Employee_Key'],
  ['HR', 'SELECT dbo.Fact_Employee.Employee_Key, dbo.Fact_EmployeePeriodCalculation.Period_Key FROM dbo.Fact_EmployeePeriodCalculation JOIN dbo.Fact_Employee ON 1 = 1'],
  ['PRC', 'SELECT [شماره درخواست پرداخت], [مبلغ درخواستی(ریال)] FROM [PRC].[PaymentReceiveInfo]'],
  ['PRC', 'SELECT SUM([PRC].[Fact_Invoice].[NetPrice]) FROM [PRC].[Fact_Invoice] JOIN [PRC].[Procurement_Dim_Supplier] s ON 1 = 1'],
  ['ALIASED', 'SELECT [GrossSales], [NetAmount] FROM [Fact_Sales] JOIN [Dim_Customer] ON 1 = 1'],
  ['VIRTUAL', 'SELECT COUNT(*) FROM [V_ActiveSales] v JOIN [Fact_Sales] s ON v.OrderRef = s.OrderRef'],
  ['VIRTUAL', 'WITH q AS (SELECT * FROM V_ActiveSales) SELECT * FROM q'],
];

const WRAPPERS = {
  plain: (q) => r(q),
  sqlLabel: (q) => r('SQL:\n' + q),
  fenced: (q) => r('کوئری:\n```sql\n' + q + '\n```\nاین کوئری داده را برمی‌گرداند.'),
  fencedNoLang: (q) => r('```\n' + q + '\n```'),
  envelope: (q) => r('UNDERSTOOD: the user wants data\nPLAN:\n- tables: Fact_Sales with select\n- filters: none\nSQL:\n' + q),
  markdownEnvelope: (q) => r('**UNDERSTOOD:** data\n## PLAN:\n- with select\n### **SQL:**\n' + q + ';'),
  planNoSql: (q) => r('UNDERSTOOD: x\n**PLAN:**\n- select with join\n' + q),
  think: (q) => r('<think>\nI should select with care.\n</think>\n' + q),
  reasoningKeys: (q) => ({ thinking: '  model reasoning  ', content: 'SQL:\n' + q, reasoning: 'ignored' }),
  oneLine: (q) => r('UNDERSTOOD: one line answer SQL: ' + q.replace(/\n/g, ' ')),
  crlf: (q) => r(('UNDERSTOOD: crlf\nSQL:\n' + q).replace(/\n/g, '\r\n')),
  persianProse: (q) => r('در اینجا کوئری مورد نظر است:\n\n' + q + '\n\nتوضیح: این کوئری کار را انجام می‌دهد.'),
  nbsp: (q) => r(q.replace(/FROM /g, 'FROM\u00a0').replace(/JOIN /g, 'JOIN\u2003')),
};
for (const [setName, q] of BODIES) {
  for (const [wName, wrap] of Object.entries(WRAPPERS)) add('matrix:' + wName, wrap(q), SETS[setName]);
}

// ---------- 3. focused cases ----------
const S = SALES;
const one = (group, text, defs = S, retry = false) => add(group, typeof text === 'string' ? r(text) : text, defs, retry);

// response shapes
one('response', 'SELECT * FROM [Fact_Sales]');            // object with response key
add('response', 'SELECT * FROM [Fact_Sales]', S);           // the item json is a bare string
add('response', '', S);
one('response', { result: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { answer: '   ', text: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { output: 'SELECT 1 FROM [Fact_Sales]', response: 'SELECT 2 FROM [Fact_Sales]' });
one('response', { message: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { content: '\n\nSELECT [OrderRef] FROM [Fact_Sales]\n\n' });
one('response', { foo: 'short', bar: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { foo: '   abcde   ' });
one('response', { foo: '😀😀😀' });
one('response', { '2': 'SELECT [OrderRef] FROM [Fact_Sales] AS two', a: 'SELECT [OrderRef] FROM [Fact_Sales] AS a' });
one('response', { choices: [{ message: { content: 'SELECT 1' } }], usage: { total: 12, ratio: 0.5 } });
one('response', { a: 1.5, b: 1e21, c: true, d: null, e: [1, 'x', 1e-7], f: { g: 'y' }, h: 'ab\n"c"\\\t\u0001' });
one('response', { n: 123456789012345680000, m: -0.000001, z: 0, big: 2 ** 60 });
one('response', { long: 'ab', pad: ['x'.repeat(278) + '😀😀😀😀'], tail: 1 });   // slice(0, 300) cuts an emoji in half
one('response', { long: 'ab', pad: ['x'.repeat(277) + '😀😀😀😀'], tail: 1 });
one('response', { arr: ['x'.repeat(10)], fa: 'سلام', ok: false });
one('response', { thinking: 'SELECT * FROM [Fact_Sales] long reasoning', response: '' });
one('response', { thinking: 'first thought', reasoning: 'second', response: '<think>tagged</think>SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { reasoning_content: '  rc  ', response: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { thoughts: 'tt', thinking: '   ', response: 'SQL: SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { thinking: 42, response: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('response', { response: 42, text: 'SELECT [OrderRef] FROM [Fact_Sales]' });

// envelopes
one('envelope', 'UNDERSTOOD: a\nSQL: SELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD:\nthe next line\nSQL:\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD: x PLAN: y\nSQL:\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'understood: lower case\nplan:\n- p\nsql:\nselect [OrderRef] from [Fact_Sales]');
one('envelope', '> PLAN: quoted plan\n> SQL: SELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', '# PLAN:\nselect the rows\nwith care\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'PLAN: only a plan, no query');
one('envelope', 'PLAN:\n- use SQL: carefully\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'Use SQL: SELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'Some intro\nSQL:\nSELECT [OrderRef] FROM [Fact_Sales]\n\nAnd a note after a blank line');
one('envelope', 'UNDERSTOOD: x\rSQL: SELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD: x\u2028SELECT * FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD: has\u2029para\nSQL:\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD: a\nUNDERSTOOD: b\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD: select all from Fact_Sales\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'UNDERSTOOD: q\nPLAN:\n- a\n- b\nWITH x AS (SELECT [OrderRef] FROM [Fact_Sales])\nSELECT * FROM x');
one('envelope', 'PLAN:\n- a\nSQL\n:\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', '<THINK>upper</THINK>\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', '<think>one</think> <think>two</think> SELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', '<think>unterminated\nSELECT [OrderRef] FROM [Fact_Sales]');
one('envelope', 'SQL:\n```sql\nSELECT [OrderRef] FROM [Fact_Sales]\n```\n```sql\nSELECT * FROM [Secret]\n```');
one('envelope', '```SQL\nSELECT [OrderRef] FROM [Fact_Sales]\n```');
one('envelope', '```sql SELECT [OrderRef] FROM [Fact_Sales]```');
one('envelope', '```sql\n```');
one('envelope', 'UNDERSTOOD: nothing');

// Persian prose and SQLKW
one('persian', 'متاسفم، نمی‌توانم.');
one('persian', 'Sorry, I cannot do that.');
one('persian', 'SELECT [OrderRef]\nاز جدول فروش\nFROM [Fact_Sales]');
one('persian', 'SELECT [OrderRef]\norange فارسی\nFROM [Fact_Sales]');
one('persian', 'SELECT [OrderRef],\n"ستون فارسی",\n[Customer_key]\nFROM [Fact_Sales]');
one('persian', "SELECT [OrderRef]\nFROM [Fact_Sales]\nWHERE [OrderNumber] = N'فروش'\n  AND x = 'a''فروش'''");
one('persian', "SELECT [OrderRef]\nFROM [Fact_Sales]\n'رشته' + فارسی");
one('persian', 'SELECT [OrderRef] FROM [Fact_Sales] AS فروش');
one('persian', 'فروشSELECT [OrderRef] FROM [Fact_Sales]');
one('persian', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE N\'۱۲۳\' = \'۱۲۳\'');
one('persian', 'SELECT TOP ۱۰ [OrderRef] FROM [Fact_Sales]');
one('persian', 'SELECT [OrderRef] FROM [Fact_Sales] LIMIT ۵');
one('persian', 'SELECT [OrderRef] FROM [Fact_Sales]\n\u200fتوضیح با علامت راست‌به‌چپ');
one('persian', 'SELECT [OrderRef] FROM [Fact_Sales]\n؟');

// NOT_SUPPORTED
one('not_supported', "SELECT 'NOT_SUPPORTED' AS Status, '' AS Reason");
one('not_supported', "UNDERSTOOD: fallback text\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, '   ' AS Reason");
one('not_supported', "UNDERSTOOD: u\nSQL:\nselect top 5 'NOT_SUPPORTED' as [status] , 'reason ''quoted'' here' as reason");
one('not_supported', "SELECT 'NOT_SUPPORTED'");
one('not_supported', "SELECT  TOP  1  'NOT_SUPPORTED' AS Status, 'r' AS Reason FROM [Fact_Sales]");
one('not_supported', "WITH x AS (SELECT 1 a) SELECT 'NOT_SUPPORTED' AS Status, 'r' AS Reason");
one('not_supported', "SELECT 'not_supported' AS Status, 'case' AS Reason");
one('not_supported', "SELECT 'NOT_SUPPORTED' AS Status, 'دلیل فارسی' AS Reason;");

// LIMIT
one('limit', 'SELECT [OrderRef] FROM [Fact_Sales] LIMIT 5;');
one('limit', 'SELECT [OrderRef] FROM [Fact_Sales] limit 5 ;  ');
one('limit', 'SELECT [OrderRef] FROM [Fact_Sales] LIMIT 5 OFFSET 2');
one('limit', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE [limit] = 1 LIMIT 10');
one('limit', 'select [OrderRef] FROM [Fact_Sales]\nLIMIT\n20');
one('limit', 'SELECT [OrderRef] FROM [Fact_Sales] LIMIT 5\u00a0');

// blocked keywords, each one, and glued to Persian / identifiers
const KW = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create', 'merge', 'exec', 'execute', 'grant',
  'revoke', 'backup', 'restore', 'shutdown', 'waitfor', 'into', 'xp_cmdshell', 'sp_who', 'openrowset',
  'opendatasource', 'dbcc', 'apply', 'openxml'];
for (const kw of KW) {
  one('blocked', `SELECT [OrderRef] FROM [Fact_Sales] WHERE x = '${kw}'`);
  one('blocked', `SELECT [OrderRef] FROM [Fact_Sales] WHERE فروش${kw.toUpperCase()} = 1`);
  one('blocked', `SELECT [OrderRef] FROM [Fact_Sales] WHERE x${kw} = 1`);
}
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE insertفروش = 1');
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE ۱insert = 1');
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE ınsert = 1');     // dotless i
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE İNSERT = 1');     // dotted capital I
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE ſp_who = 1');     // long s
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE \u212Aill = 1');  // kelvin sign
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE x = 1\u00a0delete');
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE xp_ = 1');
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE sp_x = 1');
one('blocked', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE a = OPENROWSET');
one('blocked', 'DELETE FROM [Fact_Sales]');
one('blocked', ' \n with x as (select 1 a) delete from x');
one('blocked', 'EXEC sp_executesql N\'SELECT 1\'');

// forbidden tokens
one('tokens', "SELECT [OrderRef] FROM [Fact_Sales] WHERE x = N'a;b'");
one('tokens', "SELECT [OrderRef] FROM [Fact_Sales] WHERE x = '--'");
one('tokens', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE x = 1 /* c */');
one('tokens', 'SELECT [OrderRef] FROM [Fact_Sales];;;  ');
one('tokens', 'SELECT [OrderRef] FROM [Fact_Sales]；SELECT 1');   // fullwidth semicolon
one('tokens', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE x = 1 - -1');
one('tokens', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE x = 1 / *');

// comma joins
const COMMA = [
  'SELECT * FROM [Fact_Sales] s , [Dim_Customer] c',
  'SELECT * FROM [Fact_Sales] WHERE x IN (SELECT 1 FROM [Dim_Customer] a , [Dim_Product] b)',
  'SELECT * FROM [Fact_Sales] WHERE x IN (SELECT 1 FROM [Dim_Customer] a WHERE a.x IN (1, 2))',
  'SELECT * FROM [Fact_Sales] s JOIN [Dim_Customer] c ON s.a = c.b, [Dim_Product]',
  'SELECT * FROM [Fact_Sales] GROUP BY a, b',
  'SELECT * FROM [Fact_Sales] ORDER BY a, b',
  'SELECT * FROM [Fact_Sales] HAVING COUNT(*) > 1, 2',
  'SELECT * FROM [Fact_Sales] FOR XML PATH, ROOT',
  'SELECT * FROM [Fact_Sales] UNION SELECT a, b FROM [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] EXCEPT SELECT a, b FROM [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] INTERSECT SELECT a, b FROM [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] WHERE [x,y] = 1',
  'SELECT * FROM [Fact_Sales] s JOIN "Dim_Customer" c ON s.a = c.b WHERE c."x,y" = 1',
  "SELECT * FROM [Fact_Sales] s JOIN [Dim_Customer] c ON c.n = 'a, b'",
  'SELECT * FROM [Fact_Sales] s JOIN [Dim_Customer] c ON ISNULL(s.a, 0) = c.b',
  'SELECT * FROM [Fact_Sales] [s,x]',
  'SELECT * FROM [Fact_Sales] s WHERE s.a = 1) , [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] somewhere, [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] t_for, [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] AS everyorder, [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] grouped_by_having, [Dim_Customer]',
  'SELECT * FROM [Fact_Sales] fromx, [Dim_Customer]',
  'SELECT * FROM [Fact_Sales]\nWHERE\tx IN (1,2)',
  'SELECT * FROM [Fact_Sales] WHERE\u00a0x IN (1,2)',
  'SELECT * FROM [Fact_Sales] [unterminated, x',
  "SELECT * FROM [Fact_Sales] WHERE x = 'unterminated, y",
  'SELECT a FROM (SELECT b, c FROM [Fact_Sales]) t',
  'SELECT a FROM (SELECT b FROM [Fact_Sales] x, [Dim_Customer] y) t',
  'SELECT DATEADD(day, 1, a) FROM [Fact_Sales] WHERE a BETWEEN DATEADD(day, -1, b) AND c',
  'SELECT * FROM [Fact_Sales] fromage , [Dim_Customer]',
  'SELECT [from], [x] FROM [Fact_Sales]',
  "SELECT 'from a, b' FROM [Fact_Sales]",
  'SELECT x AS "from, y" FROM [Fact_Sales]',
];
for (const q of COMMA) one('comma', q);

// TOP injection
const TOP = [
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) SELECT * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) SELECT TOP 5 * FROM x',
  "WITH x AS (SELECT [OrderRef] FROM [Fact_Sales] WHERE n = ')select') SELECT * FROM x",
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) , y AS (SELECT 1 a) SELECT * FROM x',
  'WITH x (a) AS (SELECT [OrderRef] FROM [Fact_Sales]) SELECT a FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) [x]select * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) فSELECT * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) ,selectx AS (SELECT 1 a) SELECT * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) "a)" SELECT * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]))) SELECT * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales])',
  'SELECT DISTINCT [OrderRef] FROM [Fact_Sales]',
  'SELECT\nTOP(5) [OrderRef] FROM [Fact_Sales]',
  'SELECT\u00a0[OrderRef] FROM [Fact_Sales]',
  'SELECTx FROM [Fact_Sales]',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) SELECT\ttop 3 * FROM x',
  'WITH x AS (SELECT [OrderRef] FROM [Fact_Sales]) select_col AS (SELECT 1) SELECT * FROM x',
];
for (const q of TOP) one('top', q);

// references, CTE shadowing, qualified names
const REFS = [
  'SELECT * FROM [Fact_Sales] JOIN[dbo].[Secret] x ON 1 = 1',
  'SELECT * FROM[Secret]',
  'SELECT * FROM [Fact_Sales] WHERE 1 IN (SELECT 1 FROM"Secret")',
  'SELECT * FROM [Fact_Sales] CROSS JOIN (SELECT * FROM [dbo].[Secret]) x',
  'SELECT * FROM [Fact_Sales] s FULL OUTER JOIN [Dim_Customer] c ON 1 = 1',
  'SELECT * FROM fact_sales',
  'SELECT * FROM [FACT_SALES]',
  'SELECT * FROM [Fact_Sales ]',
  'SELECT * FROM [Fact Sales]',
  'SELECT * FROM [a].[b].[c].[Fact_Sales]',
  'SELECT * FROM [srv].[db].[dbo].[Secret]',
  'SELECT * FROM dbo.Fact_SalesX',
  'SELECT * FROM dbo.Fact_Sales JOIN dbo.Fact_Sales2 ON 1 = 1',
  'SELECT dbo.Fact_Sales.OrderRef, xdbo.Fact_Sales.y, [dbo].Fact_Sales.z FROM dbo.Fact_Sales',
  'SELECT [dbo].[Fact_Sales].[OrderRef] FROM [dbo].[Fact_Sales] JOIN [SA].[dbo].[Fact_Sales] f2 ON 1 = 1',
  'SELECT * FROM dbo."Fact_Sales"',
  'SELECT * FROM "dbo.Fact_Sales"',
  'SELECT * FROM [dbo.Fact_Sales]',
  'SELECT * FROM [dbo].[Fact_Sales].[x]',
  'WITH Fact_Sales AS (SELECT 1 a) SELECT * FROM x',
  'WITH x AS (SELECT 1 a), "Dim_Customer" AS (SELECT 2 b) SELECT * FROM x',
  'WITH x AS (SELECT 1 a) SELECT * FROM x JOIN [Fact_Sales] ON 1 = 1',
  'WITH x AS (SELECT 1 a) SELECT * FROM dbo.x',
  'WITH x AS (SELECT 1 a) SELECT * FROM x',
  'WITH x AS(SELECT [OrderRef] FROM [Fact_Sales]) SELECT * FROM X',
  'SELECT * FROM [Fact_Sales] WHERE a IN (1, 2) , b',
  'SELECT * FROM\n[Fact_Sales]',
  'SELECT * FROM\u00a0Fact_Sales',
  'SELECT * FROM\u2028Fact_Sales',
  'SELECT * FROM\u0085Fact_Sales',
  'SELECT * FROM\u200bFact_Sales',
  'SELECT * FROMFact_Sales',
  'SELECT * FROM فروشFact_Sales',
  'SELECT * FROM [Fact_Sales] فروشjoin [Secret] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] s JOIN [Dim_Customer] AS c ON 1 = 1 JOIN [Dim_SalesOffice] o ON 1 = 1 JOIN [Dim_Product] p ON 1 = 1',
  'SELECT * FROM [Dim_Product] JOIN [Fact_Sales] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] WHERE x = \'FROM [Secret]\'',
];
for (const q of REFS) one('refs', q);

// catalog entity kinds, aliases, odd names
one('kinds', 'SELECT * FROM [V_NoSql]', BROKEN);
one('kinds', 'SELECT * FROM [T_NoSource]', BROKEN);
one('kinds', 'SELECT * FROM [T_View]', BROKEN);
one('kinds', 'SELECT * FROM [T_NullKind]', BROKEN);
one('kinds', 'SELECT * FROM [T_EmptyKind]', BROKEN);
one('kinds', 'SELECT * FROM [T_Key]', BROKEN);
one('kinds', 'SELECT * FROM [V_EmptySql]', BROKEN);
one('kinds', 'SELECT * FROM [T_NullKind] JOIN [T_View] ON 1 = 1', BROKEN);
one('kinds', 'SELECT * FROM [V_ActiveSales]', VIRTUAL);
one('kinds', 'SELECT * FROM dbo.V_ActiveSales', VIRTUAL);
one('kinds', 'SELECT * FROM [Fact_Sales]', ALIASED);
one('kinds', 'SELECT * FROM [Fact_Sales]', SETS.EMPTY);
one('weird', 'SELECT * FROM [123] JOIN [B_Last] ON 1 = 1', WEIRD);
one('weird', 'SELECT * FROM [B_Last] JOIN [123] ON 1 = 1', WEIRD);
one('weird', 'SELECT * FROM [Order Details]', WEIRD);
one('weird', 'SELECT * FROM [dbo].[Order Details] od', WEIRD);
one('weird', 'SELECT * FROM dbo.[a$&b]', WEIRD);
one('weird', "SELECT * FROM dbo.[a$'b] t", WEIRD);
one('weird', 'SELECT * FROM dbo.[a$$b$1] t', WEIRD);
one('weird', 'SELECT * FROM [dbo].[فروش]', WEIRD);
one('weird', 'SELECT * FROM [فروش] f', WEIRD);
one('weird', 'SELECT * FROM [i̇tem]', WEIRD);
one('weird', 'SELECT * FROM [İTEM]', WEIRD);
one('weird', 'SELECT * FROM dbo.[E😀😀😀] JOIN dbo.[abcdef] ON 1 = 1', WEIRD);
one('weird', 'SELECT * FROM dbo.[abcdef] JOIN dbo.[E😀😀😀] ON 1 = 1', WEIRD);
one('weird', 'SELECT * FROM [dot.ted]', WEIRD);
one('weird', 'SELECT * FROM dbo.[dot.ted]', WEIRD);
one('weird', 'SELECT * FROM "dot.ted"', WEIRD);
one('weird', 'SELECT * FROM dot.ted', WEIRD);
one('weird', "SELECT '\ud800' AS lone, '😀' AS e FROM [Fact_Sales]", S);
one('weird', 'SELECT [OrderRef] FROM [Fact_Sales] WHERE x = N\'\u200c\u200d\u202e\'', S);

// adversarial: characters where Python and JavaScript defaults differ (\s, trim, \w, case, line terminators)
const ADV = [
  'SELECT [OrderRef] FROM [Fact_Sales] \u0085',
  'SELECT [OrderRef] FROM [Fact_Sales]\u001f',
  '\u001cSELECT [OrderRef] FROM [Fact_Sales]',
  'UNDERSTOOD: x\u0085\nSQL:\nSELECT [OrderRef] FROM [Fact_Sales]',
  'UNDERSTOOD: \u001fx\u001e SQL: SELECT [OrderRef] FROM [Fact_Sales]',
  'SELECT * FROM [Fact_Sales] JOIN﻿[Secret] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] JOIN᠎[Secret] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] JOIN\u0085[Secret] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] JOIN\u001f[Secret] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] JOIN　[Secret] ON 1 = 1',
  'SELECT * FROM [Fact_Sales] s　,　[Secret]',
  'SELECT * FROM [Fact_Sales] WHERE x = 1　UNION SELECT a, b FROM [Fact_Sales]',
  'SELECT * FROM [Fact_Sales] WHERE\u0085x IN (1, 2)',
  'SELECT * FROM [Fact_Sales] ٴwhere x IN (1, 2)',
  'SELECT * FROM [Fact_Sales] éwhere x IN (1, 2)',
  'SELECT * FROM [Fact_Sales] WHERE éinsert = 1',
  'SELECT * FROM [Fact_Sales] WHERE ᵢnsert = 1',
  'SELECT * FROM [Fact_Sales] WHERE ＩＮＳＥＲＴ = 1',
  'SELECT * FROM [Fact_Sales] WHERE x = 1 ٠delete',
  'SELECT * FROM [Fact_Sales] WHERE x = 1 ٣delete',
  'SELECT TOP ١٠ * FROM [Fact_Sales]',
  'SELECT * FROM [Fact_Sales] LIMIT ٥',
  'SELECT * FROM ＦＲＯＭ [Secret]',
  'SELECT * FROM [Fact_Sales] ꜰrom [Secret]',
  'SELECT * FROM [Fact_Sales] WHERE 1 IN (SELECT 1 FROM [Secret])',
  'SELECT * FROM [Fact_Sales] WHERE 1 IN (SELECT 1 FROM\r[Secret])',
  'SELECT * FROM [Fact_Sales] WHERE 1 IN (SELECT 1 FROM\v[Secret])',
  'SELECT * FROM [Fact_Sales] WHERE 1 IN (SELECT 1 FROM\f[Secret])',
  'SELECT * FROM [Fact_Sales]\r\n\r\nSELECT * FROM [Secret]',
  'SELECT * FROM [Fact_Sales]\n \nSELECT * FROM [Secret]',
  'SELECT * FROM [Fact_Sales]\n\u0085\nDELETE FROM [Fact_Sales]',
  'SELECT * FROM [Fact_Sales]\n\u001f\nDELETE FROM [Fact_Sales]',
  'PLAN: - a\nSELECT * FROM [Fact_Sales]',
  'PLAN:\n- a select x\nSELECT * FROM [Fact_Sales]',
  'PLAN:\n- a\n WITH x AS (SELECT 1 a) SELECT * FROM x JOIN [Fact_Sales] ON 1 = 1',
  'UNDERSTOOD: a PLAN: b\nSQL:\nSELECT * FROM [Fact_Sales]',
  '<think> </think> SELECT * FROM [Fact_Sales] ',
  'SELECT * FROM [Fact_Sales] WHERE x = N\'\ud83d\' AND y = \'\ude00\'',
  'SELECT * FROM "Fact_Sales" WHERE "a" = 1 AND x IN (SELECT 1 FROM "Secret")',
  'SELECT * FROM [Fact_Sales] WHERE x = \'a\' + \'b, c\' , [Secret]',
];
for (const q of ADV) one('adversarial', q);
one('adversarial', { response: 'SQL:\n```sql\nSELECT 1 FROM [Fact_Sales]\n```', content: 'DELETE FROM [Fact_Sales]' });
one('adversarial', { RESPONSE: 'DELETE FROM [Fact_Sales]', response: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('adversarial', { '0': 'DELETE FROM [Fact_Sales] -- zero', z: 'SELECT [OrderRef] FROM [Fact_Sales]' });
one('adversarial', { z: '   \u0085\u0085\u0085\u0085\u0085\u0085   ' });
one('adversarial', { z: '\u001f\u001f\u001f\u001f\u001f\u001f' });
one('adversarial', { z: '  　　abcde　 ' });

// retry flag only changes attempt
one('retry', 'SELECT [OrderRef] FROM [Fact_Sales]', S, true);
one('retry', 'SELECT * FROM [Secret]', S, true);

// ---------- write ----------
// one case per line keeps the file small and diffs readable; Persian stays unescaped (UTF-8)
const lines = [
  '{"note": "Generated by tests/py/fixtures/make_guard_fixtures.js from n8n_workflows/code/Security.js; do not edit.",',
  ` "count": ${cases.length},`,
  ` "entitySets": ${JSON.stringify(entitySets)},`,
  ' "cases": [',
  cases.map((c) => '  ' + JSON.stringify(c)).join(',\n'),
  ' ]}',
];
fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
const rejected = cases.filter((c) => c.expect.error).length;
console.log(`${cases.length} cases (${cases.length - rejected} accepted, ${rejected} rejected) -> ${path.relative(ROOT, OUT)}`);
