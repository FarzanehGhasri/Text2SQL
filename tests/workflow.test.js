const test = require('node:test');
const assert = require('node:assert/strict');
const { outOfSync, loadWorkflow, TARGETS } = require('../scripts/sync-workflow-code');

test('workflow JSON files embed exactly the code in their code directories', () => {
  assert.deepEqual(outOfSync(), [], 'run: node scripts/sync-workflow-code.js');
});

test('no pinned test data (it held a real user identity) is committed', () => {
  const wf = loadWorkflow();
  assert.deepEqual(wf.pinData || {}, {});
});

test('every connection points at an existing node (both workflows)', () => {
  for (const wf of TARGETS.map((t) => loadWorkflow(t))) {
    const names = new Set(wf.nodes.map((n) => n.name));
    for (const [from, outs] of Object.entries(wf.connections)) {
      assert.ok(names.has(from), `${wf.name}: connection from missing node ${from}`);
      for (const branch of outs.main) {
        for (const c of branch || []) assert.ok(names.has(c.node), `${wf.name}: ${from} -> missing ${c.node}`);
      }
    }
  }
});

test('query nodes route errors to the retry/error path; the audit insert never fails a run', () => {
  const wf = loadWorkflow();
  const node = (name) => wf.nodes.find((n) => n.name === name);
  const next = (name, out = 0) => (wf.connections[name].main[out] || []).map((c) => c.node);
  // one execute query and one request to LLM for both attempts: a copy per attempt had drifted before (Retry: Security)
  assert.equal(node('execute query').onError, 'continueErrorOutput');
  assert.deepEqual(next('Security'), ['execute query']);
  assert.deepEqual(next('execute query'), ['Format Answer', 'Audit Row']);
  assert.deepEqual(next('execute query', 1), ['Retry once?']);
  assert.deepEqual(next('Retry once?'), ['Build Fix Prompt']);          // first failure: one repair try
  assert.deepEqual(next('Retry once?', 1), ['ErrorFormat']);            // second failure: the user gets the error
  assert.deepEqual(next('Build Fix Prompt'), ['request to LLM']);
  const cond = node('Retry once?').parameters.conditions.conditions[0];
  assert.deepEqual([cond.leftValue, cond.rightValue], ["={{ $('Security').first().json.attempt }}", 1]);
  for (const gone of ['Retry: execute query', 'Retry: request to LLM', 'Route by Attempt', 'Respond to Webhook1']) {
    assert.ok(!node(gone), `${gone} is a duplicate and was removed`);
  }
  // no two nodes do the same job: the same HTTP call or SQL query exists once
  const jobs = wf.nodes.filter((n) => /httpRequest|microsoftSql|respondToWebhook/.test(n.type))
    .map((n) => n.type + JSON.stringify(n.parameters));
  assert.equal(new Set(jobs).size, jobs.length, 'duplicate HTTP / SQL / respond node');
  // The new server's login is read-only and has no NLSQL_AuditLog table until a DBA
  // creates it (sql/NLSQL_AuditLog.sql); the answer is already sent by then.
  assert.equal(node('Write Audit Log').onError, 'continueRegularOutput');
});

test('sql/verify_catalog_access.sql is generated from the current catalogs', () => {
  const fs = require('fs');
  const { generate, OUT } = require('../scripts/generate-verify-sql');
  const { loadCatalogs } = require('../scripts/lib/catalog-loader');
  const path = require('path');
  const expected = generate(loadCatalogs(path.join(__dirname, '..', 'catalog')));
  assert.equal(fs.readFileSync(OUT, 'utf8'), expected, 'run: node scripts/generate-verify-sql.js');
  assert.ok(!/\/\*/.test(expected), 'no block comments: T-SQL nests them');
});

test('a failed question is answered first and then written to the Obsidian inbox', () => {
  const wf = loadWorkflow();
  const node = (name) => wf.nodes.find((n) => n.name === name);
  assert.deepEqual(wf.connections.ErrorFormat.main[0].map((c) => c.node), ['Respond to Webhook', 'Obsidian note']);
  assert.deepEqual(wf.connections['Obsidian note'].main[0].map((c) => c.node), ['Save to Obsidian Inbox']);
  const write = node('Save to Obsidian Inbox');
  assert.equal(write.parameters.operation, 'write');
  assert.equal(write.parameters.fileName, '={{ $json.path }}');
  // a full disk or a missing folder must never break the answer
  assert.equal(node('Obsidian note').onError, 'continueRegularOutput');
  assert.equal(write.onError, 'continueRegularOutput');
  // the note branch sits below the reply, so n8n runs the reply first
  assert.ok(node('Obsidian note').position[1] > node('Respond to Webhook').position[1]);
  // and the folder it writes to is mounted
  const compose = require('fs').readFileSync(require('path').join(__dirname, '..', 'docker-compose.yml'), 'utf8');
  assert.match(compose, /- \.\/obsidian\/Inbox\/n8n:\/home\/node\/\.n8n-files\/obsidian-inbox/);
});

test('a question flows Merge -> Find Tables -> BuildPrompt -> LLM; refusals go to ErrorFormat', () => {
  const wf = loadWorkflow();
  const next = (name, out = 0) => (wf.connections[name].main[out] || []).map((c) => c.node);
  assert.deepEqual(next('Merge Catalog+Embedding'), ['Find Tables']);
  assert.deepEqual(next('Find Tables'), ['BuildPrompt']);
  assert.deepEqual(next('Find Tables', 1), ['ErrorFormat']);   // e.g. "no access"
  assert.deepEqual(next('BuildPrompt'), ['request to LLM']);
  assert.equal(wf.nodes.find((n) => n.name === 'Find Tables').onError, 'continueErrorOutput');
  // the embeddings service is reached by its compose service name, whatever the project folder is called
  assert.equal(wf.nodes.find((n) => n.name === 'Embed Question').parameters.url, 'http://embeddings:80/embed');
  // no node keeps a meaningless default name
  for (const n of wf.nodes) assert.ok(!/^Code in JavaScript/.test(n.name), n.name);
});
