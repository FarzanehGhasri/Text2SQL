// Runs the source of an n8n Code node ("Run Once for All Items" mode) outside
// n8n, with just the globals those nodes use: $input, $json, $('Node Name')
// (.first() / .all() / .last() / .item) and console. Lets tests and the
// retrieval benchmark drive the workflow's Code nodes with fake upstream data.

const fs = require('fs');
const path = require('path');

const CODE_DIRS = {
  main: path.join(__dirname, '..', '..', 'n8n_workflows', 'code'),
  benchmark: path.join(__dirname, '..', '..', 'n8n_workflows', 'code-benchmark'),
};

const itemsOf = (value) => (Array.isArray(value) ? value : [value]).map((json) => ({ json }));

function nodeProxy(json) {
  const items = itemsOf(json);
  return { first: () => items[0], all: () => items, last: () => items[items.length - 1], item: items[0] };
}

// inputs: array of item json objects for $input
// nodes:  { 'Node Name': json | json[] } for $('Node Name'); a missing node
//         throws, the same way n8n does for a node that did not execute.
// workflow: 'main' (final_improving security) or 'benchmark' (Text-to-SQL Benchmark-02)
function runCodeNode(nodeName, { inputs = [], nodes = {}, workflow = 'main' } = {}) {
  const code = fs.readFileSync(path.join(CODE_DIRS[workflow], `${nodeName}.js`), 'utf8');
  const $input = nodeProxy(inputs);
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Node '${name}' hasn't been executed`);
    return nodeProxy(nodes[name]);
  };
  const logs = [];
  const consoleStub = { log: (...a) => logs.push(a.join(' ')) };
  const $json = $input.first() ? $input.first().json : {};
  const fn = new Function('$input', '$', 'console', '$json', code);
  const result = fn($input, $, consoleStub, $json);
  return { result, json: result[0].json, logs };
}

module.exports = { runCodeNode };
