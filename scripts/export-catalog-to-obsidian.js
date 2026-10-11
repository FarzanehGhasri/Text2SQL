#!/usr/bin/env node
// Rebuilds obsidian/Catalog from catalog/*.json - the reverse of scripts/obsidian-to-catalog.js.
//
// The Obsidian notes are the catalog now: edit them, and indexer-watch turns them into catalog/*.json.
// This script is only for recovery (notes lost or broken) or for a catalog/*.json written by another tool:
// it OVERWRITES every catalog note, so edits made in Obsidian since the last import are lost.
//
// Usage (from the repo root):
//   node scripts/export-catalog-to-obsidian.js --overwrite-notes

const fs = require('fs');
const path = require('path');
const { loadCatalogs } = require('./lib/catalog-loader');
const { toNotes } = require('./lib/catalog-notes');
const { readNotes } = require('./obsidian-to-catalog');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'obsidian', 'Catalog');
const CATALOG_DIR = path.join(ROOT, 'catalog');

function loadRules() {
  const p = path.join(CATALOG_DIR, 'rules.json');
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')).rules || []) : [];
}

function main() {
  if (!process.argv.includes('--overwrite-notes')) {
    console.error('This overwrites every note in obsidian/Catalog with catalog/*.json (edits made in Obsidian are lost).\n'
      + 'To edit the catalog, edit the notes instead. To really rebuild them: --overwrite-notes');
    process.exit(2);
  }
  const catalogs = loadCatalogs(CATALOG_DIR).filter((c) => c.data).map((c) => c.data);
  const files = toNotes(catalogs, loadRules());
  const stale = Object.keys(readNotes(OUT_DIR)).filter((f) => !(f in files));
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(OUT_DIR, f)), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, f), text);
  }
  for (const f of stale) fs.unlinkSync(path.join(OUT_DIR, f));
  console.log(`Wrote ${Object.keys(files).length} notes to obsidian/Catalog${stale.length ? `, removed ${stale.length}` : ''}.`);
}

if (require.main === module) main();

module.exports = { OUT_DIR };
