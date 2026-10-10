// Step 5: metrics, the shared Persian calendar (Dim_Date) and today's date in the prompt.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { runCodeNode } = require('../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { validateCatalogs } = require('../scripts/lib/catalog-validator');

const FILES = loadCatalogs(path.join(__dirname, '..', 'catalog'));
const CATALOGS = FILES.map((c) => c.data);

function build({ question, groups = ['NLSQL-Full'] }) {
  return runCodeNode('BuildPrompt', {
    inputs: CATALOGS,
    nodes: { 'Embed Question': {}, AuthCheck: { groups, email: 't@x' }, Webhook: { body: { question } } },
  });
}

// ---------- metrics ----------
test('a metric named in the question goes into the prompt with its exact formula and filter', () => {
  const { json } = build({ question: 'فروش خالص هر دسته محصول' });
  assert.deepEqual(json.retrieval.metrics, ['فروش خالص']);
  assert.match(json.body.string2,
    /METRICS \(.*\):\n- فروش خالص = SUM\(\[Fact_Sales\]\.\[EffectiveNetPrice\]\)   \(always filter: \[Fact_Sales\]\.\[OrderItemState_Key\] NOT IN \(6, 7\)\)/);
});

test('the longest matching metric wins: «تعداد سفارش خرید» is procurement, not the sales «تعداد سفارش»', () => {
  const { json } = build({ question: 'تعداد سفارش خرید هر تامین‌کننده' });
  assert.ok(json.retrieval.metrics.includes('تعداد سفارش خرید'));
  assert.ok(!json.retrieval.metrics.includes('تعداد سفارش فروش'));
});

test('metrics count like a synonym: no double counting that would drop the other domain of a mixed question', () => {
  const { json } = build({ question: 'فروش ماهانه هر دفتر فروش و مبلغ فاکتور خرید' });
  assert.ok(json.retrieval.activeDomains.includes('sales'));
  assert.ok(json.retrieval.activeDomains.includes('procurement'));
});

test('metrics never reveal another domain to a user without access', () => {
  const { json } = build({ groups: ['NLSQL-hr'], question: 'فروش خالص و تعداد کارمندان هر واحد' });
  assert.deepEqual(json.retrieval.metrics, ['تعداد کارمندان']);
  assert.ok(!/EffectiveNetPrice/.test(json.body.string2));
});

// ---------- the Persian calendar ----------
test('Dim_Date is shared: every domain may use it, nothing else of common.json leaks to HR', () => {
  const common = CATALOGS.find((c) => c.domain === 'common');
  assert.ok(common.entities.some((e) => e.name === 'Dim_Date'));
  assert.ok(!CATALOGS.find((c) => c.domain === 'treasury').entities.some((e) => e.name === 'Dim_Date'));
  const { json } = build({ groups: ['NLSQL-hr'], question: 'تعداد کارمندان استخدام شده در سال ۱۴۰۲ به تفکیک ماه' });
  assert.ok(json.selectedEntities.includes('Dim_Date'));
  for (const n of ['Dim_Part', 'Dim_Unit', 'Procurement_Dim_Supplier']) assert.ok(!json.selectedEntities.includes(n), n);
  assert.match(json.body.string2, /TRY_CAST\(\[Dim_Date\]\.\[FullDateAlternateKey\] AS date\)/);
});

test('Persian years, month names and relative periods bring the calendar in', () => {
  for (const question of ['فروش خالص سال ۱۴۰۳', 'فروش خالص فروردین', 'فاکتورهای خرید امسال', 'وصولی ماه گذشته']) {
    const { json } = build({ question });
    assert.ok(json.selectedEntities.includes('Dim_Date'), question);
    assert.ok(json.retrieval.scores.find((s) => s.entity === 'Dim_Date').pat > 0, question);
  }
  assert.ok(!build({ question: 'فروش خالص هر دفتر فروش' }).json.selectedEntities.includes('Dim_Date'));
});

test('the calendar alone does not make an out-of-scope question look answerable', () => {
  const { json } = build({ question: 'نرخ تورم ماهانه کشور در سال گذشته چقدر بوده است؟' });
  assert.equal(json.retrieval.lowConfidence, true);
});

test('the prompt carries today\'s Gregorian and Persian date and the Persian-year rule', () => {
  const { json } = build({ question: 'فروش خالص امسال' });
  const m = json.body.string2.match(/TODAY is (\d{4}-\d{2}-\d{2}) \(Persian date (\d{4})\/(\d{2})\/(\d{2})\)/);
  assert.ok(m, 'no TODAY line');
  const expectedYear = new Intl.DateTimeFormat('en-US-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric' })
    .formatToParts(new Date()).find((p) => p.type === 'year').value;
  assert.equal(m[2], expectedYear);
  assert.match(json.body.string2, /1403 \/ ۱۴۰۳ is a Persian \(شمسی\) year/);
});

// ---------- validator ----------
test('validator: metrics must name real exposed columns; patterns must compile', () => {
  const clone = () => FILES.map((f) => ({ file: f.file, data: JSON.parse(JSON.stringify(f.data)) }));
  const rules = (cats) => validateCatalogs(cats).errors.map((e) => e.rule);
  assert.deepEqual(validateCatalogs(FILES).errors, []);
  let cats = clone();
  cats.find((c) => c.data.domain === 'sales').data.metrics.push({ name_fa: 'x', sql: 'SUM([Fact_Sales].[Nope])' });
  assert.ok(rules(cats).includes('metrics'));
  cats = clone();
  cats.find((c) => c.data.domain === 'sales').data.metrics.push({ name_fa: 'y', sql: 'COUNT(*)' });
  assert.ok(rules(cats).includes('metrics'));
  cats = clone();
  cats.find((c) => c.data.domain === 'common').data.entities.find((e) => e.name === 'Dim_Date').patterns_fa.push('(');
  assert.ok(rules(cats).includes('patterns'));
});
