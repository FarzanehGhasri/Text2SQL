const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { run } = require('../scripts/index-catalog-embeddings');
const { createEmbedClient } = require('../scripts/lib/embed-client');
const { entityText } = require('../scripts/lib/catalog-texts');
const { runCodeNode } = require('./helpers/n8n-code-runner');

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
    // sales: 2 entities + 4 exposed columns = 6 texts -> 2 calls of 3; hr: 2 texts -> 1 call
    assert.equal(tei.calls.length, 3);
    assert.ok(tei.calls.every((c) => Array.isArray(c) && c.length <= 3));
    assert.ok(!tei.calls.flat().some((t) => t.startsWith('Secret')), 'hidden column must not be embedded');

    const sc = read(dir, 'sales.embeddings.json');
    assert.equal(sc.embeddingIndex, true);
    assert.equal(sc.formatVersion, 2);
    assert.equal(sc.dim, DIM);
    assert.deepEqual(Object.keys(sc.vectors.Fact_Sales.columns).sort(), ['Amount', 'Unit_Key']);
    // rounded to 5 decimals
    const expected = fakeVector(entityText({ name: 'Dim_Unit', description_fa: 'واحدها', synonyms_fa: ['واحد'] }));
    sc.vectors.Dim_Unit.embedding.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < 1e-5));

    // BuildPrompt reads these sidecars as-is and ranks by them.
    const cats = ['sales.json', 'hr.json', 'sales.embeddings.json', 'hr.embeddings.json'].map((f) => read(dir, f));
    const { json } = runCodeNode('BuildPrompt', {
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
    assert.deepEqual(tei.calls, [['Dim_Unit — واحدها — واحد — واحد شمارش']]);
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

test('a legacy (format 1) sidecar for unchanged content is converted without embedding', async () => {
  const dir = tmpDir();
  const { hr } = writeCatalogs(dir);
  fs.unlinkSync(path.join(dir, 'sales.json'));
  const legacy = {
    embeddingIndex: true, sourceFile: 'hr.json',
    contentHash: crypto.createHash('sha256').update(JSON.stringify(hr)).digest('hex'),
    dim: DIM,
    vectors: { Fact_Employee: { embedding: fakeVector('x'), columns: { Age: { embedding: fakeVector('y') } } } },
  };
  fs.writeFileSync(path.join(dir, 'hr.embeddings.json'), JSON.stringify(legacy, null, 2));
  const tei = await startFakeTei();
  try {
    const s = await run({ catalogDir: dir, embedUrl: tei.url, batchSize: 32 }, { log: quiet });
    assert.deepEqual(s.indexed, ['hr.json']);
    assert.equal(tei.calls.length, 0);
    const sc = read(dir, 'hr.embeddings.json');
    assert.equal(sc.formatVersion, 2);
    assert.ok(sc.vectors.Fact_Employee.textHash);
    assert.ok(Math.abs(sc.vectors.Fact_Employee.columns.Age.embedding[0] - fakeVector('y')[0]) < 1e-5);
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
    // 8 vectors, but Fact_Sales.Unit_Key and Dim_Unit.Unit_Key have identical text: embedded once.
    assert.equal(tei.calls.flat().length, 7);
    assert.equal(Object.keys(read(dir, 'sales.embeddings.json').vectors.Fact_Sales.columns).length, 2);
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
