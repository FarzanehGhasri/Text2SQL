const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateCatalogs } = require('../scripts/lib/catalog-validator');
const { parseCreateTables, loadSchemaFile } = require('../scripts/lib/sql-schema-parser');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');

// A minimal, valid two-domain setup with a shared dimension catalog.
function fixture() {
  return [
    {
      file: 'common.json',
      data: {
        domain: 'common', shared: true, description_fa: 'مشترک', hints_fa: [],
        permissions: { 'NLSQL-Full': ['*'], 'NLSQL-sales': ['*'] },
        entities: [{
          name: 'Dim_Unit', kind: 'table', source: '[dbo].[Dim_Unit]', synonyms_fa: ['واحد'],
          columns: [{ name: 'Unit_key', type: 'int' }, { name: 'Name', type: 'nvarchar' }],
        }],
        joins: [], examples: [],
      },
    },
    {
      file: 'sales.json',
      data: {
        domain: 'sales', description_fa: 'فروش', hints_fa: ['h', { text: 'scoped', entities: ['Fact_Sales'] }],
        permissions: { 'NLSQL-Full': ['*'], 'NLSQL-sales': ['*'] },
        entities: [{
          name: 'Fact_Sales', kind: 'table', source: '[dbo].[Fact_Sales]', core: true, synonyms_fa: ['فروش'],
          columns: [{ name: 'Unit_Key', type: 'int' }, { name: 'Amount', type: 'decimal' }, { name: 'Secret', type: 'int', exposed: false }],
        }],
        joins: [{ from: 'Fact_Sales', from_column: 'Unit_Key', to: 'Dim_Unit', to_column: 'Unit_key', type: 'INNER' }],
        examples: [{ q: 'q', sql: 'SELECT SUM([Fact_Sales].[Amount]) FROM [Fact_Sales] INNER JOIN [Dim_Unit] ON [Fact_Sales].[Unit_Key] = [Dim_Unit].[Unit_key]' }],
      },
    },
  ];
}

const rulesOf = (res) => res.errors.map((e) => e.rule);

test('a valid catalog set has no errors or warnings', () => {
  const res = validateCatalogs(fixture());
  assert.deepEqual(res.errors, []);
  assert.deepEqual(res.warnings, []);
});

test('duplicate entity names across files are an error, case-insensitively', () => {
  const cats = fixture();
  cats[1].data.entities.push({ name: 'dim_unit', source: '[dbo].[X]', columns: [{ name: 'a' }], synonyms_fa: ['x'] });
  assert.ok(rulesOf(validateCatalogs(cats)).includes('unique-names'));
});

test('joins to a missing entity, missing column or hidden column are errors', () => {
  for (const bad of [
    { to: 'Dim_Nope' },
    { to_column: 'Nope' },
    { from_column: 'Secret' },
  ]) {
    const cats = fixture();
    Object.assign(cats[1].data.joins[0], bad);
    assert.ok(rulesOf(validateCatalogs(cats)).includes('joins'), JSON.stringify(bad));
  }
});

test('a join into another non-shared domain is a warning, into a shared one is fine', () => {
  const cats = fixture();
  cats[0].data.shared = false;
  cats[0].data.domain = 'units';
  const res = validateCatalogs(cats);
  assert.equal(res.errors.length, 0);
  assert.ok(res.warnings.some((w) => w.rule === 'joins' && /crosses into domain "units"/.test(w.message)));
});

test('examples referencing unknown entities, unknown or hidden columns are errors', () => {
  for (const sql of [
    'SELECT * FROM [Dim_Supplier]',
    'SELECT [Fact_Sales].[Nope] FROM [Fact_Sales]',
    'SELECT [Fact_Sales].[Secret] FROM [Fact_Sales]',
  ]) {
    const cats = fixture();
    cats[1].data.examples = [{ q: 'q', sql }];
    assert.ok(rulesOf(validateCatalogs(cats)).includes('examples'), sql);
  }
});

test('entity shape: bad name, bad source, virtual without sql', () => {
  for (const patch of [{ name: 'Fact Sales' }, { source: 'dbo.Fact_Sales' }, { kind: 'virtual', sql: undefined }]) {
    const cats = fixture();
    Object.assign(cats[1].data.entities[0], patch);
    assert.ok(rulesOf(validateCatalogs(cats)).includes('entity-shape'), JSON.stringify(patch));
  }
});

test('three-part source names are accepted', () => {
  const cats = fixture();
  cats[1].data.entities[0].source = '[SA_DataWarehouse].[dbo].[Fact_Sales]';
  assert.deepEqual(validateCatalogs(cats).errors, []);
});

test('core rules: at most one core, none in a shared catalog', () => {
  let cats = fixture();
  cats[1].data.entities.push({ name: 'Fact_Two', source: '[dbo].[T]', core: true, columns: [{ name: 'a' }], synonyms_fa: ['x'] });
  assert.ok(rulesOf(validateCatalogs(cats)).includes('core'));
  cats = fixture();
  cats[0].data.entities[0].core = true;
  assert.ok(rulesOf(validateCatalogs(cats)).includes('core'));
});

test('permissions must reference real entities; empty permissions are an error', () => {
  let cats = fixture();
  cats[1].data.permissions['NLSQL-x'] = ['Nope'];
  assert.ok(rulesOf(validateCatalogs(cats)).includes('permissions'));
  cats = fixture();
  cats[1].data.permissions = {};
  assert.ok(rulesOf(validateCatalogs(cats)).includes('catalog-shape'));
});

test('scoped hints must name real entities', () => {
  const cats = fixture();
  cats[1].data.hints_fa.push({ text: 't', entities: ['Nope'] });
  assert.ok(rulesOf(validateCatalogs(cats)).includes('hints'));
});

test('review flags and missing synonyms are warnings only', () => {
  const cats = fixture();
  cats[1].data.entities[0].columns[1].review = true;
  cats[1].data.entities[0].synonyms_fa = [];
  const res = validateCatalogs(cats);
  assert.equal(res.errors.length, 0);
  assert.deepEqual(res.warnings.map((w) => w.rule).sort(), ['review', 'synonyms']);
});

test('database schema check: missing table/column are errors, type drift is a warning', () => {
  const schema = parseCreateTables([
    'CREATE TABLE [dbo].[Dim_Unit](',
    '\t[Unit_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,',
    '\t[Name] [nvarchar](50) NULL,',
    ' CONSTRAINT [PK_Dim_Unit] PRIMARY KEY CLUSTERED ',
    '(',
    '\t[Unit_key] ASC',
    ')WITH (PAD_INDEX = OFF) ON [PRIMARY]',
    ') ON [PRIMARY]',
    'GO',
  ].join('\r\n'));
  assert.deepEqual(Object.keys(schema), ['[dbo].[dim_unit]']);
  assert.deepEqual(Object.keys(schema['[dbo].[dim_unit]'].columns), ['unit_key', 'name']);

  const res = validateCatalogs(fixture(), { schema });
  const db = res.findings.filter((f) => f.rule === 'db-schema');
  assert.ok(db.some((f) => f.severity === 'error' && /\[dbo\]\.\[Fact_Sales\] does not exist/.test(f.message)));
  assert.ok(db.some((f) => f.severity === 'warning' && /Dim_Unit\.Unit_key: catalog type int/.test(f.message)));
});

test('schema files saved by SSMS as UTF-16 LE are read correctly', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-'));
  const file = path.join(dir, 's.sql');
  const text = 'CREATE TABLE [HR].[T](\r\n\t[A] [int] NULL\r\n) ON [PRIMARY]\r\n';
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
  assert.deepEqual(Object.keys(loadSchemaFile(file)), ['[hr].[t]']);
});

test('loader skips embedding sidecars and non-catalog JSON, reports broken JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-'));
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ domain: 'a', entities: [] }));
  fs.writeFileSync(path.join(dir, 'a.embeddings.json'), JSON.stringify({ entities: [] }));
  fs.writeFileSync(path.join(dir, 'other.json'), JSON.stringify({ foo: 1 }));
  fs.writeFileSync(path.join(dir, 'broken.json'), '{');
  const got = loadCatalogs(dir).map((c) => [c.file, Boolean(c.parseError)]);
  assert.deepEqual(got, [['a.json', false], ['broken.json', true]]);
});

test('the real catalog/ directory has no validation errors', () => {
  const res = validateCatalogs(loadCatalogs(path.join(__dirname, '..', 'catalog')));
  assert.deepEqual(res.errors.map((e) => `${e.file}: ${e.message}`), []);
});
