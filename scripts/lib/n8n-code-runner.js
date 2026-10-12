// Runs the source of an n8n Code node ("Run Once for All Items" mode) outside
// n8n, with just the globals those nodes use: $input, $json, $('Node Name')
// (.first() / .all() / .last() / .item) and console. Lets tests and the
// retrieval benchmark drive the workflow's Code nodes with fake upstream data.

const fs = require('fs');
const path = require('path');

const { findTables, extractEmbeddingVector } = require('../../catalog-service/text2sql/find-tables');

const CODE_DIRS = {
  main: path.join(__dirname, '..', '..', 'n8n_workflows', 'code'),
  benchmark: path.join(__dirname, '..', '..', 'n8n_workflows', 'code-benchmark'),
};

const itemsOf = (value) => (Array.isArray(value) ? value : [value]).map((json) => ({ json }));

function nodeProxy(json) {
  const items = itemsOf(json);
  return { first: () => items[0], all: () => items, last: () => items[items.length - 1], item: items[0] };
}

// compiled once per file version (training runs the pipeline thousands of times)
const compiled = new Map();
function compile(file) {
  const stamp = fs.statSync(file).mtimeMs;
  const hit = compiled.get(file);
  if (hit && hit.stamp === stamp) return hit.fn;
  const fn = new Function('$input', '$', 'console', '$json', fs.readFileSync(file, 'utf8'));
  compiled.set(file, { stamp, fn });
  return fn;
}

// inputs: array of item json objects for $input
// nodes:  { 'Node Name': json | json[] } for $('Node Name'); a missing node
//         throws, the same way n8n does for a node that did not execute.
// workflow: 'main' (final_improving security) or 'benchmark' (Text-to-SQL Benchmark-02)
function runCodeNode(nodeName, { inputs = [], nodes = {}, workflow = 'main' } = {}) {
  const fn = compile(path.join(CODE_DIRS[workflow], `${nodeName}.js`));
  const $input = nodeProxy(inputs);
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Node '${name}' hasn't been executed`);
    return nodeProxy(nodes[name]);
  };
  const logs = [];
  const consoleStub = { log: (...a) => logs.push(a.join(' ')) };
  const $json = $input.first() ? $input.first().json : {};
  const result = fn($input, $, consoleStub, $json);
  return { result, json: result[0] ? result[0].json : undefined, logs };
}

// Find Tables (catalog-service, POST /tables) then the BuildPrompt Code node, the way a question runs:
// BuildPrompt's $input is the service's plan. Same options as before so tests read like the workflow:
// inputs = the catalog files, nodes = { 'Embed Question': TEI response, AuthCheck: { groups }, Webhook: { body } }.
// Without a retrieval model in the inputs, Find Tables uses its committed baseline model.
function runBuildPrompt({ inputs = [], nodes = {}, rerankScores = null } = {}) {
  const logs = [];
  const auth = nodes.AuthCheck || {};
  const plan = findTables({
    items: inputs,
    groups: auth.groups || [],
    email: auth.email || '?',
    question: ((nodes.Webhook || {}).body || {}).question,
    questionEmbedding: extractEmbeddingVector(nodes['Embed Question']),
    rerankScores,
  }, (m) => logs.push(m));
  const build = runCodeNode('BuildPrompt', { inputs: [plan], nodes });
  return { result: build.result, json: build.json, plan, logs: [...logs, ...build.logs] };
}

// What the real AuthCheck node returns for a user in these AD groups (groups + rights), for
// tests of the nodes that read it.
function runAuthCheck(groups = [], headers = {}) {
  const ldap = { sAMAccountName: 'tester', memberOf: groups.map((g) => `CN=${g},OU=Groups,DC=corp`) };
  return runCodeNode('AuthCheck', { inputs: [ldap], nodes: { Webhook: { headers, body: { email: 'tester@corp.ir' } } } }).json;
}

module.exports = { runCodeNode, runBuildPrompt, runAuthCheck };
