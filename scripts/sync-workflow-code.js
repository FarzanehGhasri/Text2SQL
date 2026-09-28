#!/usr/bin/env node
// Keeps the n8n workflow JSON and the Code-node sources in n8n_workflows/code/
// in sync. Each file n8n_workflows/code/<Node Name>.js is the source of truth
// for the jsCode of the Code node with exactly that name, so the code can be
// read, diffed and unit-tested as ordinary JavaScript (see tests/) while the
// workflow JSON stays importable into n8n as-is.
//
// Usage (from the repo root):
//   node scripts/sync-workflow-code.js           # write code files into the workflow JSON
//   node scripts/sync-workflow-code.js --check   # exit 1 if they differ (use before committing)
//
// After editing code in the n8n UI instead, export the workflow and run
//   node scripts/sync-workflow-code.js --extract
// to copy the jsCode of every node that has a code file back into that file.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, 'n8n_workflows', 'final_improving security.json');
const CODE_DIR = path.join(ROOT, 'n8n_workflows', 'code');

function loadWorkflow() {
  return JSON.parse(fs.readFileSync(WORKFLOW, 'utf8'));
}

function saveWorkflow(wf) {
  fs.writeFileSync(WORKFLOW, JSON.stringify(wf, null, 2) + '\n');
}

// [{ nodeName, file, code, node }] for every code file; throws if a file has
// no matching Code node, so a renamed node cannot silently stop syncing.
function pairs(wf) {
  return fs
    .readdirSync(CODE_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((file) => {
      const nodeName = file.slice(0, -3);
      const node = wf.nodes.find((n) => n.name === nodeName && n.type === 'n8n-nodes-base.code');
      if (!node) throw new Error(`${file}: no Code node named "${nodeName}" in the workflow`);
      return { nodeName, file, code: fs.readFileSync(path.join(CODE_DIR, file), 'utf8'), node };
    });
}

function outOfSync(wf) {
  return pairs(wf).filter((p) => p.node.parameters.jsCode !== p.code).map((p) => p.nodeName);
}

function main() {
  const mode = process.argv[2] || '--write';
  const wf = loadWorkflow();
  if (mode === '--check') {
    const stale = outOfSync(wf);
    if (stale.length) {
      console.error(`Workflow JSON is out of sync with n8n_workflows/code/ for: ${stale.join(', ')}`);
      console.error('Run: node scripts/sync-workflow-code.js');
      process.exit(1);
    }
    console.log('Workflow JSON and n8n_workflows/code/ are in sync.');
  } else if (mode === '--write') {
    const changed = [];
    for (const p of pairs(wf)) {
      if (p.node.parameters.jsCode !== p.code) {
        p.node.parameters.jsCode = p.code;
        changed.push(p.nodeName);
      }
    }
    if (changed.length) saveWorkflow(wf);
    console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'Already in sync.');
  } else if (mode === '--extract') {
    for (const p of pairs(wf)) fs.writeFileSync(path.join(CODE_DIR, p.file), p.node.parameters.jsCode);
    console.log('Extracted jsCode into n8n_workflows/code/.');
  } else {
    console.error('Usage: node scripts/sync-workflow-code.js [--write|--check|--extract]');
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { outOfSync, loadWorkflow, CODE_DIR, WORKFLOW };
