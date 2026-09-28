const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { runCodeNode } = require('../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');

const REAL = loadCatalogs(path.join(__dirname, '..', 'catalog')).map((c) => c.data);

function buildPrompt(question, groups = ['NLSQL-Full']) {
  return runCodeNode('BuildPrompt', {
    inputs: REAL,
    nodes: { 'Embed Question': {}, AuthCheck: { groups }, Webhook: { body: { question } } },
  }).json;
}

function security(modelText, bp, extraNodes = {}) {
  return runCodeNode('Security', {
    inputs: [{ response: modelText }],
    nodes: { BuildPrompt: bp, ...extraNodes },
  }).json;
}

test('end to end: the fixed procurement example passes Security and is wrapped in CTEs', () => {
  const example = REAL.find((c) => c.domain === 'procurement').examples[0];
  const bp = buildPrompt('مجموع مبلغ فاکتور خرید هر تامین کننده', ['NLSQL-procurement']);
  assert.ok(bp.selectedEntities.includes('Fact_Invoice'));
  assert.ok(bp.selectedEntities.includes('Procurement_Dim_Supplier'));
  const out = security(`UNDERSTOOD: total invoices per supplier\nSQL:\n${example.sql}`, bp);
  assert.equal(out.attempt, 1);
  assert.equal(out.understood, 'total invoices per supplier');
  assert.deepEqual(out.entities.sort(), ['fact_invoice', 'procurement_dim_supplier']);
  assert.match(out.sql, /^WITH \[Fact_Invoice\] AS \(SELECT .* FROM \[PRC\]\.\[Fact_Invoice_2\]\)/);
  assert.match(out.sql, /\[Procurement_Dim_Supplier\] AS \(SELECT .* FROM \[PRC\]\.\[Dim_Supplier_2\]\)/);
});

test('an entity the prompt did not offer is rejected', () => {
  const bp = buildPrompt('تعداد کارمندان هر واحد', ['NLSQL-hr']);
  assert.throws(() => security('SQL:\nSELECT * FROM [Fact_Sales]', bp), /خارج از حیطه دسترسی/);
});

test('NOT_SUPPORTED is reported with the model reason instead of a misleading error', () => {
  const bp = buildPrompt('پیش بینی آب و هوای فردا');
  const text = "UNDERSTOOD: weather forecast is not available\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, 'No weather data in the schema' AS Reason";
  assert.throws(() => security(text, bp), (err) =>
    /قابل پاسخ نیست/.test(err.message) && /No weather data in the schema/.test(err.message));
});

test('NOT_SUPPORTED without a reason falls back to the UNDERSTOOD line', () => {
  const bp = buildPrompt('پیش بینی آب و هوای فردا');
  assert.throws(() => security("UNDERSTOOD: needs weather data\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status", bp),
    /needs weather data/);
});

test('write statements are still blocked', () => {
  const bp = buildPrompt('تعداد کارمندان هر واحد', ['NLSQL-hr']);
  assert.throws(() => security('SQL:\nDELETE FROM [Fact_Employee]', bp), /فقط SELECT/);
  assert.throws(() => security('SQL:\nSELECT * FROM [Fact_Employee]; DROP TABLE x', bp), /غیرمجاز/);
});

test('retry attempt is detected from Build Fix Prompt having run', () => {
  const bp = buildPrompt('تعداد کارمندان هر واحد', ['NLSQL-hr']);
  const out = security('SQL:\nSELECT COUNT(*) FROM [Fact_Employee]', bp, { 'Build Fix Prompt': {} });
  assert.equal(out.attempt, 2);
});

// ---------- content-driven fixes (catalog: Persian column names, old physical tables) ----------

test('Persian column names and Persian aliases on their own lines are kept', () => {
  const bp = buildPrompt('شماره درخواست پرداخت و مبلغ درخواستی اطلاعات دریافت پرداخت', ['NLSQL-procurement']);
  assert.ok(bp.selectedEntities.includes('PaymentReceiveInfo'));
  let out = security('SQL:\nSELECT TOP 10\n  [شماره درخواست پرداخت],\n  [مبلغ درخواستی(ریال)]\nFROM [PaymentReceiveInfo]', bp);
  assert.match(out.modelSql, /\[شماره درخواست پرداخت\],\n  \[مبلغ درخواستی\(ریال\)\]/);

  const inv = buildPrompt('مجموع مبلغ فاکتور خرید هر تامین کننده', ['NLSQL-procurement']);
  out = security('SQL:\nSELECT TOP 10\n  [Procurement_Dim_Supplier].[FullName] AS [نام تامین کننده],\n  SUM([Fact_Invoice].[NetPrice]) AS [جمع مبلغ]\n'
    + 'FROM [Fact_Invoice]\nINNER JOIN [Procurement_Dim_Supplier] ON [Fact_Invoice].[Supplier_Key] = [Procurement_Dim_Supplier].[Supplier_Key]\n'
    + 'GROUP BY [Procurement_Dim_Supplier].[FullName]', inv);
  assert.match(out.modelSql, /AS \[نام تامین کننده\],/);
  assert.match(out.modelSql, /AS \[جمع مبلغ\]/);
});

test('Persian prose around the SQL is still removed', () => {
  const bp = buildPrompt('مجموع مبلغ فاکتور خرید هر تامین کننده', ['NLSQL-procurement']);
  const out = security("SELECT SUM([NetPrice]) FROM [Fact_Invoice]\nاین کوئری مجموع 'خالص' را حساب می‌کند", bp);
  assert.equal(out.modelSql, 'SELECT TOP 200 SUM([NetPrice]) FROM [Fact_Invoice]');
});

test('schema- or database-qualified names read the entity CTE, never the physical table', () => {
  const bp = buildPrompt('مجموع مبلغ فاکتور خرید هر تامین کننده', ['NLSQL-procurement']);
  // [PRC].[Fact_Invoice] is an older physical table; the entity reads [PRC].[Fact_Invoice_2]
  const out = security('SQL:\nSELECT SUM([PRC].[Fact_Invoice].[NetPrice]) FROM [PRC].[Fact_Invoice]', bp);
  assert.equal(out.modelSql, 'SELECT TOP 200 SUM([Fact_Invoice].[NetPrice]) FROM [Fact_Invoice]');
  assert.match(out.sql, /\[Fact_Invoice\] AS \(SELECT .* FROM \[PRC\]\.\[Fact_Invoice_2\]\)/);
  assert.ok(!/FROM \[PRC\]\.\[Fact_Invoice\]\b(?!_)/.test(out.sql.split('\n').pop()));

  const hr = buildPrompt('تعداد کارمندان هر واحد', ['NLSQL-hr']);
  assert.equal(security('SQL:\nSELECT COUNT(*) FROM [SA_DataWarehouse].[dbo].[Fact_Employee]', hr).modelSql,
    'SELECT TOP 200 COUNT(*) FROM [Fact_Employee]');
  assert.equal(security('SQL:\nSELECT COUNT(*) FROM dbo.Fact_Employee', hr).modelSql,
    'SELECT TOP 200 COUNT(*) FROM [Fact_Employee]');
});

test('a model CTE name cannot unlock a qualified physical table (access bypass)', () => {
  const hr = buildPrompt('تعداد کارمندان هر واحد', ['NLSQL-hr']);
  const attack = 'SQL:\nWITH [Fact_Sales] AS (SELECT 1 AS a) SELECT TOP 5 s.* FROM [Fact_Employee] e INNER JOIN [dbo].[Fact_Sales] s ON 1 = 1';
  assert.throws(() => security(attack, hr), /خارج از حیطه دسترسی/);
  // an unqualified reference to the model's own CTE is still fine
  const ok = security('SQL:\nWITH x AS (SELECT [Employee_Key] FROM [Fact_Employee]) SELECT COUNT(*) FROM x', hr);
  assert.deepEqual(ok.entities, ['fact_employee']);
});

test('qualified-name rewriting respects identifier boundaries', () => {
  const hr = buildPrompt('کارکرد و اضافه کار کارمندان', ['NLSQL-hr']);
  assert.ok(hr.selectedEntities.includes('Fact_EmployeePeriodCalculation'));
  const out = security('SQL:\nSELECT COUNT(*) FROM dbo.Fact_Employee e INNER JOIN dbo.Fact_EmployeePeriodCalculation p ON p.Employee_Key = e.Employee_Key', hr);
  assert.equal(out.modelSql,
    'SELECT TOP 200 COUNT(*) FROM [Fact_Employee] e INNER JOIN [Fact_EmployeePeriodCalculation] p ON p.Employee_Key = e.Employee_Key');
});
