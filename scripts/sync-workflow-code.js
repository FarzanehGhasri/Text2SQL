#!/usr/bin/env node
// Keeps n8n workflow JSON files and their Code-node sources in sync. Each file
// <code dir>/<Node Name>.js is the source of truth for the jsCode of the Code
// node with exactly that name in its workflow, so the code can be read, diffed
// and unit-tested as ordinary JavaScript (see tests/) while the workflow JSON
// stays importable into n8n as-is.
//
//   n8n_workflows/code/            -> n8n_workflows/final_improving security.json
//   n8n_workflows/code-benchmark/  -> n8n_workflows/Text-to-SQL Benchmark-02.json
//
// Usage (from the repo root):
//   node scripts/sync-workflow-code.js           # write code files into the workflow JSON
//   node scripts/sync-workflow-code.js --check   # exit 1 if they differ (use before committing)
//   node scripts/sync-workflow-code.js --extract # copy jsCode edited in the n8n UI back into the files
//
// "Load Questions.js" is itself generated from benchmark/02/questions.json by
// scripts/build-benchmark-questions.js; run that first when the questions change.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGETS = [
  { workflow: 'final_improving security.json', codeDir: 'code' },
  { workflow: 'Text-to-SQL Benchmark-02.json', codeDir: 'code-benchmark' },
].map((t) => ({
  workflowPath: path.join(ROOT, 'n8n_workflows', t.workflow),
  codeDir: path.join(ROOT, 'n8n_workflows', t.codeDir),
}));

function loadWorkflow(target = TARGETS[0]) {
  return JSON.parse(fs.readFileSync(target.workflowPath, 'utf8'));
}

function saveWorkflow(target, wf) {
  fs.writeFileSync(target.workflowPath, JSON.stringify(wf, null, 2) + '\n');
}

// [{ nodeName, file, code, node }] for every code file; throws if a file has
// no matching Code node, so a renamed node cannot silently stop syncing.
function pairs(target, wf) {
  return fs
    .readdirSync(target.codeDir)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((file) => {
      const nodeName = file.slice(0, -3);
      const node = wf.nodes.find((n) => n.name === nodeName && n.type === 'n8n-nodes-base.code');
      if (!node) throw new Error(`${file}: no Code node named "${nodeName}" in ${path.basename(target.workflowPath)}`);
      return { nodeName, file, code: fs.readFileSync(path.join(target.codeDir, file), 'utf8'), node };
    });
}

// Names of out-of-sync nodes across all workflows, as "<workflow>: <node>".
function outOfSync() {
  return TARGETS.flatMap((t) => {
    const wf = loadWorkflow(t);
    return pairs(t, wf)
      .filter((p) => p.node.parameters.jsCode !== p.code)
      .map((p) => `${path.basename(t.workflowPath)}: ${p.nodeName}`);
  });
}

function main() {
  const mode = process.argv[2] || '--write';
  if (mode === '--check') {
    const stale = outOfSync();
    if (stale.length) {
      console.error(`Workflow JSON is out of sync with its code files for:\n  ${stale.join('\n  ')}`);
      console.error('Run: node scripts/sync-workflow-code.js');
      process.exit(1);
    }
    console.log('Workflow JSON files and their code files are in sync.');
  } else if (mode === '--write') {
    for (const t of TARGETS) {
      const wf = loadWorkflow(t);
      const changed = [];
      for (const p of pairs(t, wf)) {
        if (p.node.parameters.jsCode !== p.code) {
          p.node.parameters.jsCode = p.code;
          changed.push(p.nodeName);
        }
      }
      if (changed.length) saveWorkflow(t, wf);
      console.log(`${path.basename(t.workflowPath)}: ${changed.length ? `updated ${changed.join(', ')}` : 'already in sync'}`);
    }
  } else if (mode === '--extract') {
    for (const t of TARGETS) {
      const wf = loadWorkflow(t);
      for (const p of pairs(t, wf)) fs.writeFileSync(path.join(t.codeDir, p.file), p.node.parameters.jsCode);
    }
    console.log('Extracted jsCode into the code directories.');
  } else {
    console.error('Usage: node scripts/sync-workflow-code.js [--write|--check|--extract]');
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { outOfSync, loadWorkflow, TARGETS };
