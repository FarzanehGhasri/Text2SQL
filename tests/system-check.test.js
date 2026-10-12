// The system checks itself (indexer-watch runs scripts/system-check.js) and writes a plain-language
// report into Obsidian: which questions lost their table and what to add. Nobody has to run tests by hand.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { check, render, fingerprint, upToDate } = require('../scripts/system-check');

const ROOT = path.join(__dirname, '..');

function copyRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'syscheck-'));
  const paths = {
    catalogDir: path.join(tmp, 'catalog'),
    benchmarkDir: path.join(tmp, 'benchmark'),
    code: path.join(ROOT, 'catalog-service', 'text2sql', 'find-tables.js'),
    report: path.join(tmp, 'System check.md'),
  };
  fs.mkdirSync(paths.catalogDir); fs.mkdirSync(paths.benchmarkDir);
  for (const f of fs.readdirSync(path.join(ROOT, 'catalog')).filter((x) => x.endsWith('.json') && !x.includes('embeddings') && x !== 'values.json')) {
    fs.copyFileSync(path.join(ROOT, 'catalog', f), path.join(paths.catalogDir, f));
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'benchmark', '02')).filter((x) => x.endsWith('.json'))) {
    fs.copyFileSync(path.join(ROOT, 'benchmark', '02', f), path.join(paths.benchmarkDir, f));
  }
  return paths;
}

test('the report says in plain words what passed, which table was missed and what to add', async () => {
  const paths = copyRepo();
  // break one synonym route: the sales question about returned goods loses its table
  const sales = path.join(paths.catalogDir, 'sales.json');
  const cat = JSON.parse(fs.readFileSync(sales, 'utf8'));
  const returned = cat.entities.find((e) => e.name === 'Fact_ReturnedProduct');
  returned.synonyms_fa = []; returned.description_fa = '-';
  fs.writeFileSync(sales, JSON.stringify(cat));

  const r = await check(paths);
  assert.deepEqual(r.errors, []);
  const md = render(r, 'abc');
  assert.match(md, /^type: system-check$/m);
  assert.match(md, /^fingerprint: abc$/m);
  assert.match(md, /Meaning search \(embeddings\): off/);
  assert.match(md, /Questions in catalog wording: \*\*\d+ of 36\*\*/);
  assert.match(md, /needs .*\[\[Fact_ReturnedProduct\]\]/);
  assert.match(md, /synonyms_fa/);
});

test('a broken catalog is reported first, in words', async () => {
  const paths = copyRepo();
  fs.writeFileSync(path.join(paths.catalogDir, 'bom.json'), '{ "domain": "bom", <<<<<<< HEAD');
  const md = render(await check(paths), 'x');
  assert.match(md, /Catalog errors/);
  assert.ok(md.indexOf('Catalog errors') < md.indexOf('Finding the right tables'));
});

test('it runs again only when something it depends on changed', () => {
  const paths = copyRepo();
  const fp = fingerprint(paths, 'embeddings off');
  assert.equal(upToDate(paths, fp), false);                       // no report yet
  fs.writeFileSync(paths.report, render({ errors: [], embedding: 'off', sets: [] }, fp));
  assert.equal(upToDate(paths, fp), true);
  assert.notEqual(fingerprint(paths, 'embeddings on'), fp);       // embeddings came up
  fs.appendFileSync(path.join(paths.benchmarkDir, 'questions.json'), '\n');
  assert.notEqual(fingerprint(paths, 'embeddings off'), fp);      // a benchmark file changed
});

test('a mistake in a catalog note is reported first, with a link to the note', () => {
  const md = render({ noteErrors: [{ note: 'sales/Fact_ReturnedProduct.md', message: 'column Date: Show must be yes, hidden or review' }],
    errors: [], embedding: 'off', sets: [] }, 'x');
  assert.match(md, /NOT reached the model yet/);
  assert.match(md, /- \[\[Fact_ReturnedProduct\]\]: column Date: Show must be/);
});
