// Runs the source of an n8n Code node ("Run Once for All Items" mode) outside
// n8n, with just the globals those nodes use: $input, $('Node Name') and
// console. Lets tests drive BuildPrompt and Security with fake upstream data.

const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '..', '..', 'n8n_workflows', 'code');

const itemsOf = (value) => (Array.isArray(value) ? value : [value]).map((json) => ({ json }));

function nodeProxy(json) {
  const items = itemsOf(json);
  return { first: () => items[0], all: () => items, last: () => items[items.length - 1] };
}

// inputs: array of item json objects for $input
// nodes:  { 'Node Name': json | json[] } for $('Node Name'); a missing node
//         throws, the same way n8n does for a node that did not execute.
function runCodeNode(nodeName, { inputs = [], nodes = {} } = {}) {
  const code = fs.readFileSync(path.join(CODE_DIR, `${nodeName}.js`), 'utf8');
  const $input = nodeProxy(inputs);
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Node '${name}' hasn't been executed`);
    return nodeProxy(nodes[name]);
  };
  const logs = [];
  const consoleStub = { log: (...a) => logs.push(a.join(' ')) };
  const fn = new Function('$input', '$', 'console', code);
  const result = fn($input, $, consoleStub);
  return { result, json: result[0].json, logs };
}

module.exports = { runCodeNode };
