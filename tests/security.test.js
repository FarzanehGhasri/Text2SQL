const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { runCodeNode, runBuildPrompt } = require('../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');

const REAL = loadCatalogs(path.join(__dirname, '..', 'catalog')).map((c) => c.data);

function buildPrompt(question, groups = ['NLSQL-Full']) {
  return runBuildPrompt({
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

// ---------- Step 6: the model writes a PLAN before the SQL ----------
test('PLAN between UNDERSTOOD and SQL is returned as plan, shown as thinking, never parsed as SQL', () => {
  const bp = buildPrompt('فروش خالص هر دفتر فروش');
  const text = [
    'UNDERSTOOD: net sales per sales office',
    'PLAN:',
    '- tables: Fact_Sales joined with Dim_SalesOffice on SalesOffice_Key; select the office name',
    '- filters: OrderItemState_Key NOT IN (6, 7)',
    '- result: SUM of EffectiveNetPrice per office, ORDER BY total DESC',
    'SQL:',
    'SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) AS [T] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name] ORDER BY [T] DESC',
  ].join('\n');
  const out = security(text, bp);
  assert.equal(out.understood, 'net sales per sales office');
  assert.match(out.plan, /^- tables: Fact_Sales joined with Dim_SalesOffice/);
  assert.match(out.plan, /- result: SUM of EffectiveNetPrice/);
  assert.match(out.thinking, /PLAN:/);
  assert.match(out.modelSql, /^SELECT TOP 200 \[Dim_SalesOffice\]\.\[Name\]/);
});

test('a PLAN with "with"/"select" in it and no SQL: label still yields only the query', () => {
  const bp = buildPrompt('فروش خالص هر دفتر فروش');
  const text = [
    'UNDERSTOOD: net sales per office',
    '**PLAN:**',
    '- tables: join Fact_Sales with Dim_SalesOffice, select name',
    'SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) AS [T]',
    'FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key]',
    'GROUP BY [Dim_SalesOffice].[Name]',
  ].join('\n');
  const out = security(text, bp);
  assert.match(out.modelSql, /^SELECT TOP 200 \[Dim_SalesOffice\]\.\[Name\]/);
  assert.equal(out.plan, '- tables: join Fact_Sales with Dim_SalesOffice, select name');
  assert.ok(!/join Fact_Sales with/.test(out.sql));
});

test('markdown labels (**SQL:**) and the old one-line shape still work', () => {
  const bp = buildPrompt('فروش خالص هر دفتر فروش');
  let out = security('UNDERSTOOD: x\n**PLAN:**\n- tables: Fact_Sales\n**SQL:**\n```sql\nSELECT SUM([Fact_Sales].[EffectiveNetPrice]) AS [T] FROM [Fact_Sales]\n```', bp);
  assert.match(out.modelSql, /^SELECT TOP 200 SUM\(\[Fact_Sales\]\.\[EffectiveNetPrice\]\)/);
  out = security('UNDERSTOOD: total net sales SQL: SELECT SUM([Fact_Sales].[EffectiveNetPrice]) AS [T] FROM [Fact_Sales]', bp);
  assert.equal(out.understood, 'total net sales');
  assert.match(out.modelSql, /FROM \[Fact_Sales\]$/);
  assert.equal(out.plan, '');
});

test('NOT_SUPPORTED without a PLAN is still recognised', () => {
  const bp = buildPrompt('پیش بینی آب و هوای فردا');
  assert.throws(() => security("UNDERSTOOD: weather is not available\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, 'no weather data' AS Reason", bp),
    /قابل پاسخ نیست[\s\S]*no weather data/);
});

test('the prompt asks for UNDERSTOOD, PLAN, SQL and shows examples as SQL', () => {
  const p = buildPrompt('فروش خالص هر دسته محصول').body.string2;
  assert.match(p, /UNDERSTOOD: <one concise English sentence[^\n]*\nPLAN:\n- tables: [^\n]*\n- filters: [^\n]*\n- result: [^\n]*\nSQL:\n/);
  assert.match(p, /Examples of correct SQL for similar questions[^\n]*\nExample 1:\nQ: [^\n]*\nSQL: SELECT/);
});

test('the repair prompt keeps the PLAN shape and names the error', () => {
  const { json } = runCodeNode('Build Fix Prompt', {
    inputs: [{ error: { message: "Invalid column name 'Foo'." } }],
    nodes: {
      Security: { modelSql: 'SELECT [Foo] FROM [Fact_Sales]' },
      BuildPrompt: { body: { string2: 'ORIGINAL PROMPT' } },
    },
  });
  const p = json.body.string2;
  assert.ok(p.startsWith('ORIGINAL PROMPT'));
  assert.match(p, /SELECT \[Foo\] FROM \[Fact_Sales\]/);
  assert.match(p, /Invalid column name 'Foo'/);
  assert.match(p, /PLAN:\n- error: /);
});
