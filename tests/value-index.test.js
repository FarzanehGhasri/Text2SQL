// Step 2: value retrieval - stored values named in the question reach the prompt.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runCodeNode } = require('../scripts/lib/n8n-code-runner');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { valueColumns } = require('../scripts/lib/value-columns');
const { buildIndex } = require('../scripts/build-value-index');
const { generate, OUT } = require('../scripts/generate-value-sql');

const CATALOGS = loadCatalogs(path.join(__dirname, '..', 'catalog')).map((c) => c.data);

// A small fake export of sql/extract_values.sql
const customers = Array.from({ length: 30 }, (_, i) => ({ entity: 'Dim_Customer', column: 'CustomerName', value: `شرکت نمونه ${i}`, rows: 1 }));
const ROWS = [
  { entity: 'Dim_State', column: 'StateName', value: 'ثبت شده', rows: 10, key_value: '1' },
  { entity: 'Dim_State', column: 'StateName', value: 'باطل شده', rows: 4, key_value: '6' },
  { entity: 'Dim_State', column: 'StateName', value: 'مسدود', rows: 2, key_value: '7' },
  { entity: 'Dim_SalesOffice', column: 'Name', value: 'دفتر فروش تهران', rows: 1, key_value: '12' },
  { entity: 'Dim_SalesOffice', column: 'Name', value: 'دفتر فروش تبریز', rows: 1, key_value: '13' },
  { entity: 'Dim_Customer', column: 'CustomerName', value: 'پخش البرز تهران', rows: 3 },
  { entity: 'Dim_Customer', column: 'CustomerName', value: 'تهران پارس', rows: 9 },
  ...customers,
  { entity: 'Dim_Department', column: 'Description', value: 'واحد مالی', rows: 1, key_value: '3' },
];
const INDEX = buildIndex(ROWS, CATALOGS).index;

function build({ question, groups = ['NLSQL-Full'], index = INDEX }) {
  return runCodeNode('BuildPrompt', {
    inputs: [...CATALOGS, index],
    nodes: { 'Embed Question': {}, AuthCheck: { groups, email: 't@x' }, Webhook: { body: { question } } },
  });
}

test('index builder trims, merges, sorts, keeps key names and drops non-catalog columns', () => {
  const { index, dropped } = buildIndex([
    { entity: 'Sales_Dim_Currency', column: 'Title', value: 'ریال   ', rows: '5', key_value: '1' },
    { entity: 'Sales_Dim_Currency', column: 'Title', value: 'ریال', rows: '2', key_value: '1' },
    { entity: 'Sales_Dim_Currency', column: 'Title', value: 'دلار', rows: '9', key_value: '2' },
    { entity: 'Nope', column: 'X', value: 'a', rows: 1 },
  ], CATALOGS);
  const cur = index.columns.find((c) => c.entity === 'Sales_Dim_Currency');
  assert.deepEqual(cur.values, [['دلار', 9, '2'], ['ریال', 7, '1']]);
  assert.equal(cur.key, 'Currency_Key');
  assert.deepEqual(dropped, ['Nope.X']);
  assert.equal(index.valueIndex, true);
});

test('value columns: names and statuses yes; codes, numbers, dates and free text no', () => {
  const cols = new Set(valueColumns(CATALOGS).map((v) => `${v.entity}.${v.column}`));
  for (const c of ['Dim_State.StateName', 'Dim_SalesOffice.Name', 'Dim_Customer.CustomerName', 'Fact_CashFlow.BankName', 'Dim_Department.Description']) {
    assert.ok(cols.has(c), c);
  }
  for (const c of ['Dim_Customer.CustomerNumber', 'Dim_SalesOffice.SalesOfficeCode', 'Fact_Employee.NationalCode', 'Fact_Voucher.Description', 'Fact_ntsw.PersianDateStr', 'Fact_ntsw.State']) {
    assert.ok(!cols.has(c), c);
  }
  assert.equal(valueColumns(CATALOGS).find((v) => v.entity === 'Dim_State').key, 'State_Key');
});

test('sql/extract_values.sql is generated from the current catalogs', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), generate(loadCatalogs(path.join(__dirname, '..', 'catalog'))), 'run: node scripts/generate-value-sql.js');
});

test('a whole stored value in the question reaches the prompt with its key, and pulls in its table', () => {
  const { json, logs } = build({ question: 'تعداد اقلام فروش باطل شده در دفتر فروش تهران' });
  const p = json.body.string2;
  assert.match(p, /VALUES FROM THE QUESTION/);
  assert.match(p, /- \[Dim_State\]\.\[StateName\] = N'باطل شده'  \(key: \[Dim_State\]\.\[State_Key\] = 6\)/);
  assert.match(p, /- \[Dim_SalesOffice\]\.\[Name\] = N'دفتر فروش تهران'  \(key: \[Dim_SalesOffice\]\.\[SalesOffice_key\] = 12\)/);
  assert.ok(json.selectedEntities.includes('Dim_State'));
  assert.ok(json.retrieval.scores.find((s) => s.entity === 'Dim_State').val > 0);
  assert.ok(logs.some((l) => l.startsWith('VALUES |')));
});

test('a phrase found inside many values becomes one LIKE hint with samples', () => {
  const { json } = build({ question: 'فروش مشتریان تهران' });
  const line = json.body.string2.split('\n').find((l) => l.startsWith('- [Dim_Customer].[CustomerName]'));
  assert.ok(line, json.body.string2.slice(0, 3000));
  assert.match(line, /2 stored values contain N'تهران', e\.g\. N'تهران پارس', N'پخش البرز تهران'/);
  assert.match(line, /LIKE N'%تهران%'/);
});

test('a word that appears in many values cannot match alone', () => {
  // «نمونه» is in 30 customer names (> RARE_DF)
  const { json } = build({ question: 'فروش نمونه' });
  assert.ok(!json.retrieval.values.some((v) => v.column === 'CustomerName'));
});

test('values never cross access rights or reach the prompt for hidden columns', () => {
  const beforeQuestion = (p) => p.slice(0, p.lastIndexOf('\nQ: '));
  const { json } = build({ groups: ['NLSQL-hr'], question: 'کارمندان واحد مالی در دفتر فروش تهران' });
  assert.ok(!/دفتر فروش تهران/.test(beforeQuestion(json.body.string2)));
  assert.match(json.body.string2, /\[Dim_Department\]\.\[Description\] = N'واحد مالی'/);

  const ent = CATALOGS.flatMap((c) => c.entities).find((e) => e.columns.some((c) => c.exposed === false));
  const hidden = ent.columns.find((c) => c.exposed === false);
  const rogue = { valueIndex: true, columns: [{ entity: ent.name, column: hidden.name, distinct: 1, values: [['محرمانه ویژه', 1, null]] }] };
  const r = build({ question: 'محرمانه ویژه', index: rogue }).json;
  assert.ok(!/محرمانه ویژه/.test(beforeQuestion(r.body.string2)));
});

test('a value in an out-of-scope question does not make it look answerable', () => {
  const index = buildIndex([{ entity: 'Dim_SalesOffice', column: 'Name', value: 'تهران', rows: 1, key_value: '9' }], CATALOGS).index;
  const { json } = build({ question: 'پیش بینی هوای فردای تهران', index });
  assert.equal(json.retrieval.lowConfidence, true);
});

test('low-cardinality columns show sample values in the DDL', () => {
  const { json } = build({ question: 'تعداد اقلام سفارش فروش به تفکیک وضعیت' });
  assert.match(json.body.string2, /\[StateName\] nvarchar,?\s+-- وضعیت نام; values: N'ثبت شده', N'باطل شده', N'مسدود'/);
});

test('without a value index nothing changes', () => {
  const r = runCodeNode('BuildPrompt', {
    inputs: CATALOGS,
    nodes: { 'Embed Question': {}, AuthCheck: { groups: ['NLSQL-Full'], email: 't@x' }, Webhook: { body: { question: 'فروش باطل شده' } } },
  }).json;
  assert.ok(!/VALUES FROM THE QUESTION/.test(r.body.string2));
  assert.deepEqual(r.retrieval.values, []);
});

test('the index stores the normalised form only when it differs, exactly as BuildPrompt normalises', () => {
  const { index } = buildIndex([
    { entity: 'Dim_SalesOffice', column: 'Name', value: 'دفتر‌های فروش (مرکزی)', rows: 1 },
    { entity: 'Dim_SalesOffice', column: 'Name', value: 'دفتر فروش تبریز', rows: 1 },
  ], CATALOGS);
  const vals = index.columns[0].values;
  assert.deepEqual(vals.find((v) => v[0] === 'دفتر فروش تبریز').length, 3);
  assert.equal(vals.find((v) => v[0].startsWith('دفتر‌های'))[3], 'دفتر فروش مرکزی');
  const src = fs.readFileSync(path.join(__dirname, '..', 'n8n_workflows', 'code', 'BuildPrompt.js'), 'utf8');
  const lib = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-value-index.js'), 'utf8');
  const body = (text) => { const i = text.indexOf('const valueNorm ='); return text.slice(i, text.indexOf(';\n', i)).replace(/\(s\) =>|s =>/, ''); };
  assert.equal(body(lib), body(src));
  // and BuildPrompt matches the stored normalised form
  const { json } = build({ question: 'فروش دفترهای فروش مرکزی', index });
  assert.ok(json.retrieval.values.some((v) => v.exact && v.value === 'دفتر‌های فروش (مرکزی)'));
});

test('words used by an exact match do not also produce partial matches', () => {
  const { json } = build({ question: 'فروش خالص دفتر فروش تهران' });
  // only the VALUES section: the DDL may list both offices as sample values of a 2-value column
  const section = json.body.string2.split('VALUES FROM THE QUESTION')[1].split('\n\n')[0];
  assert.match(section, /\[Dim_SalesOffice\]\.\[Name\] = N'دفتر فروش تهران'/);
  assert.ok(!/دفتر فروش تبریز/.test(section), 'Tabriz must not be offered for a Tehran question');
});

test('a single partial hit is labelled as the closest stored value, not as an exact match', () => {
  const { json } = build({ question: 'فروش مشتری البرز' });
  assert.match(json.body.string2,
    /- \[Dim_Customer\]\.\[CustomerName\]: the only stored value containing N'البرز' is N'پخش البرز تهران'/);
});
