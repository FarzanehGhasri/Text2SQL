// Step 3: the verified-query bank and similarity-based few-shot examples.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runCodeNode, runBuildPrompt } = require('../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { loadQueryBank, exampleEntities, allExamples } = require('../scripts/lib/query-bank');
const { validateCatalogs } = require('../scripts/lib/catalog-validator');
const { generate, load, allEntityDefs, securedSql, OUT } = require('../scripts/generate-bank-check-sql');
const { lexNorm } = require('../scripts/lib/persian-text');

const ROOT = path.join(__dirname, '..');
const CATALOGS = loadCatalogs(path.join(ROOT, 'catalog')).map((c) => c.data);
const BANK = loadQueryBank(path.join(ROOT, 'catalog'));

function build({ question, groups = ['NLSQL-Full'], embedding = {}, extras = [BANK.data] }) {
  return runBuildPrompt({
    inputs: [...CATALOGS, ...extras],
    nodes: { 'Embed Question': embedding, AuthCheck: { groups, email: 't@x' }, Webhook: { body: { question } } },
  });
}

test('the bank is valid against the catalogs', () => {
  const { errors } = validateCatalogs(loadCatalogs(path.join(ROOT, 'catalog')), { queryBank: BANK });
  assert.deepEqual(errors, []);
  assert.ok(BANK.data.examples.length >= 40);
});

test('every example (bank + catalogs) passes the real Security node with all its tables', () => {
  const defs = allEntityDefs(CATALOGS);
  for (const ex of allExamples(CATALOGS, BANK.data)) {
    const sql = securedSql(ex.sql, defs);
    for (const n of exampleEntities(ex.sql)) assert.match(sql, new RegExp(`\\[${n}\\] AS \\(`), `${ex.id}: no CTE for ${n}`);
  }
});

test('Persian literals in examples use the N prefix', () => {
  for (const ex of allExamples(CATALOGS, BANK.data)) {
    const bad = ex.sql.match(/(?<!N)'[^']*[؀-ۿ][^']*'/);
    assert.equal(bad, null, `${ex.id}: ${bad && bad[0]}`);
  }
});

test('no example copies a benchmark question (the benchmark would stop measuring anything)', () => {
  const tokens = (s) => new Set(lexNorm(s).replace(/[؟?!.,،؛:;«»"'()]/g, ' ').split(' ').filter((t) => t.length >= 2));
  const jac = (a, b) => { let i = 0; for (const t of a) if (b.has(t)) i++; return i / (a.size + b.size - i); };
  const bench = fs.readdirSync(path.join(ROOT, 'benchmark', '02')).filter((f) => f.endsWith('.json') && !f.endsWith('.local.json'))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmark', '02', f), 'utf8')).questions);
  for (const ex of BANK.data.examples) {
    for (const b of bench) {
      const s = jac(tokens(ex.q), tokens(b.question));
      assert.ok(s < 0.6, `${ex.id} is too close to benchmark ${b.id} (${s.toFixed(2)}): ${ex.q} | ${b.question}`);
    }
  }
});

test('sql/check_query_bank.sql is generated from the current examples', () => {
  const { catalogs, bank } = load();
  assert.equal(fs.readFileSync(OUT, 'utf8'), generate(catalogs, bank), 'run: node scripts/generate-bank-check-sql.js');
});

// ---------- BuildPrompt: choosing examples ----------
test('examples are the ones most similar to the question, not the first ones of the domain', () => {
  const { json } = build({ question: 'سهم هر دفتر فروش از کل فروش به درصد' });
  assert.equal(json.retrieval.examples[0].id, 'sales_b06');
  assert.match(json.body.string2, /OVER \(\)/);
});

test('an example is only shown when the user may read all its tables and they are in the prompt', () => {
  // HR-only user: no sales/procurement example can appear, even for a sales-like question
  const { json } = build({ groups: ['NLSQL-hr'], question: 'تعداد کارمندان هر نوع قرارداد و فروش هر دفتر' });
  const prompt = json.body.string2;
  const selected = new Set(json.selectedEntities);
  for (const e of json.retrieval.examples) {
    const ex = allExamples(CATALOGS, BANK.data).find((x) => x.id === e.id);
    for (const n of exampleEntities(ex.sql)) assert.ok(selected.has(n), `${e.id} uses ${n} outside the prompt`);
  }
  assert.ok(!/Fact_Sales/.test(prompt));
  assert.equal(json.retrieval.examples[0].id, 'hr_b01');
});

test('at most EXAMPLES.MAX examples and the prompt still fits the budget', () => {
  for (const question of ['مبلغ خالص فاکتورهای خرید هر واحد خرید', 'جمع پرداخت‌ها به تفکیک عامل جریان نقدی', 'فروش هر دسته محصول']) {
    const { json } = build({ question });
    assert.ok(json.retrieval.examples.length <= 4);
    assert.ok(json.promptChars <= 24000, `${question}: ${json.promptChars}`);
    const shown = (json.body.string2.match(/^Example \d+:/gm) || []).length;
    assert.equal(shown, json.retrieval.examples.length);
  }
});

test('without the bank, catalog examples are still ranked and used', () => {
  const { json } = build({ question: 'تعداد سفارش هر مشتری', extras: [] });
  assert.equal(json.retrieval.examples[0].id, 'sales#3');
});

test('semantic similarity picks a paraphrased example; a very close one brings its tables', () => {
  // the keyword route reaches Fact_Employee and its dimensions, never the period-calculation tables
  const q = 'کارمندان هر نوع قرارداد چند نفرند';
  const before = build({ question: q }).json;
  assert.ok(!before.selectedEntities.includes('Fact_EmployeePeriodCalculation'));

  const target = BANK.data.examples.find((e) => e.id === 'hr_b05');
  const v = [1, 0, 0, 0];
  const index = { exampleIndex: true, vectors: { [target.q]: { embedding: v } } };
  const { json, logs } = build({ question: q, embedding: [v], extras: [BANK.data, index] });
  assert.equal(json.retrieval.examples[0].id, 'hr_b05');
  assert.ok(json.retrieval.examples[0].sem > 0.99);
  for (const n of ['Fact_EmployeePeriodCalculation', 'HR_Dim_TimePeriod']) {
    assert.ok(json.selectedEntities.includes(n), n);
    assert.ok(json.retrieval.exampleLinkedTables.includes(n), n);
  }
  assert.ok(logs.some((l) => l.startsWith('EXAMPLE LINK |')));

  // below LINK_MIN_SIM: the example may still be shown, but brings nothing
  const weak = { exampleIndex: true, vectors: { [target.q]: { embedding: [0.8, 0.6, 0, 0] } } };
  const r = build({ question: q, embedding: [v], extras: [BANK.data, weak] }).json;
  assert.deepEqual(r.retrieval.exampleLinkedTables, []);
});

test('a similar example never brings tables the user may not read', () => {
  const sales = BANK.data.examples.find((e) => e.id === 'sales_b01');
  const v = [0, 1, 0, 0];
  const index = { exampleIndex: true, vectors: { [sales.q]: { embedding: v } } };
  const { json } = build({ groups: ['NLSQL-hr'], question: 'تعداد کارمندان هر واحد', embedding: [v], extras: [BANK.data, index] });
  assert.ok(!json.selectedEntities.includes('Fact_Sales'));
  assert.ok(!json.retrieval.examples.some((e) => e.id === 'sales_b01'));
});
