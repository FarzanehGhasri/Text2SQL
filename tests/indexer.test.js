const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { run } = require('../scripts/index-catalog-embeddings');
const { createEmbedClient } = require('../scripts/lib/embed-client');
const { tableCardText, columnText } = require('../scripts/lib/catalog-texts');
const { runCodeNode, runBuildPrompt } = require('../scripts/lib/n8n-code-runner');

const DIM = 8;
// Deterministic fake embedding: the same text always gets the same unit-ish vector.
const fakeVector = (text) => {
  const h = crypto.createHash('sha256').update(text).digest();
  return Array.from({ length: DIM }, (_, i) => (h[i] - 128) / 128);
};

// A fake text-embeddings-inference server; records every request body.
async function startFakeTei({ failWith } = {}) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const { inputs } = JSON.parse(body);
      calls.push(inputs);
      if (failWith) { res.writeHead(failWith); res.end('boom'); return; }
      const texts = Array.isArray(inputs) ? inputs : [inputs];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(texts.map(fakeVector)));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/embed`;
  return { url, calls, close: () => new Promise((r) => server.close(r)) };
}

const col = (name, extra = {}) => ({ name, type: 'int', description_fa: `ستون ${name}`, ...extra });
function writeCatalogs(dir) {
  const sales = {
    domain: 'sales', description_fa: 'فروش', hints_fa: [], permissions: { G: ['*'] },
    entities: [
      { name: 'Fact_Sales', kind: 'table', source: '[dbo].[Fact_Sales]', core: true, synonyms_fa: ['فروش'], description_fa: 'اقلام فروش',
        columns: [col('Amount'), col('Unit_Key'), col('Secret', { exposed: false })] },
      { name: 'Dim_Unit', kind: 'table', source: '[dbo].[Dim_Unit]', synonyms_fa: ['واحد'], description_fa: 'واحدها', columns: [col('Unit_Key'), col('Title')] },
    ],
    joins: [{ from: 'Fact_Sales', from_column: 'Unit_Key', to: 'Dim_Unit', to_column: 'Unit_Key' }],
    examples: [],
  };
  const hr = {
    domain: 'hr', description_fa: 'منابع انسانی', hints_fa: [], permissions: { G: ['*'] },
    entities: [{ name: 'Fact_Employee', kind: 'table', source: '[HR].[Fact_Employee]', core: true, synonyms_fa: ['کارمند'], description_fa: 'کارکنان', columns: [col('Age')] }],
    joins: [], examples: [],
  };
  fs.writeFileSync(path.join(dir, 'sales.json'), JSON.stringify(sales, null, 2));
  fs.writeFileSync(path.join(dir, 'hr.json'), JSON.stringify(hr, null, 2));
  return { sales, hr };
}

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'idx-'));
const read = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const quiet = () => {};

test('embed client batches texts and validates the response shape', async () => {
  const tei = await startFakeTei();
  try {
    const client = createEmbedClient(tei.url, { batchSize: 2 });
    const vecs = await client.embedMany(['a', 'b', 'c']);
    assert.equal(vecs.length, 3);
    assert.deepEqual(tei.calls, [['a', 'b'], ['c']]);
    assert.deepEqual(vecs[2], fakeVector('c'));
  } finally { await tei.close(); }
});

test('first run embeds everything in batches and writes BuildPrompt-compatible sidecars', async () => {
  const dir = tmpDir();
  writeCatalogs(dir);
  const tei = await startFakeTei();
  try {
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 3 }, { log: quiet });
    assert.deepEqual(s.indexed.sort(), ['hr.json', 'sales.json']);
    // sales: 2 table cards + Amount + Title = 4 texts -> 2 calls of 3; hr: card + Age -> 1 call.
    // Unit_Key is a key column and Secret is hidden: neither gets a vector.
    assert.equal(tei.calls.length, 3);
    assert.ok(tei.calls.every((c) => Array.isArray(c) && c.length <= 3));
    assert.ok(!tei.calls.flat().some((t) => t.startsWith('Secret') || t.startsWith('Unit_Key')));

    const sc = read(dir, 'sales.embeddings.json');
    assert.equal(sc.embeddingIndex, true);
    assert.equal(sc.formatVersion, 3);
    assert.equal(sc.dim, DIM);
    assert.deepEqual(Object.keys(sc.vectors.Fact_Sales.columns), ['Amount']);
    // the table card lists the distinctive columns; values rounded to 5 decimals
    const unit = { name: 'Dim_Unit', description_fa: 'واحدها', synonyms_fa: ['واحد'], columns: [col('Unit_Key'), col('Title')] };
    assert.equal(tableCardText(unit, new Set()), 'Dim_Unit — واحدها — واحد — ستون‌ها: ستون Title');
    assert.ok(tei.calls.flat().includes(columnText(col('Title'), unit)));
    assert.match(columnText(col('Title'), unit), /جدول: واحدها$/);
    const expected = fakeVector(tableCardText(unit, new Set()));
    sc.vectors.Dim_Unit.embedding.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < 1e-5));

    // BuildPrompt reads these sidecars as-is and ranks by them.
    const cats = ['sales.json', 'hr.json', 'sales.embeddings.json', 'hr.embeddings.json'].map((f) => read(dir, f));
    const { json } = runBuildPrompt({
      inputs: cats,
      nodes: { 'Embed Question': [expected], AuthCheck: { groups: ['G'] }, Webhook: { body: { question: 'zzz' } } },
    });
    assert.equal(json.retrieval.semanticUsed, true);
    assert.equal(json.retrieval.scores[0].entity, 'Dim_Unit');
  } finally { await tei.close(); }
});

test('an unchanged catalog is skipped; one changed text re-embeds only that text', async () => {
  const dir = tmpDir();
  const { sales } = writeCatalogs(dir);
  const tei = await startFakeTei();
  try {
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    tei.calls.length = 0;

    let s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.skipped.sort(), ['hr.json', 'sales.json']);
    assert.equal(tei.calls.length, 0);

    sales.entities[1].synonyms_fa.push('واحد شمارش');
    fs.writeFileSync(path.join(dir, 'sales.json'), JSON.stringify(sales, null, 2));
    s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.indexed, ['sales.json']);
    assert.deepEqual(tei.calls, [['Dim_Unit — واحدها — واحد — واحد شمارش — ستون‌ها: ستون Title']]);
  } finally { await tei.close(); }
});

test('moving an entity to another catalog file reuses its vectors', async () => {
  const dir = tmpDir();
  const { sales } = writeCatalogs(dir);
  const tei = await startFakeTei();
  try {
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    tei.calls.length = 0;
    const unit = sales.entities.pop();
    fs.writeFileSync(path.join(dir, 'sales.json'), JSON.stringify(sales, null, 2));
    fs.writeFileSync(path.join(dir, 'common.json'), JSON.stringify({
      domain: 'common', shared: true, hints_fa: [], permissions: { G: ['*'] }, entities: [unit], joins: [], examples: [],
    }, null, 2));
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.indexed.sort(), ['common.json', 'sales.json']);
    assert.equal(tei.calls.length, 0);
    assert.ok(read(dir, 'common.embeddings.json').vectors.Dim_Unit.columns.Title);
  } finally { await tei.close(); }
});

test('a sidecar written by an older format is rebuilt, not trusted', async () => {
  const dir = tmpDir();
  writeCatalogs(dir);
  fs.unlinkSync(path.join(dir, 'sales.json'));
  const old = {
    embeddingIndex: true, formatVersion: 2, sourceFile: 'hr.json', contentHash: 'x', dim: DIM,
    vectors: { Fact_Employee: { embedding: fakeVector('x'), columns: { Age: { embedding: fakeVector('y') } } } },
  };
  fs.writeFileSync(path.join(dir, 'hr.embeddings.json'), JSON.stringify(old));
  const tei = await startFakeTei();
  try {
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.indexed, ['hr.json']);
    assert.equal(tei.calls.flat().length, 2); // card + Age, embedded with the new recipe
    const sc = read(dir, 'hr.embeddings.json');
    assert.equal(sc.formatVersion, 3);
    assert.ok(sc.itemsHash);
  } finally { await tei.close(); }
});

test('generic columns get no vector, and a change elsewhere that makes one generic rebuilds this catalog', async () => {
  const dir = tmpDir();
  const { sales, hr } = writeCatalogs(dir);
  // «شرح» on Fact_Sales + Dim_Unit (2 tables): still distinctive
  sales.entities[0].columns.push(col('Note', { description_fa: 'شرح' }));
  sales.entities[1].columns.push(col('Note', { description_fa: 'شرح' }));
  fs.writeFileSync(path.join(dir, 'sales.json'), JSON.stringify(sales, null, 2));
  const tei = await startFakeTei();
  try {
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.ok(read(dir, 'sales.embeddings.json').vectors.Fact_Sales.columns.Note);

    // hr.json now also uses «شرح» -> 3 tables -> generic; sales.json content did not change
    hr.entities[0].columns.push(col('Note', { description_fa: 'شرح' }));
    fs.writeFileSync(path.join(dir, 'hr.json'), JSON.stringify(hr, null, 2));
    tei.calls.length = 0;
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    // sales.json is rebuilt although its file did not change: Note lost its vector.
    // hr.json's new column is generic from the start, so hr's texts did not change: skipped.
    assert.deepEqual(s.indexed, ['sales.json']);
    assert.deepEqual(s.skipped, ['hr.json']);
    // «شرح» also leaves both sales table cards, so exactly those two cards are re-embedded
    assert.deepEqual(tei.calls.flat().sort(), [
      'Dim_Unit — واحدها — واحد — ستون‌ها: ستون Title',
      'Fact_Sales — اقلام فروش — فروش — ستون‌ها: ستون Amount',
    ]);
    const sc = read(dir, 'sales.embeddings.json');
    assert.equal(sc.vectors.Fact_Sales.columns.Note, undefined);
    assert.equal(read(dir, 'hr.embeddings.json').vectors.Fact_Employee.columns.Note, undefined);
    assert.ok(!tei.calls.flat().some((t) => t.includes('ستون‌ها:') && t.includes('شرح')), 'generic descriptions stay out of table cards');
  } finally { await tei.close(); }
});

test('--force re-embeds everything', async () => {
  const dir = tmpDir();
  writeCatalogs(dir);
  const tei = await startFakeTei();
  try {
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    tei.calls.length = 0;
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32, force: true }, { log: quiet });
    // 3 table cards + Amount, Title, Age
    assert.equal(tei.calls.flat().length, 6);
    assert.equal(Object.keys(read(dir, 'sales.embeddings.json').vectors.Fact_Sales.columns).length, 1);
  } finally { await tei.close(); }
});

test('an invalid catalog is not indexed and its old sidecar is kept', async () => {
  const dir = tmpDir();
  const { sales } = writeCatalogs(dir);
  const tei = await startFakeTei();
  try {
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    const before = fs.readFileSync(path.join(dir, 'sales.embeddings.json'), 'utf8');
    sales.joins[0].to = 'Dim_Missing';
    fs.writeFileSync(path.join(dir, 'sales.json'), JSON.stringify(sales, null, 2));
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.invalid, ['sales.json']);
    assert.equal(fs.readFileSync(path.join(dir, 'sales.embeddings.json'), 'utf8'), before);
  } finally { await tei.close(); }
});

test('sidecars of deleted catalogs are removed', async () => {
  const dir = tmpDir();
  writeCatalogs(dir);
  fs.writeFileSync(path.join(dir, 'adventureworks.embeddings.json'), JSON.stringify({ embeddingIndex: true, vectors: {} }));
  const tei = await startFakeTei();
  try {
    await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.ok(!fs.existsSync(path.join(dir, 'adventureworks.embeddings.json')));
    assert.ok(fs.existsSync(path.join(dir, 'sales.embeddings.json')));
  } finally { await tei.close(); }
});

test('an embeddings service error fails that catalog without writing a sidecar', async () => {
  const dir = tmpDir();
  writeCatalogs(dir);
  const tei = await startFakeTei({ failWith: 503 });
  try {
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.failed.sort(), ['hr.json', 'sales.json']);
    assert.ok(!fs.existsSync(path.join(dir, 'sales.embeddings.json')));
  } finally { await tei.close(); }
});

// ---------- example index (Step 3): one vector per example question ----------
test('example questions (catalog examples + query bank) are indexed, reused, and read by BuildPrompt', async () => {
  const dir = tmpDir();
  const { sales } = writeCatalogs(dir);
  sales.examples = [{ q: 'جمع فروش', sql: 'SELECT SUM([Fact_Sales].[Amount]) AS [T] FROM [Fact_Sales]' }];
  fs.writeFileSync(path.join(dir, 'sales.json'), JSON.stringify(sales, null, 2));
  const bank = { queryBank: true, examples: [
    { id: 'b1', q: 'فروش هر واحد', sql: 'SELECT [Dim_Unit].[Title], SUM([Fact_Sales].[Amount]) AS [T] FROM [Fact_Sales] INNER JOIN [Dim_Unit] ON [Fact_Sales].[Unit_Key] = [Dim_Unit].[Unit_Key] GROUP BY [Dim_Unit].[Title]', status: 'draft' },
  ] };
  fs.writeFileSync(path.join(dir, 'query_bank.json'), JSON.stringify(bank, null, 2));
  const tei = await startFakeTei();
  try {
    let s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.equal(s.examples.status, 'indexed');
    const idx = read(dir, 'query_bank.embeddings.json');
    assert.equal(idx.exampleIndex, true);
    assert.equal(idx.embeddingIndex, undefined, 'must not be read as an entity index');
    assert.deepEqual(Object.keys(idx.vectors).sort(), ['جمع فروش', 'فروش هر واحد'].sort());

    // unchanged -> no calls; a new bank example -> only its question is embedded
    tei.calls.length = 0;
    s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.equal(s.examples.status, 'skipped');
    assert.equal(tei.calls.length, 0);
    bank.examples.push({ ...bank.examples[0], id: 'b2', q: 'فروش واحدها' });
    fs.writeFileSync(path.join(dir, 'query_bank.json'), JSON.stringify(bank, null, 2));
    s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.equal(s.examples.status, 'indexed');
    assert.deepEqual(tei.calls, [['فروش واحدها']]);

    // BuildPrompt ranks by these vectors: the question's own vector equals b2's
    const files = ['sales.json', 'hr.json', 'query_bank.json', 'query_bank.embeddings.json'].map((f) => read(dir, f));
    const { json } = runBuildPrompt({
      inputs: files,
      nodes: { 'Embed Question': [fakeVector('فروش واحدها')], AuthCheck: { groups: ['G'] }, Webhook: { body: { question: 'فروش' } } },
    });
    assert.equal(json.retrieval.examples[0].id, 'b2');

    // an invalid bank keeps the old index; the orphan sweep never deletes it
    const before = fs.readFileSync(path.join(dir, 'query_bank.embeddings.json'), 'utf8');
    bank.examples.push({ id: 'b3', q: 'x', sql: 'SELECT * FROM [Nope]' });
    fs.writeFileSync(path.join(dir, 'query_bank.json'), JSON.stringify(bank, null, 2));
    s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.equal(s.examples.status, 'invalid');
    assert.equal(fs.readFileSync(path.join(dir, 'query_bank.embeddings.json'), 'utf8'), before);
  } finally { await tei.close(); }
});
