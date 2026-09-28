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
