// The catalog lives in Obsidian: obsidian/Catalog notes -> scripts/obsidian-to-catalog.js -> catalog/*.json -> n8n.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { toNotes, fromNotes } = require('../scripts/lib/catalog-notes');
const { build, write, readNotes } = require('../scripts/obsidian-to-catalog');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { runBuildPrompt } = require('../scripts/lib/n8n-code-runner');

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'catalog');
const catalogs = () => loadCatalogs(CATALOG).map((c) => c.data);

test('notes -> catalog -> notes loses nothing, for every catalog', () => {
  const notes = toNotes(catalogs(), ['قانون یک', 'rule two']);
  const back = fromNotes(notes);
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.rules, ['قانون یک', 'rule two']);
  for (const c of catalogs()) {
    const got = back.catalogs.find((x) => x.domain === c.domain).data;
    assert.equal(JSON.stringify(got), JSON.stringify(c), `${c.domain}: same content and key order`);
  }
  assert.deepEqual(toNotes(back.catalogs.map((c) => c.data), back.rules), notes);
});

test('catalog/*.json is exactly what the Obsidian notes say (run: node scripts/obsidian-to-catalog.js)', () => {
  const r = build();
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.changed, [], `catalog/ differs from obsidian/Catalog: ${r.changed.join(', ')}`);
  assert.deepEqual(r.orphans, []);
});

// a temp copy of the notes + catalog folder to edit
function sandbox() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-'));
  const paths = { notesDir: path.join(tmp, 'Catalog'), catalogDir: path.join(tmp, 'catalog') };
  for (const [rel, text] of Object.entries(readNotes(path.join(ROOT, 'obsidian', 'Catalog')))) {
    fs.mkdirSync(path.dirname(path.join(paths.notesDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(paths.notesDir, rel), text);
  }
  fs.mkdirSync(paths.catalogDir);
  for (const f of fs.readdirSync(CATALOG).filter((x) => x.endsWith('.json') && !x.includes('embeddings') && x !== 'values.json')) {
    fs.copyFileSync(path.join(CATALOG, f), path.join(paths.catalogDir, f));
  }
  const edit = (rel, fn) => { const p = path.join(paths.notesDir, rel); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
  const json = (f) => JSON.parse(fs.readFileSync(path.join(paths.catalogDir, f), 'utf8'));
  return { paths, edit, json };
}

test('an edit made in Obsidian reaches the catalog (also the way the Properties editor writes lists)', () => {
  const { paths, edit, json } = sandbox();
  // Properties editor style: block list, no quotes
  edit('sales/Fact_ReturnedProduct.md', (t) => t.replace('  - "برگشتی"', '  - برگشتی\n  - کالای پس‌آورده'));
  // a column hidden from the model, a new domain rule, a new metric synonym
  edit('sales/Fact_ReturnedProduct.md', (t) => t.replace('| `Date` | datetime | تاریخ | yes |', '| `Date` | datetime | تاریخ | hidden |'));
  edit('sales/sales.md', (t) => t.replace('## Rules for the model\n', '## Rules for the model\n- قانون تازه\n')
    .replace('- Also called: مبلغ برگشتی، مرجوعی', '- Also called: مبلغ برگشتی، مرجوعی، پس‌آورده'));
  edit('Rules for every question.md', (t) => t.replace('_none yet_', '- Amounts are in Rial.'));
  const r = build(paths);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.changed.sort(), ['rules.json', 'sales.json']);
  write(paths, r);
  const sales = json('sales.json');
  const ret = sales.entities.find((e) => e.name === 'Fact_ReturnedProduct');
  assert.deepEqual(ret.synonyms_fa.slice(-2), ['برگشتی', 'کالای پس‌آورده']);
  assert.equal(ret.columns.find((c) => c.name === 'Date').exposed, false);
  assert.equal(sales.hints_fa[0], 'قانون تازه');
  assert.ok(sales.metrics.find((m) => m.name_fa === 'برگشت از فروش').synonyms_fa.includes('پس‌آورده'));
  assert.deepEqual(json('rules.json'), { globalRules: true, rules: ['Amounts are in Rial.'] });

  // and the model gets it: the new word finds the table, the rules are in the prompt, the hidden column is not
  const inputs = loadCatalogs(paths.catalogDir).map((c) => c.data).concat([json('rules.json')]);
  const { json: out } = runBuildPrompt({ inputs, nodes: { 'Embed Question': {}, AuthCheck: { groups: ['NLSQL-sales'] },
    Webhook: { body: { question: 'کالای پس‌آورده ماه گذشته' } } } });
  assert.ok(out.selectedEntities.includes('Fact_ReturnedProduct'));
  assert.match(out.body.string2, /^- Amounts are in Rial\.$/m);
  assert.match(out.body.string2, /^- قانون تازه$/m);
  assert.ok(!out.entityDefs.Fact_ReturnedProduct.columns.some((c) => c.name === 'Date'));
});

test('a mistake in a note blocks the update and says which note; the last good catalog stays', () => {
  const cases = [
    ['sales/Fact_ReturnedProduct.md', (t) => t.replace('| `Date` | datetime | تاریخ | yes |', '| `Date` | datetime | تاریخ | maybe |'), /Show must be/],
    ['sales/Fact_ReturnedProduct.md', (t) => t.replace('→ [[Dim_Product]] `Product_key`', 'to Dim_Product'), /cannot read the link/],
    ['sales/sales.md', (t) => t.replace('- [[Fact_ReturnedProduct]]\n', ''), /not listed under "## Tables"/],
    ['sales/sales.md', (t) => t.replace('- [[Fact_Sales]]\n', '- [[Fact_Sales]]\n- [[Fact_Nothing]]\n'), /no table note named Fact_Nothing/],
    ['sales/sales.md', (t) => t.replace('- Formula: `SUM([Fact_Vosouli].[Amount])`', '- Formula: `SUM([Fact_Nope].[Amount])`'), /Fact_Nope/],
  ];
  for (const [rel, fn, message] of cases) {
    const { paths, edit } = sandbox();
    const before = fs.readFileSync(path.join(paths.catalogDir, 'sales.json'), 'utf8');
    edit(rel, fn);
    const r = build(paths);
    assert.ok(r.errors.some((e) => message.test(e.message)), `${message}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.errors.every((e) => e.note.endsWith('.md')));
    assert.equal(fs.readFileSync(path.join(paths.catalogDir, 'sales.json'), 'utf8'), before);
  }
});

test('with no global rules the prompt is unchanged', () => {
  const nodes = { 'Embed Question': {}, AuthCheck: { groups: ['NLSQL-Full'] }, Webhook: { body: { question: 'فروش خالص هر دفتر' } } };
  const withFile = runBuildPrompt({ inputs: catalogs().concat([{ globalRules: true, rules: [] }]), nodes }).json;
  const without = runBuildPrompt({ inputs: catalogs(), nodes }).json;
  assert.equal(withFile.body.string2, without.body.string2);
});
