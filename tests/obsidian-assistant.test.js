// The Obsidian assistant: Open WebUI -> n8n "Obsidian assistant" -> the notes the user may see -> Qwen.
// Covers the vault reader/chunker, the index builder, the three Code nodes, the workflow wiring and Schema.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { readVault, chunkVault, chunkNote, noteAccess, MAX_CHUNK_CHARS } = require('../scripts/lib/vault-notes');
const { run, catalogPermissions } = require('../scripts/index-vault-embeddings');
const store = require('../scripts/lib/vault-index-store');
const { runCodeNode, runAuthCheck } = require('../scripts/lib/n8n-code-runner');
const { norm } = require('../scripts/lib/persian-text');
const { loadWorkflow, TARGETS } = require('../scripts/sync-workflow-code');

const ROOT = path.join(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'catalog');

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

// ---------------------------------------------------------------- the vault as pieces
test('the real vault: no Inbox, no CLAUDE.md, no hidden column; every piece is small and has a unique id', () => {
  const notes = readVault();
  assert.ok(notes.length > 100);
  assert.ok(!notes.some((n) => n.path.startsWith('Inbox/') || n.path === 'CLAUDE.md'));
  const chunks = chunkVault(notes);
  assert.equal(new Set(chunks.map((c) => c.id)).size, chunks.length);
  for (const c of chunks) {
    assert.ok(c.text.length <= MAX_CHUNK_CHARS + 400, `${c.id}: ${c.text.length} chars`);
    if (c.access.scope === 'table') assert.ok(!/\|\s*hidden\s*\|\s*$/m.test(c.text), `${c.id} sends a hidden column`);
  }
  const mission = chunks.filter((c) => c.path === 'Catalog/hr/Dim_Mission.md').map((c) => c.text).join('\n');
  assert.ok(!mission.includes('| `Id` |'), 'Dim_Mission.Id is hidden in its note');
});

test('who may see a note is decided by its place and type', () => {
  assert.deepEqual(noteAccess('Home.md'), { scope: 'project' });
  assert.deepEqual(noteAccess('Schema.md', { type: 'generated' }), { scope: 'project' });
  assert.deepEqual(noteAccess('Catalog/sales/Fact_Sales.md', { type: 'table', domain: 'sales' }), { scope: 'table', domain: 'sales', entity: 'Fact_Sales' });
  assert.deepEqual(noteAccess('Catalog/sales/sales.md', { type: 'domain', domain: 'sales' }), { scope: 'domain', domain: 'sales' });
  assert.deepEqual(noteAccess('Catalog/Rules for every question.md', { type: 'rules' }), { scope: 'rules' });
  assert.deepEqual(noteAccess('Catalog/sales/notes.md', {}), { scope: 'project' });   // unknown: fail closed
});

test('a note is cut at ## headings (not inside ``` blocks); every piece names its note', () => {
  const text = '---\ntype: table\ndomain: sales\nsynonyms:\n  - "فروش"\n---\n> اقلام فروش\n\n## Columns\n| `A` | int | a | yes |\n| `B` | int | b | hidden |\n\n## Examples\n```sql\n## not a heading\nSELECT 1\n```\n';
  const chunks = chunkNote({ path: 'Catalog/sales/Fact_Sales.md', text });
  assert.deepEqual(chunks.map((c) => c.heading), ['Columns', 'Examples']);   // the intro is only the description, already in every piece
  for (const c of chunks) assert.ok(c.text.startsWith('Fact_Sales | domain: sales | اقلام فروش | synonyms: فروش'));
  assert.ok(chunks[0].text.includes('`A`') && !chunks[0].text.includes('`B`'));
  assert.ok(chunks[1].text.includes('## not a heading'));
  const long = chunkNote({ path: 'How-to.md', text: `## Big\n${Array.from({ length: 60 }, (_, i) => `line ${i} `.repeat(10)).join('\n\n')}` }, { maxChars: 500 });
  assert.ok(long.length > 5 && long.every((c) => c.text.length <= 600));
  assert.equal(new Set(long.map((c) => c.id)).size, long.length);
});

// ---------------------------------------------------------------- the index
test('indexer: writes pieces + permissions, then does nothing until a note changes, then embeds only that note', async () => {
  const vault = tmpDir();
  const out = path.join(tmpDir(), 'vault.embeddings.json');
  fs.mkdirSync(path.join(vault, 'Catalog', 'sales'), { recursive: true });
  fs.mkdirSync(path.join(vault, 'Inbox', 'n8n'), { recursive: true });
  fs.writeFileSync(path.join(vault, 'Home.md'), '# Home\n## Status\nall good');
  fs.writeFileSync(path.join(vault, 'Catalog', 'sales', 'Fact_Sales.md'), '---\ntype: table\ndomain: sales\n---\n> فروش\n## Columns\n| `A` | int | a | yes |');
  fs.writeFileSync(path.join(vault, 'Inbox', 'n8n', 'q.md'), 'a real user question');
  const opts = { vaultDir: vault, catalogDir: CATALOG_DIR, out, quiet: true };

  const first = await run(opts, { embedClient: fakeClient(), log: () => {} });
  assert.equal(first.status, 'indexed');
  const idx = store.readIndex(out);
  assert.deepEqual(idx.permissions.sales, catalogPermissions(CATALOG_DIR).sales);
  assert.ok(idx.chunks.every((c) => c.embedding.length === 8 && !c.text.includes('real user')));

  const client = fakeClient();
  assert.equal((await run(opts, { embedClient: client, log: () => {} })).status, 'skipped');
  assert.equal(client.requests, 0);

  fs.writeFileSync(path.join(vault, 'Home.md'), '# Home\n## Status\nchanged');
  const third = await run(opts, { embedClient: fakeClient(), log: () => {} });
  assert.equal(third.status, 'indexed');
  assert.equal(third.embedded, 1);   // only the changed piece

  fs.writeFileSync(path.join(vault, 'Home.md'), '# Home\n## Status\nchanged again');
  const before = fs.readFileSync(out, 'utf8');
  assert.equal((await run(opts, { embedClient: fakeClient({ fail: true }), log: () => {} })).status, 'failed');
  assert.equal(fs.readFileSync(out, 'utf8'), before, 'a failed run keeps the previous index');
});

// ---------------------------------------------------------------- Find Notes
function fixtureIndex() {
  const piece = (pathName, heading, text, access) => ({ id: `${pathName}#${heading}`, note: path.basename(pathName, '.md'), path: pathName, heading, text, access, embedding: fakeVector(text) });
  return {
    vaultIndex: true, formatVersion: 1, dim: 8,
    permissions: {
      sales: { 'NLSQL-sales': ['*'], 'IT - Data': ['*'] },
      hr: { 'NLSQL-hr': ['*'], 'IT - Data': ['*'] },
      common: { 'NLSQL-sales': ['*'], 'NLSQL-hr': ['Dim_Date'], 'IT - Data': ['*'] },
    },
    chunks: [
      piece('Catalog/sales/Fact_Sales.md', 'Columns', 'Fact_Sales | فروش | EffectiveNetPrice فروش خالص', { scope: 'table', domain: 'sales', entity: 'Fact_Sales' }),
      piece('Catalog/sales/sales.md', 'Metrics', 'sales | فروش خالص = SUM(EffectiveNetPrice)', { scope: 'domain', domain: 'sales' }),
      piece('Catalog/hr/Dim_Employee.md', 'Columns', 'Dim_Employee | کارمند | حقوق فروش', { scope: 'table', domain: 'hr', entity: 'Dim_Employee' }),
      piece('Catalog/common/Dim_Date.md', 'Columns', 'Dim_Date | تاریخ | سال شمسی فروش', { scope: 'table', domain: 'common', entity: 'Dim_Date' }),
      piece('Catalog/common/common.md', 'Rules', 'common | Dim_Date join فروش', { scope: 'domain', domain: 'common' }),
      piece('Catalog/Rules for every question.md', 'Rules', 'Rules for every question | فروش', { scope: 'rules' }),
      piece('How-to.md', 'Deploy', 'How-to | deploy فروش', { scope: 'project' }),
    ],
  };
}

function findNotes(groups, { question = 'فروش خالص چیست؟', index = fixtureIndex(), embedding = null, wrap = true } = {}) {
  const auth = runAuthCheck(groups);
  const nodes = { Webhook: { body: { question } }, AuthCheck: auth };
  if (embedding) nodes['Embed Question'] = [embedding];
  return runCodeNode('Find Notes', { workflow: 'obsidian', inputs: [wrap ? { data: index } : index], nodes });
}
const paths = (r) => r.json.notes.map((n) => n.path);

test('Find Notes: a user sees only the notes of the tables they may query', () => {
  const sales = paths(findNotes(['NLSQL-sales']));
  assert.ok(sales.includes('Catalog/sales/Fact_Sales.md') && sales.includes('Catalog/sales/sales.md'));
  assert.ok(sales.includes('Catalog/Rules for every question.md'));
  assert.ok(!sales.includes('Catalog/hr/Dim_Employee.md'), 'no other domain');
  assert.ok(!sales.includes('How-to.md'), 'no project notes without can.projectNotes');

  const hr = paths(findNotes(['NLSQL-hr']));
  assert.ok(hr.includes('Catalog/common/Dim_Date.md'), 'a table listed for the group');
  assert.ok(!hr.includes('Catalog/common/common.md'), 'a domain note needs * on the domain');
  assert.ok(!hr.includes('Catalog/sales/Fact_Sales.md'));

  const it = paths(findNotes(['IT - Data']));
  assert.ok(it.includes('How-to.md') && it.includes('Catalog/hr/Dim_Employee.md'));
});

test('Find Notes: refusals are ⛔ messages the user sees (no access, no index, nothing found)', () => {
  assert.throws(() => findNotes(['Guests']), /⛔ شما به هیچ‌یک/);
  assert.throws(() => findNotes(['IT - Data'], { index: { error: 'ENOENT' }, wrap: false }), /⛔ ایندکس یادداشت‌های Obsidian/);
  assert.throws(() => findNotes(['IT - Data'], { question: 'هوای تهران' }), /⛔ در یادداشت‌های Obsidian چیزی/);
  assert.throws(() => findNotes(['IT - Data'], { question: '   ' }), /⛔ سوالی/);
});

test('Find Notes: the question vector puts the closest note first; without it, shared words decide', () => {
  const idx = fixtureIndex();
  const target = idx.chunks[2];   // Dim_Employee
  const r = findNotes(['IT - Data'], { question: 'کارمند', embedding: target.embedding, index: idx });
  assert.equal(r.json.semanticUsed, true);
  assert.equal(r.json.notes[0].path, target.path);
  assert.match(r.json.notes[0].why, /معنای نزدیک/);

  const lexical = findNotes(['IT - Data'], { question: 'حقوق کارمند' });
  assert.equal(lexical.json.semanticUsed, false);
  assert.deepEqual(paths(lexical), ['Catalog/hr/Dim_Employee.md']);
  assert.match(lexical.json.notes[0].why, /کلمه‌های مشترک: حقوق، کارمند/);
  // a vector of another embedding model (other size) is ignored instead of giving nonsense scores
  assert.equal(findNotes(['IT - Data'], { embedding: [1, 2, 3] }).json.semanticUsed, false);
});

test('Find Notes: at most 8 pieces and within the character budget', () => {
  const idx = fixtureIndex();
  idx.chunks = Array.from({ length: 30 }, (_, i) => ({ ...idx.chunks[6], id: `p${i}`, text: `فروش ${'x'.repeat(3000)} ${i}` }));
  const r = findNotes(['IT - Data'], { index: idx });
  assert.ok(r.json.notes.length <= 8);
  assert.ok(r.json.notes.reduce((n, x) => n + x.text.length, 0) <= 16000);
  assert.deepEqual(r.json.notes.map((n) => n.n), r.json.notes.map((_, i) => i + 1));
});

test('Find Notes normalises Persian text exactly like scripts/lib/persian-text.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'n8n_workflows', 'code-obsidian', 'Find Notes.js'), 'utf8');
  const nodeNorm = new Function(`${src.match(/const norm = [\s\S]*?\.trim\(\);/)[0]}; return norm;`)();
  for (const s of ['كارمندها‌ي  فعال', '۱۴۰۳ ٢٠٢٤', 'فروشِ خالص', 'ABC‌def']) assert.equal(nodeNorm(s), norm(s), s);
});

// ---------------------------------------------------------------- prompt and answer
test('Build Notes Prompt: notes numbered, answer only from them, same /combine body as Text2SQL', () => {
  const plan = findNotes(['IT - Data']).json;
  const r = runCodeNode('Build Notes Prompt', { workflow: 'obsidian', inputs: [plan] });
  assert.equal(r.json.body.string1, '-');
  const prompt = r.json.body.string2;
  assert.match(prompt, /using ONLY the NOTES below/);
  assert.match(prompt, /در یادداشت‌های Obsidian جوابی برای این سوال پیدا نکردم/);
  assert.ok(prompt.includes(`[1] ${plan.notes[0].note}`));
  assert.ok(prompt.trimEnd().endsWith(plan.question));
  assert.deepEqual(r.json.sources.map((s) => s.n), plan.notes.map((n) => n.n));
  assert.ok(!('text' in r.json.sources[0]), 'sources carry no note text');
});

test('Format Notes Answer: hides <think>, lists the cited notes, or all of them when none is cited', () => {
  const sources = [{ n: 1, note: 'Fact_Sales', heading: 'Columns', path: 'Catalog/sales/Fact_Sales.md' },
    { n: 2, note: 'How-to', heading: 'Deploy', path: 'How-to.md' }];
  const fmt = (res) => runCodeNode('Format Notes Answer', { workflow: 'obsidian', inputs: [res], nodes: { 'Build Notes Prompt': { sources } } }).json.answer;
  const a = fmt({ response: '<think>hmm</think>فروش خالص در ستون EffectiveNetPrice است [1].' });
  assert.ok(!a.includes('hmm') && a.startsWith('فروش خالص'));
  assert.ok(a.includes('[1] Fact_Sales › Columns') && !a.includes('How-to.md'));
  assert.ok(fmt({ text: 'جواب بدون ارجاع' }).includes('How-to.md'));
  assert.ok(!fmt({ response: 'reasoning without an opening tag</think>جواب [2]' }).includes('reasoning'));
  assert.throws(() => fmt({ response: '<think>only thinking</think>' }), /⛔ مدل جوابی نداد/);
  assert.throws(() => fmt({ n: 1 }), /⛔ ساختار پاسخ API/);
});

// ---------------------------------------------------------------- the workflow
const obsidianTarget = TARGETS.find((t) => t.workflowPath.endsWith('Obsidian assistant.json'));

test('Obsidian assistant workflow: one path, every failure answered by ErrorFormat, no duplicate nodes', () => {
  const wf = loadWorkflow(obsidianTarget);
  const main = loadWorkflow();
  const node = (name, w = wf) => w.nodes.find((n) => n.name === name);
  const next = (name, out = 0) => (wf.connections[name].main[out] || []).map((c) => c.node);
  assert.equal(node('Webhook').parameters.path, 'obsidian-assistant');
  assert.notEqual(node('Webhook').webhookId, node('Webhook', main).webhookId);
  const chain = ['Webhook', 'LDAP', 'AuthCheck', 'Embed Question', 'Read Vault Index', 'Parse Vault Index', 'Find Notes',
    'Build Notes Prompt', 'request to LLM', 'Format Notes Answer', 'Respond to Webhook'];
  chain.slice(0, -1).forEach((n, i) => assert.deepEqual(next(n), [chain[i + 1]], `${n} -> ${chain[i + 1]}`));
  for (const n of ['LDAP', 'AuthCheck', 'Find Notes', 'request to LLM', 'Format Notes Answer']) {
    assert.equal(node(n).onError, 'continueErrorOutput', n);
    assert.deepEqual(next(n, 1), ['ErrorFormat'], `${n} errors -> ErrorFormat`);
  }
  // a missing embedding or index is handled inside Find Notes (keyword search / ⛔ message), never a silent stop
  for (const n of ['Embed Question', 'Read Vault Index', 'Parse Vault Index']) assert.equal(node(n).onError, 'continueRegularOutput', n);
  // a missing file gives zero items, which would end the run with no reply; one empty item reaches Find Notes instead
  for (const n of ['Read Vault Index', 'Parse Vault Index']) assert.ok(node(n).alwaysOutputData && node(n).executeOnce, n);
  assert.deepEqual(next('ErrorFormat'), ['Respond to Webhook']);
  // the same LLM, embeddings, directory and LDAP settings as Text2SQL
  for (const n of ['request to LLM', 'LDAP']) assert.deepEqual(node(n).parameters, node(n, main).parameters, n);
  assert.equal(node('Embed Question').parameters.url, node('Embed Question', main).parameters.url);
  assert.equal(node('AuthCheck').parameters.jsCode, node('AuthCheck', main).parameters.jsCode);
  assert.equal(node('ErrorFormat').parameters.jsCode, node('ErrorFormat', main).parameters.jsCode);
  const work = wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
  assert.equal(new Set(work.map((n) => n.type + JSON.stringify(n.parameters))).size, work.length, 'duplicate node');
  assert.ok(work.every((n) => n.name in wf.connections || n.name === 'Respond to Webhook'), 'a node with no way out');
  assert.deepEqual(wf.pinData || {}, {});
});

test('docker-compose: n8n reads the index where Read Vault Index looks; indexer-watch builds it and Schema.md', () => {
  const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
  assert.match(compose, /- \.\/vault-index:\/home\/node\/\.n8n-files\/vault-index:ro/);
  const read = loadWorkflow(obsidianTarget).nodes.find((n) => n.name === 'Read Vault Index').parameters.fileSelector;
  assert.equal(read, '/home/node/.n8n-files/vault-index/vault.embeddings.json');
  assert.match(compose, /node scripts\/index-vault-embeddings\.js --embed-url http:\/\/embeddings:80\/embed/);
  assert.match(compose, /node scripts\/build-schema-note\.js/);
  assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'), /^vault-index\/$/m);
});

test('obsidian/Schema.md is generated from the current catalogs', () => {
  const { generate, OUT } = require('../scripts/build-schema-note');
  const text = generate();
  assert.equal(fs.readFileSync(OUT, 'utf8'), text, 'run: node scripts/build-schema-note.js');
  const tables = require('../scripts/lib/catalog-loader').loadCatalogs(CATALOG_DIR).flatMap((c) => c.data.entities.map((e) => e.name));
  for (const t of tables) assert.ok(text.includes(`[[${t}]]`), t);
});
