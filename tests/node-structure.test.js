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
const SERVICE_DIR = path.join(__dirname, '..', 'catalog-service');
const FILES = fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => path.join(DIR, f));
// catalog-service decides nothing about rights either: it reads the groups and can.* that AuthCheck produced
const SERVICE_FILES = ['', 'text2sql', 'notes'].flatMap((d) => fs.readdirSync(path.join(SERVICE_DIR, d))
  .filter((f) => f.endsWith('.js')).map((f) => path.join(SERVICE_DIR, d, f)));

// the source without the body of readN8nInputs() and without comments
function outsideAdapter(src) {
  const start = src.indexOf('function readN8nInputs()');
  assert.ok(start >= 0, 'has a readN8nInputs() adapter');
  const end = src.indexOf('\n}', start);
  return (src.slice(0, start) + src.slice(end)).replace(/\/\/.*$/gm, '');
}

test('every Code node reads n8n only inside readN8nInputs()', () => {
  for (const f of FILES) {
    const rest = outsideAdapter(fs.readFileSync(f, 'utf8'));
    assert.ok(!/\$\(|\$input|\$json/.test(rest), `${path.basename(f)}: $input / $('...') outside readN8nInputs()`);
  }
});

test('only AuthCheck names the IT groups; the other nodes read its rights', () => {
  for (const f of [...FILES, ...SERVICE_FILES].filter((x) => path.basename(x) !== 'AuthCheck.js')) {
    const code = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/'IT - (Data|Security)'/.test(code), `${path.basename(f)} names an AD group; use AuthCheck's can.*`);
  }
});

test('AuthCheck rights: details, review and project notes for IT, benchmark data only for IT - Data with the header', () => {
  const can = (groups, headers) => runAuthCheck(groups, headers).can;
  const it = { seeDetails: true, evalMode: false, reviewNotes: true, projectNotes: true };
  const none = { seeDetails: false, evalMode: false, reviewNotes: false, projectNotes: false };
  assert.deepEqual(can(['IT - Data']), it);
  assert.deepEqual(can(['IT - Data'], { 'x-eval-mode': 'true' }), { ...it, evalMode: true });
  assert.deepEqual(can(['IT - Security'], { 'x-eval-mode': 'true' }), it);
  assert.deepEqual(can(['NLSQL-Full'], { 'x-eval-mode': 'true' }), none);
  assert.deepEqual(can(['IT-Security']), none);   // AD name must match exactly
  assert.deepEqual(runAuthCheck(['NLSQL-sales', 'IT - Data']).groups, ['NLSQL-sales', 'IT - Data']);
});
