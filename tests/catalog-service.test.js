// catalog-service: the search over the Obsidian notes that n8n calls once per question.
//   POST /tables -> the plan for BuildPrompt (Text2SQL)      POST /notes -> an answer from the notes
// Covers the note pieces (whole tables with their joins), the index builder, the notes search, the use cases,
// the file cache, the HTTP adapter, and the n8n side (BuildPrompt refusal, the notes footer, Schema.md).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { readVault, chunkVault, chunkNote, noteAccess, MAX_CHUNK_CHARS } = require('../scripts/lib/vault-notes');
const { tablePieces } = require('../scripts/lib/table-pieces');
const { run, catalogPermissions } = require('../scripts/index-vault-embeddings');
const store = require('../scripts/lib/vault-index-store');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { runCodeNode, runAuthCheck, runBuildPrompt } = require('../scripts/lib/n8n-code-runner');
const { findNotes } = require('../catalog-service/notes/find-notes');
const { notesPrompt, sourcesOf } = require('../catalog-service/notes/notes-prompt');
const { notesAnswer } = require('../catalog-service/notes/notes-answer');
const { createUseCases } = require('../catalog-service/use-cases');
const { createKnowledge } = require('../catalog-service/knowledge');
const { createServer } = require('../catalog-service/server');
const { createEmbedder, createReranker } = require('../catalog-service/clients');
const { semanticModelFile, rerankModelFile } = require('./fixtures/models');

const ROOT = path.join(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'catalog');
const CATALOGS = loadCatalogs(CATALOG_DIR).map((c) => c.data);
const catalogFiles = () => fs.readdirSync(CATALOG_DIR).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, f), 'utf8')));

// deterministic fake embeddings: the same text always gets the same 8-number vector
function fakeVector(text) {
  const h = crypto.createHash('sha256').update(text).digest();
  return [...h.subarray(0, 8)].map((b) => b / 255 - 0.5);
}
function fakeClient({ fail = false } = {}) {
  let requests = 0;
  return {
    async embedMany(texts) { requests++; if (fail) throw new Error('service down'); return texts.map(fakeVector); },
    get requests() { return requests; },
  };
}
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vault-'));

// ---------------------------------------------------------------- the notes as pieces
test('the real vault: no Inbox, no CLAUDE.md, no table note cut up; every piece is small and has a unique id', () => {
  const notes = readVault();
  assert.ok(notes.length > 100);
  assert.ok(!notes.some((n) => n.path.startsWith('Inbox/') || n.path === 'CLAUDE.md'));
  const chunks = chunkVault(notes);
  assert.equal(new Set(chunks.map((c) => c.id)).size, chunks.length);
  assert.ok(!chunks.some((c) => c.access.scope === 'table'), 'tables come whole from table-pieces.js');
  for (const c of chunks) assert.ok(c.text.length <= MAX_CHUNK_CHARS + 400, `${c.id}: ${c.text.length} chars`);
});

test('every table is ONE piece: all columns the model may see, no hidden one, and its joins both ways', () => {
  const pieces = tablePieces(CATALOGS);
  const tables = CATALOGS.flatMap((c) => c.entities);
  assert.equal(pieces.length, tables.length);
  for (const ent of tables) {
    const p = pieces.filter((x) => x.note === ent.name);
    assert.equal(p.length, 1, ent.name);
    for (const col of ent.columns || []) {
      const listed = p[0].text.includes(`\n- ${col.alias ? `${col.alias} (column ${col.name})` : col.name} (`);
      assert.equal(listed, col.exposed !== false, `${ent.name}.${col.name}`);
    }
  }
  // the join the catalog states: [Fact_Purchase].[FiscalYear_Key] -> [Sales_Dim_FiscalYear].[FiscalYear_Key], INNER, inferred
  const line = '- [Fact_Purchase].[FiscalYear_Key] = [Sales_Dim_FiscalYear].[FiscalYear_Key] (INNER JOIN, inferred from the column names)';
  const purchase = pieces.find((p) => p.note === 'Fact_Purchase');
  assert.ok(purchase.text.split('Joins into this table:')[0].includes(line), 'on the table it starts from');
  // ... but the shared dimension does not list a procurement table: an HR-only user may see Sales_Dim_FiscalYear
  assert.ok(!pieces.find((p) => p.note === 'Sales_Dim_FiscalYear').text.includes('[Fact_Purchase]'));
  // a join inside one domain is listed on both of its tables
  const sales = pieces.find((p) => p.note === 'Dim_Customer').text.split('Joins into this table:')[1];
  assert.ok(sales.includes('[Fact_Sales].[Customer_key] = [Dim_Customer].[Customer_key]'));
  assert.deepEqual(purchase.access, { scope: 'table', domain: 'procurement', entity: 'Fact_Purchase' });
});

test('who may see a note is decided by its place and type', () => {
  assert.deepEqual(noteAccess('Home.md'), { scope: 'project' });
  assert.deepEqual(noteAccess('Schema.md', { type: 'generated' }), { scope: 'project' });
  assert.deepEqual(noteAccess('Catalog/sales/sales.md', { type: 'domain', domain: 'sales' }), { scope: 'domain', domain: 'sales' });
  assert.deepEqual(noteAccess('Catalog/Rules for every question.md', { type: 'rules' }), { scope: 'rules' });
  assert.deepEqual(noteAccess('Catalog/sales/notes.md', {}), { scope: 'project' });   // unknown: fail closed
});

test('a note is cut at ## headings (not inside ``` blocks); every piece names its note', () => {
  const text = '---\ntype: domain\ndomain: sales\n---\n> فروش\n\n## Metrics\n### فروش خالص\n- Formula: x\n\n## Examples\n```sql\n## not a heading\nSELECT 1\n```\n';
  const chunks = chunkNote({ path: 'Catalog/sales/sales.md', text });
  assert.deepEqual(chunks.map((c) => c.heading), ['Metrics', 'Examples']);   // the intro is only the description
  for (const c of chunks) assert.ok(c.text.startsWith('sales | domain: sales | فروش'));
  assert.ok(chunks[1].text.includes('## not a heading'));
  assert.deepEqual(chunkNote({ path: 'Catalog/sales/Fact_Sales.md', text: '---\ntype: table\ndomain: sales\n---\n## Columns\n' }), []);
  const long = chunkNote({ path: 'How-to.md', text: `## Big\n${Array.from({ length: 60 }, (_, i) => `line ${i} `.repeat(10)).join('\n\n')}` }, { maxChars: 500 });
  assert.ok(long.length > 5 && long.every((c) => c.text.length <= 600));
  assert.equal(new Set(long.map((c) => c.id)).size, long.length);
});

// ---------------------------------------------------------------- the index
test('indexer: tables + notes + permissions; nothing to do until a note changes; then only that piece', async () => {
  const vault = tmpDir();
  const out = path.join(tmpDir(), 'vault.embeddings.json');
  fs.mkdirSync(path.join(vault, 'Inbox', 'n8n'), { recursive: true });
  fs.writeFileSync(path.join(vault, 'Home.md'), '# Home\n## Status\nall good');
  fs.writeFileSync(path.join(vault, 'Inbox', 'n8n', 'q.md'), 'a real user question');
  const opts = { vaultDir: vault, catalogDir: CATALOG_DIR, out, quiet: true };

  assert.equal((await run(opts, { embedClient: fakeClient(), log: () => {} })).status, 'indexed');
  const idx = store.readIndex(out);
  assert.deepEqual(idx.permissions.sales, catalogPermissions(CATALOG_DIR).sales);
  assert.equal(idx.chunks.filter((c) => c.access.scope === 'table').length, CATALOGS.flatMap((c) => c.entities).length);
  assert.ok(idx.chunks.every((c) => c.embedding.length === 8 && !c.text.includes('real user')));

  const client = fakeClient();
  assert.equal((await run(opts, { embedClient: client, log: () => {} })).status, 'skipped');
  assert.equal(client.requests, 0);

  fs.writeFileSync(path.join(vault, 'Home.md'), '# Home\n## Status\nchanged');
  const third = await run(opts, { embedClient: fakeClient(), log: () => {} });
  assert.deepEqual([third.status, third.embedded], ['indexed', 1]);

  fs.writeFileSync(path.join(vault, 'Home.md'), '# Home\n## Status\nchanged again');
  const before = fs.readFileSync(out, 'utf8');
  assert.equal((await run(opts, { embedClient: fakeClient({ fail: true }), log: () => {} })).status, 'failed');
  assert.equal(fs.readFileSync(out, 'utf8'), before, 'a failed run keeps the previous index');
});

// ---------------------------------------------------------------- notes search
function fixtureIndex() {
  const piece = (p, heading, text, access) => ({ id: `${p}#${heading}`, note: path.basename(p, '.md'), path: p, heading, text, access, embedding: fakeVector(text) });
  return {
    vaultIndex: true, formatVersion: 1, dim: 8,
    permissions: {
      sales: { 'NLSQL-sales': ['*'], 'IT - Data': ['*'] },
      hr: { 'NLSQL-hr': ['*'], 'IT - Data': ['*'] },
      common: { 'NLSQL-sales': ['*'], 'NLSQL-hr': ['Dim_Date'], 'IT - Data': ['*'] },
    },
    chunks: [
      piece('Catalog/sales/Fact_Sales.md', 'Table', 'Fact_Sales | فروش | EffectiveNetPrice فروش خالص', { scope: 'table', domain: 'sales', entity: 'Fact_Sales' }),
      piece('Catalog/sales/sales.md', 'Metrics', 'sales | فروش خالص = SUM(EffectiveNetPrice)', { scope: 'domain', domain: 'sales' }),
      piece('Catalog/hr/Dim_Employee.md', 'Table', 'Dim_Employee | کارمند | حقوق فروش', { scope: 'table', domain: 'hr', entity: 'Dim_Employee' }),
      piece('Catalog/common/Dim_Date.md', 'Table', 'Dim_Date | تاریخ | سال شمسی فروش', { scope: 'table', domain: 'common', entity: 'Dim_Date' }),
      piece('Catalog/common/common.md', 'Rules', 'common | Dim_Date join فروش', { scope: 'domain', domain: 'common' }),
      piece('Catalog/Rules for every question.md', 'Rules', 'Rules for every question | فروش', { scope: 'rules' }),
      piece('How-to.md', 'Deploy', 'How-to | deploy فروش', { scope: 'project' }),
    ],
  };
}
const find = (groups, { question = 'فروش خالص چیست؟', index = fixtureIndex(), embedding = null } = {}) => {
  const auth = runAuthCheck(groups);
  return findNotes({ index, groups: auth.groups, can: auth.can, question, questionEmbedding: embedding });
};
const paths = (r) => r.notes.map((n) => n.path);

test('notes search: a user sees only the notes of the tables they may query', () => {
  const sales = paths(find(['NLSQL-sales']));
  assert.ok(sales.includes('Catalog/sales/Fact_Sales.md') && sales.includes('Catalog/sales/sales.md'));
  assert.ok(sales.includes('Catalog/Rules for every question.md'));
  assert.ok(!sales.includes('Catalog/hr/Dim_Employee.md'), 'no other domain');
  assert.ok(!sales.includes('How-to.md'), 'no project notes without can.projectNotes');
  const hr = paths(find(['NLSQL-hr']));
  assert.ok(hr.includes('Catalog/common/Dim_Date.md'), 'a table listed for the group');
  assert.ok(!hr.includes('Catalog/common/common.md'), 'a domain note needs * on the domain');
  assert.ok(!hr.includes('Catalog/sales/Fact_Sales.md'));
  const it = paths(find(['IT - Data']));
  assert.ok(it.includes('How-to.md') && it.includes('Catalog/hr/Dim_Employee.md'));
});

test('notes search: refusals are ⛔ messages the user sees (no access, no index, nothing found)', () => {
  assert.throws(() => find(['Guests']), /⛔ شما به هیچ‌یک/);
  assert.throws(() => find(['IT - Data'], { index: null }), /⛔ ایندکس یادداشت‌های Obsidian/);
  assert.throws(() => find(['IT - Data'], { question: 'هوای تهران' }), /⛔ در یادداشت‌های Obsidian چیزی/);
  assert.throws(() => find(['IT - Data'], { question: '   ' }), /⛔ سوالی/);
});

test('notes search: the question vector puts the closest piece first; without it, shared rare words decide', () => {
  const idx = fixtureIndex();
  const target = idx.chunks[2];   // Dim_Employee
  const r = find(['IT - Data'], { question: 'کارمند', embedding: target.embedding, index: idx });
  assert.equal(r.semanticUsed, true);
  assert.equal(r.notes[0].path, target.path);
  assert.match(r.notes[0].why, /معنای نزدیک/);
  const lexical = find(['IT - Data'], { question: 'حقوق کارمند' });
  assert.equal(lexical.semanticUsed, false);
  assert.deepEqual(paths(lexical), ['Catalog/hr/Dim_Employee.md']);
  assert.match(lexical.notes[0].why, /کلمه‌های مشترک: حقوق، کارمند/);
  // a vector of another embedding model (other size) is ignored instead of giving nonsense scores
  assert.equal(find(['IT - Data'], { embedding: [1, 2, 3] }).semanticUsed, false);
});

test('notes search: at most 8 pieces, at most 3 per note, within the character budget', () => {
  const idx = fixtureIndex();
  idx.chunks = Array.from({ length: 30 }, (_, i) => ({ ...idx.chunks[6], id: `p${i}`, path: `N${i % 5}.md`, text: `فروش ${'x'.repeat(3000)} ${i}` }));
  const r = find(['IT - Data'], { index: idx });
  assert.ok(r.notes.length <= 8);
  assert.ok(r.notes.reduce((n, x) => n + x.text.length, 0) <= 16000);
  for (let i = 0; i < 5; i++) assert.ok(r.notes.filter((n) => n.path === `N${i}.md`).length <= 3);
  assert.deepEqual(r.notes.map((n) => n.n), r.notes.map((_, i) => i + 1));
});

test('notes prompt and answer: numbered notes, answer only from them; <think> hidden, cited notes listed', () => {
  const plan = find(['IT - Data']);
  const prompt = notesPrompt(plan);
  assert.match(prompt, /using ONLY the NOTES below/);
  assert.match(prompt, /در یادداشت‌های Obsidian جوابی برای این سوال پیدا نکردم/);
  assert.ok(prompt.includes(`[1] ${plan.notes[0].note}`) && prompt.trimEnd().endsWith(plan.question));
  const sources = sourcesOf(plan.notes);
  assert.ok(!('text' in sources[0]), 'sources carry no note text');

  const two = [{ n: 1, note: 'Fact_Sales', heading: 'Table', path: 'Catalog/sales/Fact_Sales.md' }, { n: 2, note: 'How-to', heading: 'Deploy', path: 'How-to.md' }];
  const fmt = (res) => notesAnswer({ res, sources: two }).answer;
  const a = fmt({ response: '<think>hmm</think>فروش خالص در ستون EffectiveNetPrice است [1].' });
  assert.ok(!a.includes('hmm') && a.startsWith('فروش خالص'));
  assert.ok(a.includes('[1] Fact_Sales › Table') && !a.includes('How-to.md'));
  assert.ok(fmt({ text: 'جواب بدون ارجاع' }).includes('How-to.md'));
  assert.ok(!fmt({ response: 'reasoning without an opening tag</think>جواب [2]' }).includes('reasoning'));
  assert.throws(() => fmt({ response: '<think>only thinking</think>' }), /⛔ مدل جوابی نداد/);
  assert.throws(() => fmt({ n: 1 }), /⛔ ساختار پاسخ API/);
});

// ---------------------------------------------------------------- use cases (the real logic with fakes)
function useCases({ embed = async (t) => null, llm = async () => ({ response: 'جواب [1]' }), index = fixtureIndex(), items = catalogFiles, rerank } = {}) {
  const knowledge = { catalogItems: items, vaultIndex: () => index };
  return createUseCases({ knowledge, embed, llm, rerank });
}
const withoutModel = () => catalogFiles().filter((j) => j.retrievalModel !== true);

test('tables(): the same plan the n8n Find Tables node used to make; a refusal is returned, not thrown', async () => {
  const q = 'فروش خالص ماه گذشته به تفکیک محصول';
  const plan = await useCases().tables({ question: q, groups: ['NLSQL-sales'], email: 'a@corp' });
  const before = runBuildPrompt({ inputs: catalogFiles(), nodes: { AuthCheck: { groups: ['NLSQL-sales'], email: 'a@corp' }, Webhook: { body: { question: q } } } }).plan;
  const { logs, ...rest } = plan;
  assert.deepEqual(rest, before);
  assert.ok(logs.some((l) => l.startsWith('WHY |')), 'the reasons travel with the plan (n8n Executions)');
  assert.ok(plan.joins.every((j) => ['from', 'from_column', 'to', 'to_column', 'type'].every((k) => k in j)), 'catalog joins as they are');

  const no = await useCases().tables({ question: q, groups: ['Guests'] });
  assert.match(no.refusal, /^⛔ شما دسترسی/);
  // the question vector is passed through; with vectors and a model trained with meaning, that model is used
  const sidecar = { embeddingIndex: true, vectors: { Fact_Sales: { embedding: [0.1, 0.2] }, Dim_Product: { embedding: [0.2, 0.1] } } };
  const v = await useCases({ embed: async () => [0.1, 0.2], items: () => [...withoutModel(), sidecar, semanticModelFile()] })
    .tables({ question: q, groups: ['NLSQL-sales'] });
  assert.equal(v.retrieval.semanticUsed, true);
  assert.deepEqual(v.retrieval.model.signals, ['lexical', 'semantic']);
  // the committed model has no meaning features yet (they are learned where bge-m3 runs): keyword model
  assert.deepEqual(plan.retrieval.model.signals, ['lexical']);
});

test('tables() with a reranker: the most likely tables are judged by it; without it, the keyword model', async () => {
  const q = 'فروش خالص ماه گذشته به تفکیک محصول';
  let seen = null;
  const rerank = async (question, texts) => { seen = { question, texts }; return texts.map((t) => (/^Fact_Refund|^Dim_Customer —/.test(t) ? 0.99 : 0.01)); };
  const r = await useCases({ items: () => [...withoutModel(), rerankModelFile()], rerank }).tables({ question: q, groups: ['NLSQL-Full'] });
  assert.equal(seen.question, q);
  assert.ok(seen.texts.length > 0 && seen.texts.length <= 20, 'only the most likely tables go to the reranker');
  assert.deepEqual(r.retrieval.model.signals, ['lexical', 'rerank']);
  assert.ok(r.tables.some((t) => t.name === 'Dim_Customer'), 'the reranker decided');
  // the reranker failing (null): the model without it, no error
  const down = await useCases({ items: () => [...withoutModel(), rerankModelFile()], rerank: async () => null }).tables({ question: q, groups: ['NLSQL-Full'] });
  assert.deepEqual(down.retrieval.model.signals, ['lexical']);
});

test('reranker client: TEI /rerank scores back in input order; off or failing gives null', async () => {
  const fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    assert.deepEqual([body.query, body.texts.length], ['q', 3]);
    return { ok: true, json: async () => [{ index: 2, score: 0.9 }, { index: 0, score: 0.5 }, { index: 1, score: 0.1 }] };
  };
  assert.deepEqual(await createReranker('http://r/rerank', { fetchImpl })('q', ['a', 'b', 'c']), [0.5, 0.1, 0.9]);
  assert.equal(await createReranker('')('q', ['a']), null);
  assert.equal(await createReranker('http://r/rerank', { fetchImpl: async () => { throw new Error('down'); } })('q', ['a']), null);
});

test('notes(): search -> prompt -> Qwen -> answer with its notes; refusals are answers; an LLM failure is an error', async () => {
  let sent = null;
  const r = await useCases({ llm: async (p) => { sent = p; return { response: 'فروش خالص [1]' }; } })
    .notes({ question: 'فروش خالص چیست؟', groups: ['NLSQL-sales'], can: {} });
  assert.match(sent, /QUESTION\nفروش خالص چیست؟$/);
  assert.match(r.answer, /^فروش خالص \[1\][\s\S]*یادداشت‌های Obsidian/);
  assert.ok(r.logs[0].startsWith('NOTES |'));
  assert.match((await useCases().notes({ question: 'x', groups: ['Guests'] })).answer, /^⛔/);
  await assert.rejects(useCases({ llm: async () => { throw new Error('LLM down'); } }).notes({ question: 'فروش', groups: ['IT - Data'] }), /LLM down/);
});

test('embedder: a failing embeddings service means keyword search, never a failed question', async () => {
  const logs = [];
  const embed = createEmbedder('http://x/embed', { fetchImpl: async () => { throw new Error('ECONNREFUSED'); }, log: (m) => logs.push(m) });
  assert.equal(await embed('سوال'), null);
  assert.match(logs[0], /EMBED FAILED/);
  const ok = createEmbedder('http://x/embed', { fetchImpl: async () => ({ ok: true, json: async () => [[0.5, 0.25]] }) });
  assert.deepEqual(await ok('سوال'), [0.5, 0.25]);
});

// ---------------------------------------------------------------- files on disk
test('knowledge: files are read once and again only after they change; a half-written file keeps the last good one', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'sales.json');
  fs.writeFileSync(file, JSON.stringify({ domain: 'sales', entities: [] }));
  const k = createKnowledge({ catalogDir: dir, vaultIndexFile: path.join(dir, 'missing.json') });
  const first = k.catalogItems();
  assert.equal(k.catalogItems()[0], first[0], 'same object: not parsed again');
  fs.writeFileSync(file, JSON.stringify({ domain: 'sales2', entities: [] }));
  fs.utimesSync(file, new Date(), new Date(Date.now() + 5000));
  assert.equal(k.catalogItems()[0].domain, 'sales2');
  fs.writeFileSync(file, '{"domain": "half');
  fs.utimesSync(file, new Date(), new Date(Date.now() + 10000));
  assert.equal(k.catalogItems()[0].domain, 'sales2');
  assert.equal(k.vaultIndex(), null);
});

// ---------------------------------------------------------------- HTTP
async function withServer(fn) {
  const knowledge = { catalogItems: catalogFiles, vaultIndex: () => fixtureIndex() };
  const server = createServer({ useCases: createUseCases({ knowledge, embed: async () => null, llm: async () => ({ response: 'جواب [1]' }) }), knowledge, log: () => {} });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await fn(url); } finally { server.close(); }
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('HTTP: /tables and /notes answer JSON; a malformed request is a 400; /health counts what is loaded', async () => {
  await withServer(async (url) => {
    const t = await post(`${url}/tables`, { question: 'فروش خالص', groups: ['NLSQL-sales'], email: 'a@corp' });
    assert.equal(t.status, 200);
    assert.ok((await t.json()).tables.length > 0);
    const n = await post(`${url}/notes`, { question: 'فروش خالص', groups: ['NLSQL-sales'], can: {} });
    assert.match((await n.json()).answer, /^جواب \[1\]/);
    assert.equal((await post(`${url}/tables`, { question: 'x' })).status, 400);                 // no groups
    assert.equal((await post(`${url}/tables`, { question: 1, groups: [] })).status, 400);
    assert.equal((await post(`${url}/tables`, 'not json')).status, 400);
    assert.equal((await post(`${url}/tables`, { question: 'x'.repeat(70000), groups: [] })).status, 400);
    assert.equal((await fetch(`${url}/nothing`)).status, 404);
    const h = await (await fetch(`${url}/health`)).json();
    assert.deepEqual([h.ok, h.notePieces], [true, 7]);
    assert.ok(h.catalogFiles >= 7);
  });
});

// ---------------------------------------------------------------- the n8n side
test('BuildPrompt passes the service refusal to ErrorFormat; Format Answer names the Obsidian notes behind it', () => {
  assert.throws(() => runCodeNode('BuildPrompt', { inputs: [{ refusal: '⛔ شما دسترسی ندارید' }] }), /^Error: ⛔ شما دسترسی ندارید$/);
  const bp = { selectedEntities: ['Fact_Sales', 'Dim_Product'], retrieval: { metrics: ['فروش خالص'] } };
  const nodes = { Webhook: { body: { question: 'q' } }, Security: { sql: 'SELECT 1' }, AuthCheck: runAuthCheck(['NLSQL-sales']), BuildPrompt: bp };
  const { answer } = runCodeNode('Format Answer', { inputs: [{ a: 1 }], nodes }).json;
  assert.ok(answer.endsWith('📎 یادداشت‌های Obsidian: Fact_Sales · Dim_Product · معیار «فروش خالص»'), answer);
});

test('Open WebUI function: two models, one webhook; the model decides the mode', () => {
  const py = fs.readFileSync(path.join(ROOT, 'openwebui', 'text2sql.py'), 'utf8');
  assert.match(py, /default="http:\/\/n8n:5678\/webhook\/text2sql"/);
  assert.match(py, /"text2sql": \("Text2SQL", "sql"\), "notes": \("Obsidian notes", "notes"\)/);
  assert.match(py, /"mode": mode/);
});

test('obsidian/Schema.md is generated from the current catalogs', () => {
  const { generate, OUT } = require('../scripts/build-schema-note');
  const text = generate();
  assert.equal(fs.readFileSync(OUT, 'utf8'), text, 'run: node scripts/build-schema-note.js');
  for (const t of CATALOGS.flatMap((c) => c.entities.map((e) => e.name))) assert.ok(text.includes(`[[${t}]]`), t);
});
