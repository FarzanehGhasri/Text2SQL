const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { runCodeNode } = require('./helpers/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');

const REAL = loadCatalogs(path.join(__dirname, '..', 'catalog')).map((c) => c.data);
const MAX_PROMPT_CHARS = 17000; // CFG.MAX_PROMPT_CHARS in BuildPrompt.js
const CORES = ['BOMDetails', 'Fact_Employee', 'Fact_ntsw', 'Fact_Purchase', 'Fact_Sales', 'Fact_CashFlow'];

function build({ catalogs = REAL, groups = ['NLSQL-Full'], question, embedding = {} }) {
  return runCodeNode('BuildPrompt', {
    inputs: catalogs,
    nodes: {
      'Embed Question': embedding,
      AuthCheck: { groups, email: 'tester@example.com' },
      Webhook: { body: { question } },
    },
  });
}

// ---------- output contract (read by Security, Build Fix Prompt, request to LLM) ----------
test('output keeps the contract downstream nodes read', () => {
  const { json } = build({ question: 'تعداد کارمندان هر واحد' });
  assert.deepEqual(Object.keys(json).sort(),
    ['body', 'entityDefs', 'promptChars', 'question', 'retrieval', 'selectedEntities'].sort());
  assert.equal(json.body.string1, '-');
  assert.equal(json.promptChars, json.body.string2.length);
  assert.deepEqual(Object.keys(json.entityDefs), json.selectedEntities);
  const emp = json.entityDefs.Fact_Employee;
  assert.equal(emp.source, '[HR].[Fact_Employee]');
  assert.equal(emp.kind, 'table');
  const hidden = REAL.flatMap((c) => c.entities).find((e) => e.name === 'Fact_Employee')
    .columns.filter((c) => c.exposed === false).map((c) => c.name);
  for (const h of hidden) assert.ok(!emp.columns.some((c) => c.name === h), `hidden column ${h} leaked`);
});

// ---------- domain routing ----------
test('an HR question for a NLSQL-Full user does not drag in other domains', () => {
  const { json, logs } = build({ question: 'تعداد کارمندان هر واحد' });
  assert.deepEqual(json.retrieval.activeDomains, ['hr']);
  for (const core of CORES.filter((c) => c !== 'Fact_Employee')) {
    assert.ok(!json.selectedEntities.includes(core), `${core} should not be in an HR prompt`);
  }
  assert.ok(json.selectedEntities.includes('Fact_Employee'));
  assert.ok(!/مبالغ به ریال است/.test(json.body.string2), 'sales/procurement hints leaked into an HR prompt');
  assert.ok(logs.some((l) => l.startsWith('DOMAINS | hr=')));
});

test('a mixed sales + purchase question keeps both domains', () => {
  const { json } = build({ question: 'فروش ماهانه هر دفتر فروش و مبلغ فاکتور خرید' });
  assert.ok(json.retrieval.activeDomains.includes('sales'));
  assert.ok(json.retrieval.activeDomains.includes('procurement'));
  assert.ok(json.selectedEntities.includes('Fact_Sales'));
  assert.ok(json.selectedEntities.includes('Fact_Invoice'));
});

test('low confidence keeps at most one domain', () => {
  const { json } = build({ question: 'پیش بینی آب و هوای فردا' });
  assert.equal(json.retrieval.lowConfidence, true);
  assert.ok(json.retrieval.activeDomains.length <= 1);
  assert.match(json.body.string2, /likely NOT answerable/);
});

// ---------- shared dimensions (common.json) ----------
test('a procurement-only user can join purchases to part and unit', () => {
  const { json } = build({ groups: ['NLSQL-procurement'], question: 'مقدار خرید هر کالا به تفکیک واحد' });
  for (const n of ['Fact_Purchase', 'Dim_Part', 'Dim_Unit']) assert.ok(json.selectedEntities.includes(n), n);
  assert.match(json.body.string2, /-- \[Fact_Purchase\]\.\[Part_Key\] = \[Dim_Part\]\.\[Part_Key\]/);
});

// ---------- access control is unchanged ----------
test('a user with no NLSQL group is denied', () => {
  assert.throws(() => build({ groups: ['Domain Users'], question: 'فروش' }), /دسترسی/);
});

test('an HR-only user never sees procurement or shared entities', () => {
  const { json } = build({ groups: ['NLSQL-hr'], question: 'مجموع مبلغ فاکتور خرید هر تامین کننده' });
  const hr = new Set(REAL.find((c) => c.domain === 'hr').entities.map((e) => e.name));
  for (const n of json.selectedEntities) assert.ok(hr.has(n), `${n} is not an HR entity`);
});

// ---------- prompt budget ----------
test('the whole prompt stays within budget', () => {
  for (const question of [
    'تعداد کارمندان هر واحد', // 17398 chars before the whole prompt was budgeted
    'مجموع مبلغ فاکتور خرید هر تامین کننده',
    'فروش ماهانه هر دفتر فروش و مبلغ فاکتور خرید',
    'وضعیت پرداخت و درخواست پرداخت و دستور پرداخت و اطلاعات پرداخت هر فاکتور خرید',
    'موجودی انبار و رسید انبار و حواله و فرمول ساخت هر کالا',
  ]) {
    const { json } = build({ question });
    assert.ok(json.promptChars <= MAX_PROMPT_CHARS, `${question}: ${json.promptChars}`);
    assert.ok(json.selectedEntities.length > 0);
  }
});

// ---------- small synthetic catalogs for the precise rules ----------
function synthetic() {
  const col = (name, extra = {}) => ({ name, type: 'int', ...extra });
  return [
    {
      domain: 'shop', description_fa: 'فروشگاه',
      hints_fa: ['راهنمای کلی فروشگاه', { text: 'راهنمای مخصوص سبد', entities: ['Fact_Basket'] }],
      permissions: { G: ['*'] },
      entities: [
        { name: 'Fact_Order', kind: 'table', source: '[S].[Order]', core: true, synonyms_fa: ['سفارش'], description_fa: 'سفارش‌ها', columns: [col('Unit_Key'), col('Amount')] },
        { name: 'Fact_Basket', kind: 'table', source: '[S].[Basket]', synonyms_fa: ['سبد'], description_fa: 'سبد خرید', columns: [col('Unit_Key'), col('Qty')] },
        { name: 'Fact_Refund', kind: 'table', source: '[S].[Refund]', synonyms_fa: ['مرجوعی'], description_fa: 'مرجوعی', columns: [col('Unit_Key')] },
      ],
      joins: [
        { from: 'Fact_Order', from_column: 'Unit_Key', to: 'Dim_Unit', to_column: 'Unit_Key' },
        { from: 'Fact_Basket', from_column: 'Unit_Key', to: 'Dim_Unit', to_column: 'Unit_Key' },
        { from: 'Fact_Refund', from_column: 'Unit_Key', to: 'Dim_Unit', to_column: 'Unit_Key' },
      ],
      examples: [{ q: 'shop example', sql: 'SELECT 1 FROM [Fact_Order]' }],
    },
    {
      domain: 'people', description_fa: 'کارکنان', hints_fa: ['راهنمای کارکنان'],
      permissions: { G: ['*'] },
      entities: [{ name: 'Fact_Staff', kind: 'table', source: '[P].[Staff]', core: true, synonyms_fa: ['کارمند'], description_fa: 'کارکنان', columns: [col('Age')] }],
      joins: [], examples: [{ q: 'people example', sql: 'SELECT 1 FROM [Fact_Staff]' }],
    },
    {
      domain: 'common', shared: true, description_fa: 'مشترک', hints_fa: [], permissions: { G: ['*'] },
      entities: [{ name: 'Dim_Unit', kind: 'table', source: '[C].[Unit]', synonyms_fa: ['واحد'], description_fa: 'واحد', columns: [col('Unit_Key'), col('Title')] }],
      joins: [], examples: [],
    },
  ];
}

test('core, hints and examples come only from active domains', () => {
  const { json } = build({ catalogs: synthetic(), groups: ['G'], question: 'جمع سفارش' });
  assert.deepEqual(json.retrieval.activeDomains, ['shop']);
  assert.ok(!json.selectedEntities.includes('Fact_Staff'));
  const p = json.body.string2;
  assert.match(p, /راهنمای کلی فروشگاه/);
  assert.doesNotMatch(p, /راهنمای کارکنان/);
  assert.match(p, /shop example/);
  assert.doesNotMatch(p, /people example/);
});

test('entity-scoped hints are sent only when their entity is selected', () => {
  const without = build({ catalogs: synthetic(), groups: ['G'], question: 'جمع سفارش' }).json;
  assert.ok(!without.selectedEntities.includes('Fact_Basket'));
  assert.doesNotMatch(without.body.string2, /راهنمای مخصوص سبد/);
  const withBasket = build({ catalogs: synthetic(), groups: ['G'], question: 'تعداد سبد' }).json;
  assert.ok(withBasket.selectedEntities.includes('Fact_Basket'));
  assert.match(withBasket.body.string2, /راهنمای مخصوص سبد/);
});

test('join closure follows fact -> dimension only, not dimension -> every fact', () => {
  const viaFact = build({ catalogs: synthetic(), groups: ['G'], question: 'جمع سفارش' }).json;
  assert.ok(viaFact.selectedEntities.includes('Dim_Unit'), 'the referenced dimension is added');
  // Dim_Unit itself matches here; every fact that references it must not be pulled in.
  const { json } = build({ catalogs: synthetic(), groups: ['G'], question: 'جمع سفارش به تفکیک واحد' });
  assert.ok(json.selectedEntities.includes('Dim_Unit'));
  assert.ok(!json.selectedEntities.includes('Fact_Basket'), 'other facts that reference the dimension are not');
  assert.ok(!json.selectedEntities.includes('Fact_Refund'));
});

test('a question that only matches a shared dimension activates no domain', () => {
  const { json } = build({ catalogs: synthetic(), groups: ['G'], question: 'لیست واحد' });
  assert.deepEqual(json.retrieval.activeDomains, []);
  assert.deepEqual(json.selectedEntities, ['Dim_Unit']);
});

test('duplicate entity names keep the first and log it', () => {
  const cats = synthetic();
  cats[1].entities.push({ ...cats[0].entities[1], source: '[P].[Other]' });
  const { json, logs } = build({ catalogs: cats, groups: ['G'], question: 'تعداد سبد' });
  assert.equal(json.entityDefs.Fact_Basket.source, '[S].[Basket]');
  assert.ok(logs.some((l) => l.startsWith('DUPLICATE ENTITY | Fact_Basket')));
});

test('semantic scores from embedding sidecars still drive selection', () => {
  const cats = synthetic();
  const v = (i) => Array.from({ length: 8 }, (_, k) => (k === i ? 1 : 0));
  const sidecar = {
    embeddingIndex: true,
    vectors: { Fact_Refund: { embedding: v(3) }, Fact_Order: { embedding: v(1) }, Fact_Staff: { embedding: v(2) } },
  };
  // No keyword matches the question; only the embedding points at Fact_Refund.
  const { json } = build({ catalogs: [...cats, sidecar], groups: ['G'], question: 'zzz qqq', embedding: [v(3)] });
  assert.equal(json.retrieval.semanticUsed, true);
  assert.equal(json.retrieval.scores[0].entity, 'Fact_Refund');
  assert.ok(json.selectedEntities.includes('Fact_Refund'));
});
