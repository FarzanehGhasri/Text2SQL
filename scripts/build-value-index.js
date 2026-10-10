#!/usr/bin/env node
// Builds catalog/values.json - the stored values BuildPrompt recognises in
// questions - from the result of sql/extract_values.sql (see
// scripts/generate-value-sql.js for the whole procedure).
//
// Usage: node scripts/build-value-index.js --input values.csv [--out catalog/values.json] [--max-per-column 5000]
//        (--input may also be a JSON array of { entity, column, value, rows, key_value })
//
// Output shape (what BuildPrompt reads is marked *):
//   { valueIndex*: true, formatVersion, generatedAt, sourceRows,
//     columns*: [{ entity*, column*, key*, distinct*, values*: [[value, rows, keyValue|null, norm?], ...] }] }
// norm = the value as BuildPrompt matches it (Persian-normalised, plural «ها» dropped,
// punctuation removed); stored only when it differs from the value, so BuildPrompt does
// not normalise ~100k values on every question.
// key = the dimension's key column (what other tables join to), when it has one.
// Values are trimmed (nchar padding), merged after trimming, most frequent first.
// Rows for entities/columns that are not (or no longer) exposed in the catalogs
// are dropped, so a stale export can never put a hidden column's data in a prompt.
//
// The file holds real warehouse data: catalog/ is git-ignored, never force-add it.
// n8n's ReadCatalog globs catalog/*.json, so no workflow change is needed.

const fs = require('fs');
const path = require('path');
const { loadCatalogs } = require('./lib/catalog-loader');
const { parseCsv } = require('./lib/csv');
const { valueColumns } = require('./lib/value-columns');
const { lexNorm } = require('./lib/persian-text');

const ROOT = path.join(__dirname, '..');
const FORMAT_VERSION = 1;
// Must equal valueNorm in n8n_workflows/code/BuildPrompt.js (tests/value-index.test.js checks it).
const valueNorm = (s) => lexNorm(s).replace(/[؟?!.,،؛:;«»"'()\[\]{}\-_/\\]/g, ' ').replace(/\s+/g, ' ').trim();

function parseArgs(argv) {
  const args = { input: null, out: path.join(ROOT, 'catalog', 'values.json'), catalogDir: path.join(ROOT, 'catalog'), maxPerColumn: 5000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--catalog-dir') args.catalogDir = argv[++i];
    else if (a === '--max-per-column') args.maxPerColumn = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/build-value-index.js --input <values.csv|values.json> [--out <file>] [--max-per-column <n>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.input) throw new Error('--input is required (the saved result of sql/extract_values.sql)');
  return args;
}

function readRows(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.json$/i.test(file)) return JSON.parse(text.replace(/^﻿/, ''));
  return parseCsv(text);
}

// rows: [{ entity, column, value, rows, key_value }] -> { index, dropped: ["Entity.Column", ...] }
function buildIndex(rows, catalogs, { maxPerColumn = 5000 } = {}) {
  const exposed = new Set();
  for (const c of catalogs) {
    for (const e of c.entities || []) {
      for (const col of e.columns || []) if (col.exposed !== false) exposed.add(`${e.name}\u0000${col.name}`);
    }
  }
  const keyOf = new Map(valueColumns(catalogs).map((vc) => [`${vc.entity}\u0000${vc.column}`, vc.key]));
  const byColumn = new Map();
  const dropped = new Set();
  for (const r of rows) {
    const entity = String(r.entity || '').trim();
    const column = String(r.column || '').trim();
    const value = String(r.value == null ? '' : r.value).trim();
    if (!entity || !column || !value) continue;
    const k = `${entity}\u0000${column}`;
    if (!exposed.has(k)) { dropped.add(`${entity}.${column}`); continue; }
    if (!byColumn.has(k)) byColumn.set(k, { entity, column, values: new Map() });
    const vals = byColumn.get(k).values;
    const n = Number(r.rows) || 0;
    const key = r.key_value === '' || r.key_value == null ? null : String(r.key_value).trim();
    const prev = vals.get(value);
    // two raw values that only differ in padding are one value; keep the key only if it agrees
    vals.set(value, prev ? [value, prev[1] + n, prev[2] === key ? key : null] : [value, n, key]);
  }
  const columns = [...byColumn.values()].map((c) => {
    const values = [...c.values.values()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const key = keyOf.get(`${c.entity}\u0000${c.column}`) || null;
    const withNorm = values.slice(0, maxPerColumn).map((v) => {
      const n = valueNorm(v[0]);
      return n === v[0] ? v : [...v, n];
    });
    return { entity: c.entity, column: c.column, key, distinct: values.length, values: withNorm };
  }).sort((a, b) => a.entity.localeCompare(b.entity) || a.column.localeCompare(b.column));
  return {
    index: { valueIndex: true, formatVersion: FORMAT_VERSION, generatedAt: new Date().toISOString(), sourceRows: rows.length, columns },
    dropped: [...dropped].sort(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalogs = loadCatalogs(args.catalogDir).filter((c) => c.data).map((c) => c.data);
  const rows = readRows(args.input);
  const { index, dropped } = buildIndex(rows, catalogs, args);
  fs.writeFileSync(args.out, JSON.stringify(index));
  const total = index.columns.reduce((n, c) => n + c.values.length, 0);
  console.log(`${rows.length} rows -> ${index.columns.length} columns, ${total} values -> ${path.relative(ROOT, args.out)}`
    + ` (${Math.round(fs.statSync(args.out).size / 1024)} KB)`);
  if (dropped.length) console.log(`Dropped (not an exposed catalog column any more): ${dropped.join(', ')}`);
}

if (require.main === module) {
  try { main(); } catch (err) { console.error('build-value-index failed:', err.message); process.exit(1); }
}

module.exports = { buildIndex, valueNorm, FORMAT_VERSION };
