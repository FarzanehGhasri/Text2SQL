#!/usr/bin/env node
// Writes obsidian/Schema.md (every table the model knows, by domain) from catalog/*.json. Runs in indexer-watch
// right after obsidian-to-catalog.js, so the page follows every catalog edit within a minute.
//
// Usage: node scripts/build-schema-note.js [--check] [--quiet]
//   --check  only compare: exit 1 when obsidian/Schema.md is not what the catalogs say (npm test checks it too)

const fs = require('fs');
const path = require('path');
const { loadCatalogs } = require('./lib/catalog-loader');
const { schemaNote } = require('./lib/schema-note');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'obsidian', 'Schema.md');

const generate = (catalogDir = path.join(ROOT, 'catalog')) => schemaNote(loadCatalogs(catalogDir).filter((c) => c.data).map((c) => c.data));

function main() {
  const args = process.argv.slice(2);
  const text = generate();
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (args.includes('--check')) {
    if (current !== text) { console.error('obsidian/Schema.md is out of date. Run: node scripts/build-schema-note.js'); process.exit(1); }
    console.log('obsidian/Schema.md is up to date.');
  } else if (current !== text) {
    fs.writeFileSync(OUT, text);
    console.log('obsidian/Schema.md: updated');
  } else if (!args.includes('--quiet')) {
    console.log('obsidian/Schema.md: nothing changed');
  }
}

if (require.main === module) main();

module.exports = { generate, OUT };
