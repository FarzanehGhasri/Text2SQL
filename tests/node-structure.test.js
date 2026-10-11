// Every Code node of the main workflow has the same shape (SOLID, adapted to n8n):
//   settings  ->  readN8nInputs() (the ONLY place $input / $('...') is read)  ->  small pure functions  ->  return
// so a node can be read top to bottom, tested without n8n, and moved without hidden dependencies.
// And "who may do what" is decided once, in AuthCheck; no other node names an AD group.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runAuthCheck } = require('../scripts/lib/n8n-code-runner');

const DIR = path.join(__dirname, '..', 'n8n_workflows', 'code');
const FILES = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));

// the source without the body of readN8nInputs() and without comments
function outsideAdapter(src) {
  const start = src.indexOf('function readN8nInputs()');
  assert.ok(start >= 0, 'has a readN8nInputs() adapter');
  const end = src.indexOf('\n}', start);
  return (src.slice(0, start) + src.slice(end)).replace(/\/\/.*$/gm, '');
}

test('every Code node reads n8n only inside readN8nInputs()', () => {
  for (const f of FILES) {
    const rest = outsideAdapter(fs.readFileSync(path.join(DIR, f), 'utf8'));
    assert.ok(!/\$\(|\$input|\$json/.test(rest), `${f}: $input / $('...') outside readN8nInputs()`);
  }
});

test('only AuthCheck names the IT groups; the other nodes read its rights', () => {
  for (const f of FILES.filter((x) => x !== 'AuthCheck.js')) {
    const code = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/'IT - (Data|Security)'/.test(code), `${f} names an AD group; use AuthCheck's can.*`);
  }
});

test('AuthCheck rights: details and review notes for IT, benchmark data only for IT - Data with the header', () => {
  const can = (groups, headers) => runAuthCheck(groups, headers).can;
  assert.deepEqual(can(['IT - Data']), { seeDetails: true, evalMode: false, reviewNotes: true });
  assert.deepEqual(can(['IT - Data'], { 'x-eval-mode': 'true' }), { seeDetails: true, evalMode: true, reviewNotes: true });
  assert.deepEqual(can(['IT - Security'], { 'x-eval-mode': 'true' }), { seeDetails: true, evalMode: false, reviewNotes: true });
  assert.deepEqual(can(['NLSQL-Full'], { 'x-eval-mode': 'true' }), { seeDetails: false, evalMode: false, reviewNotes: false });
  assert.deepEqual(can(['IT-Security']), { seeDetails: false, evalMode: false, reviewNotes: false });   // AD name must match exactly
  assert.deepEqual(runAuthCheck(['NLSQL-sales', 'IT - Data']).groups, ['NLSQL-sales', 'IT - Data']);
});
