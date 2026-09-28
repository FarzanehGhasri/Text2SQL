const test = require('node:test');
const assert = require('node:assert/strict');
const { outOfSync, loadWorkflow } = require('../scripts/sync-workflow-code');

test('workflow JSON embeds exactly the code in n8n_workflows/code/', () => {
  assert.deepEqual(outOfSync(loadWorkflow()), [], 'run: node scripts/sync-workflow-code.js');
});

test('no pinned test data (it held a real user identity) is committed', () => {
  const wf = loadWorkflow();
  assert.deepEqual(wf.pinData || {}, {});
});

test('every connection points at an existing node', () => {
  const wf = loadWorkflow();
  const names = new Set(wf.nodes.map((n) => n.name));
  for (const [from, outs] of Object.entries(wf.connections)) {
    assert.ok(names.has(from), `connection from missing node ${from}`);
    for (const branch of outs.main) for (const c of branch || []) assert.ok(names.has(c.node), `${from} -> missing ${c.node}`);
  }
});
