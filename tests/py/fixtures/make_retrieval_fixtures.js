#!/usr/bin/env node
// Golden cases for the Python port of Find Tables + BuildPrompt: runs the REAL n8n Code nodes on every benchmark
// question (several user groups, with and without fake embedding vectors, with a synthetic value index, with
// global rules) and records the prompt and the retrieval decisions. tests/py/test_retrieval.py replays them.
//
//   node tests/py/fixtures/make_retrieval_fixtures.js     -> tests/py/fixtures/retrieval_cases.json.gz
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..', '..');
const { runBuildPrompt } = require(path.join(ROOT, 'scripts/lib/n8n-code-runner'));
const { loadCatalogs } = require(path.join(ROOT, 'scripts/lib/catalog-loader'));
const { embeddableItems, buildGenericIndex } = require(path.join(ROOT, 'scripts/lib/catalog-texts'));

const FIXED = Date.parse('2026-10-11T08:00:00Z');
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(FIXED); }
  static now() { return FIXED; }
};

const DIM = 32;
const fake = (text) => { const h = crypto.createHash('sha256').update(text).digest(); return Array.from({ length: DIM }, (_, i) => (h[i] - 128) / 128); };

const catalogs = loadCatalogs(path.join(ROOT, 'catalog')).map((c) => c.data);
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog', 'query_bank.json'), 'utf8'));
const generic = buildGenericIndex(catalogs);
const texts = catalogs.flatMap((c) => embeddableItems(c, generic)).map((i) => [i.entity, i.column, i.text]);
const vectors = {};
for (const [entity, column, text] of texts) {
  vectors[entity] = vectors[entity] || { columns: {} };
  if (column === null) vectors[entity].embedding = fake(text); else vectors[entity].columns[column] = { embedding: fake(text) };
}
const exampleQs = [...new Set([...catalogs.flatMap((c) => (c.examples || []).map((e) => e.q)), ...bank.examples.map((e) => e.q)])];
const exampleVectors = Object.fromEntries(exampleQs.map((q) => [q, { embedding: fake(q) }]));
const cardOf = Object.fromEntries(texts.filter((t) => t[1] === null).map((t) => [t[0], t[2]]));

// synthetic values (not real data)
const VALUES = { valueIndex: true, formatVersion: 0, columns: [
  { entity: 'Dim_SalesOffice', column: 'Name', key: 'SalesOffice_key', values: [['دفتر فروش تهران', 900, 1], ['دفتر فروش تبریز', 500, 2], ['دفتر فروش مشهد', 300, 3], ['دفتر فروش اصفهان', 200, 4], ['دفتر مرکزی', 50, 5]] },
  { entity: 'Dim_State', column: 'StateName', key: 'State_Key', values: [['ثبت شده', 100, 1], ['تایید شده', 90, 2], ['باطل شده', 30, 6], ['مسدود', 5, 7]] },
  { entity: 'Dim_Customer', column: 'CustomerName', key: 'Customer_key', values: Array.from({ length: 40 }, (_, i) => [`شرکت نمونه ${i + 1}`, 40 - i, 100 + i]).concat([['شرکت آلفا پارس', 70, 999], ['فروشگاه بتا', 12, 998]]) },
  { entity: 'Dim_Product', column: 'ProductName', key: 'Product_key', values: [['روغن موتور ۵ لیتری', 400, 11], ['روغن ترمز', 300, 12], ['فیلتر روغن', 200, 13], ['لنت ترمز جلو', 150, 14]] },
  { entity: 'Dim_Bank', column: 'BankName', key: 'Bank_Key', values: [['بانک ملت', 80, 1], ['بانک ملی', 70, 2], ['بانک تجارت', 60, 3]] },
  { entity: 'Dim_Unit', column: 'UnitName', key: 'Unit_key', values: [['کیلوگرم', 10, 1], ['عدد', 10, 2], ['لیتر', 10, 3]] },
  { entity: 'Dim_Store', column: 'StoreName', key: 'Store_key', values: [['انبار مرکزی تهران', 20, 1], ['انبار قطعات', 10, 2]] },
] };

const sets = ['questions', 'paraphrase_questions', 'join_path_questions'].flatMap((f) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmark', '02', f + '.json'), 'utf8')).questions.map((q) => q.question));
const valueQuestions = ['فروش دفتر فروش تهران در سال ۱۴۰۳', 'سفارش‌های باطل شده دفتر فروش تبریز', 'خرید شرکت آلفا پارس',
  'فروش روغن موتور ۵ لیتری', 'مانده حساب بانک ملت', 'موجودی انبار مرکزی تهران به کیلوگرم', 'فروش ترمز', 'مشتری شرکت نمونه',
  'فروش دفتر فروش', 'فروشگاه بتا چقدر خرید کرده', 'وضعیت مسدود', 'تراکنش‌های بانک ملی و بانک تجارت', 'هوای تهران فردا'];

const cases = [];
const add = (question, groups, opts = {}) => cases.push({ id: cases.length, question, groups, ...opts });
for (const q of sets) for (const g of [['NLSQL-Full'], ['IT - Security'], ['NLSQL-sales'], ['NLSQL-hr'], ['NLSQL-procurement']]) add(q, g);
for (const q of sets) add(q, ['NLSQL-Full'], { vec: { text: q } });
for (const name of Object.keys(cardOf).filter((_, i) => i % 5 === 0)) add('اطلاعات این بخش را نشان بده', ['NLSQL-Full'], { vec: { text: cardOf[name] } });
for (const q of exampleQs.filter((_, i) => i % 4 === 0)) add(q + ' لطفا', ['NLSQL-Full'], { vec: { text: q } });
for (const q of [...valueQuestions, ...sets.slice(0, 20)]) for (const g of [['NLSQL-Full'], ['NLSQL-sales']]) add(q, g, { values: true });
for (const q of valueQuestions.slice(0, 5)) add(q, ['NLSQL-Full'], { values: true, vec: { text: q } });
for (const q of sets.slice(0, 10)) add(q, ['NLSQL-Full'], { rules: ['Amounts are in Rial.', 'قانون دوم'] });
add('', ['NLSQL-Full']);
add('فروش', []);
add('فروش', ['nlsql-full']);
add('x'.repeat(2000) + ' فروش', ['NLSQL-Full']);

for (const c of cases) {
  const inputs = [...catalogs, bank];
  if (c.vec) inputs.push({ embeddingIndex: true, vectors }, { exampleIndex: true, vectors: exampleVectors });
  if (c.values) inputs.push(VALUES);
  if (c.rules) inputs.push({ globalRules: true, rules: c.rules });
  const nodes = { 'Embed Question': c.vec ? [fake(c.vec.text)] : {}, AuthCheck: { groups: c.groups, email: 't@x' },
    Webhook: { body: { question: c.question } } };
  try {
    const { json, plan } = runBuildPrompt({ inputs, nodes });
    const r = plan.retrieval;
    c.out = {
      prompt: json.body.string2,
      selected: json.selectedEntities,
      planTables: plan.tables.map((t) => t.name),
      entityDefs: json.entityDefs,
      lowConfidence: plan.lowConfidence,
      topScore: r.topScore,
      activeDomains: r.activeDomains,
      joinPathTables: r.joinPathTables,
      exampleLinkedTables: r.exampleLinkedTables,
      why: r.why,
      scores: r.scores,
      examples: plan.examples.map((e) => e.id),
      values: plan.values,
      metrics: plan.metrics.map((m) => m.name_fa),
    };
  } catch (e) {
    c.error = e.message;
  }
}
const out = { dim: DIM, texts, values: VALUES, cases };
fs.writeFileSync(path.join(__dirname, 'retrieval_cases.json.gz'), zlib.gzipSync(JSON.stringify(out)));
console.log(`${cases.length} cases (${cases.filter((c) => c.error).length} errors) -> retrieval_cases.json.gz`);
