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
  // Build Fix Prompt / ErrorFormat hang off the error output of these two.
  assert.equal(node('execute query').onError, 'continueErrorOutput');
  assert.equal(node('Retry: execute query').onError, 'continueErrorOutput');
  // The new server's login is read-only and has no NLSQL_AuditLog table until a DBA
  // creates it (sql/NLSQL_AuditLog.sql); the answer is already sent by then.
  assert.equal(node('Microsoft SQL').onError, 'continueRegularOutput');
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
  assert.deepEqual(wf.connections.ErrorFormat.main[0].map((c) => c.node), ['Respond to Webhook1', 'Obsidian note']);
  assert.deepEqual(wf.connections['Obsidian note'].main[0].map((c) => c.node), ['Write note']);
  const write = node('Write note');
  assert.equal(write.parameters.operation, 'write');
  assert.equal(write.parameters.fileName, '={{ $json.path }}');
  // a full disk or a missing folder must never break the answer
  assert.equal(node('Obsidian note').onError, 'continueRegularOutput');
  assert.equal(write.onError, 'continueRegularOutput');
  // the note branch sits below the reply, so n8n runs the reply first
  assert.ok(node('Obsidian note').position[1] > node('Respond to Webhook1').position[1]);
  // and the folder it writes to is mounted
  const compose = require('fs').readFileSync(require('path').join(__dirname, '..', 'docker-compose.yml'), 'utf8');
  assert.match(compose, /- \.\/obsidian\/Inbox\/n8n:\/home\/node\/\.n8n-files\/obsidian-inbox/);
});
