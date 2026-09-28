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
