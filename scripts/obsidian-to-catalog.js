#!/usr/bin/env node
// Obsidian -> the model. The notes in obsidian/Catalog are the catalog; this turns them into catalog/*.json,
// the files catalog-service searches on every question. Runs by itself in the indexer-watch container every
// minute (docker-compose.yml), so an edit saved in Obsidian reaches the model within about a minute.
//
//   catalog/<domain>.json  <- obsidian/Catalog/<domain>/<domain>.md + the table notes it lists
//   catalog/rules.json     <- obsidian/Catalog/Rules for every question.md
//
// Safe by design: if any note cannot be read, or the result breaks a catalog rule (scripts/lib/catalog-validator.js),
// NOTHING is written - n8n keeps the last good catalog - and the problem is listed in Obsidian
// (Inbox/System check.md) with the note it is in.
//
// Usage: node scripts/obsidian-to-catalog.js [--check] [--quiet]
//   --check  only compare: exit 1 when catalog/*.json is not what the notes say (used by npm test / before a commit)

const fs = require('fs');
const path = require('path');
const { fromNotes } = require('./lib/catalog-notes');
const { validateCatalogs } = require('./lib/catalog-validator');
const { loadQueryBank } = require('./lib/query-bank');
const { loadCatalogs } = require('./lib/catalog-loader');

const ROOT = path.join(__dirname, '..');
const PATHS = { notesDir: path.join(ROOT, 'obsidian', 'Catalog'), catalogDir: path.join(ROOT, 'catalog') };
const RULES_FILE = 'rules.json';

// { 'sales/Fact_Sales.md': text, ... }
function readNotes(dir) {
  const out = {};
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (f.name.startsWith('.')) continue;
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.md')) out[path.relative(dir, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

const json = (data) => JSON.stringify(data, null, 2) + '\n';

// { errors: [{ note, message }], files: { 'sales.json': text }, changed: [names], orphans: [names] }
function build(paths = PATHS) {
  const { catalogs, rules, errors } = fromNotes(readNotes(paths.notesDir));
  const files = {};
  for (const c of catalogs) files[`${c.domain}.json`] = json(c.data);
  files[RULES_FILE] = json({ globalRules: true, rules });
  if (!catalogs.length) errors.push({ note: 'Catalog/', message: 'no domain notes found (type: domain)' });

  if (!errors.length) {
    const asLoaded = catalogs.map((c) => ({ file: `${c.domain}.json`, path: path.join(paths.catalogDir, `${c.domain}.json`), data: c.data }));
    const v = validateCatalogs(asLoaded, { queryBank: loadQueryBank(paths.catalogDir) });
    for (const e of v.errors) errors.push({ note: noteFor(e), message: e.message });
  }
  const current = (f) => { const p = path.join(paths.catalogDir, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
  const changed = Object.keys(files).filter((f) => current(f) !== files[f]);
  // catalog files with no domain note: still read by n8n, so say so
  const orphans = loadCatalogs(paths.catalogDir).filter((c) => c.data && !(c.file in files)).map((c) => c.file);
  return { errors, files, changed, orphans };
}

// the validator speaks of files and entities; point to the note instead
function noteFor(e) {
  const domain = String(e.file || '').replace(/\.json$/, '');
  return e.entity ? `${domain}/${e.entity}.md` : `${domain}/${domain}.md`;
}

function write(paths, result) {
  for (const f of result.changed) fs.writeFileSync(path.join(paths.catalogDir, f), result.files[f]);
}

function main() {
  const check = process.argv.includes('--check');
  const quiet = process.argv.includes('--quiet');
  const r = build(PATHS);
  for (const e of r.errors) console.error(`⛔ ${e.note}: ${e.message}`);
  if (r.errors.length) {
    console.error(`${r.errors.length} problem(s) in obsidian/Catalog - nothing written; n8n keeps the last good catalog.`);
    process.exit(1);
  }
  for (const o of r.orphans) console.warn(`⚠️ catalog/${o} has no domain note in obsidian/Catalog (n8n still reads it).`);
  if (check) {
    if (r.changed.length) {
      console.error(`catalog/ is not what the Obsidian notes say: ${r.changed.join(', ')}. Run: node scripts/obsidian-to-catalog.js`);
      process.exit(1);
    }
    if (!quiet) console.log('catalog/*.json matches the Obsidian notes.');
    return;
  }
  write(PATHS, r);
  if (r.changed.length) console.log(`Obsidian -> catalog: updated ${r.changed.join(', ')}`);
  else if (!quiet) console.log('Obsidian -> catalog: nothing changed.');
}

if (require.main === module) main();

module.exports = { build, write, readNotes, PATHS };
