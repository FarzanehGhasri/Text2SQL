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

test('a question: AuthCheck -> notes or data; data goes catalog-service -> BuildPrompt -> LLM; refusals to ErrorFormat', () => {
  const wf = loadWorkflow();
  const node = (name) => wf.nodes.find((n) => n.name === name);
  const next = (name, out = 0) => (wf.connections[name].main[out] || []).map((c) => c.node);
  assert.deepEqual(next('Webhook'), ['LDAP']);
  assert.deepEqual(next('AuthCheck'), ['Notes or data?']);
  assert.deepEqual(next('Notes or data?'), ['Ask Notes']);         // mode "notes" (Open WebUI model "Obsidian notes")
  assert.deepEqual(next('Notes or data?', 1), ['Find Tables']);    // anything else: a data question
  assert.deepEqual(next('Ask Notes'), ['Respond to Webhook']);
  assert.deepEqual(next('Find Tables'), ['BuildPrompt']);
  assert.deepEqual(next('BuildPrompt'), ['request to LLM']);
  for (const n of ['Find Tables', 'Ask Notes', 'BuildPrompt']) {
    assert.equal(node(n).onError, 'continueErrorOutput', n);
    assert.deepEqual(next(n, 1), ['ErrorFormat'], `${n} errors -> ErrorFormat`);
  }
  const cond = node('Notes or data?').parameters.conditions.conditions[0];
  assert.deepEqual([cond.leftValue, cond.rightValue], ["={{ $('Webhook').first().json.body.mode }}", 'notes']);
  // the search is catalog-service's: n8n reads no catalog file and embeds nothing
  for (const gone of ['ReadCatalog', 'ParseCatalog', 'Embed Question', 'Merge Catalog+Embedding']) assert.ok(!node(gone), gone);
  assert.equal(node('Find Tables').parameters.url, 'http://catalog-service:8090/tables');
  assert.equal(node('Ask Notes').parameters.url, 'http://catalog-service:8090/notes');
  assert.match(node('Find Tables').parameters.jsonBody, /"groups": \$json\.groups/);
  assert.match(node('Ask Notes').parameters.jsonBody, /"can": \$json\.can/);
  // no node keeps a meaningless default name
  for (const n of wf.nodes) assert.ok(!/^Code in JavaScript/.test(n.name), n.name);
});

test('docker-compose: catalog-service is reachable by n8n only, with the same LLM as n8n; n8n mounts no catalog', () => {
  const fs = require('fs');
  const path = require('path');
  const compose = fs.readFileSync(path.join(__dirname, '..', 'docker-compose.yml'), 'utf8');
  const service = compose.slice(compose.indexOf('\n  catalog-service:'), compose.indexOf('\n  embeddings:'));
  assert.match(service, /command: \["node", "catalog-service\/server\.js"\]/);
  assert.match(service, /- \.:\/app:ro/);
  assert.ok(!/ports:/.test(service), 'catalog-service trusts the groups n8n sends: never publish its port');
  const llm = loadWorkflow().nodes.find((n) => n.name === 'request to LLM').parameters.url;
  assert.ok(service.includes(`LLM_URL=${llm}`), 'notes answers use the same LLM as Text2SQL');
  const n8n = compose.slice(compose.indexOf('\n  n8n:'), compose.indexOf('\n  open-webui:'));
  assert.ok(!/catalog|vault-index/.test(n8n.replace(/#.*$/gm, '')), 'n8n mounts no catalog');
  assert.match(compose, /node scripts\/index-vault-embeddings\.js --embed-url "\$\$EMBED_URL"/);
  // one embeddings setting for everyone, bge-m3 on the host's Ollama unless .env says otherwise
  const embed = compose.match(/- EMBED_URL=(\S+)/g);
  assert.ok(embed.length >= 3 && new Set(embed).size === 1, embed.join(' | '));
  assert.match(embed[0], /\$\{EMBED_URL:-http:\/\/host\.docker\.internal:11434\/api\/embed\?model=bge-m3\}/);
  assert.match(compose, /node scripts\/build-schema-note\.js/);
});
