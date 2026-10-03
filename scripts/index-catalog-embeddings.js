#!/usr/bin/env node
// Builds a sidecar "<catalog-file>.embeddings.json" next to each catalog/*.json
// file, so BuildPrompt's semantic scoring (SEMANTIC_WEIGHT) has real vectors to
// compare the question against instead of always scoring 0.
//
// Usage (from the repo root, with `docker compose up` running so the
// embeddings service is reachable on the host):
//   node scripts/index-catalog-embeddings.js
//   node scripts/index-catalog-embeddings.js --catalog-dir ./catalog --embed-url http://localhost:8080/embed
//   node scripts/index-catalog-embeddings.js --force        # re-embed everything (e.g. after changing the embedding model)
//   node scripts/index-catalog-embeddings.js --batch-size 16
//
// What a run does:
// - Validates all catalogs first (scripts/lib/catalog-validator.js). A catalog
//   with validation errors is not indexed; its existing sidecar is left alone.
// - Builds the embedding units from scripts/lib/catalog-texts.js: one "table
//   card" per entity plus one vector per distinctive column. Which columns are
//   generic is decided across ALL catalogs, so it is computed once up front.
// - Skips a catalog whose sidecar already holds exactly the texts the recipe
//   produces now - no embed calls, no write. That keeps the "indexer-watch"
//   service in docker-compose.yml (reruns this every 60s) a no-op until
//   something changes.
// - Re-embeds only texts that changed: every vector is stored with a hash of
//   the text it came from, and unchanged texts (including entities that only
//   moved to another catalog file) reuse their stored vector.
// - Sends texts to the embeddings service in batches instead of one call each.
// - Deletes sidecars whose catalog file no longer exists, so vectors of a
//   removed catalog are not loaded by BuildPrompt any more.
// - Embeds every example QUESTION (catalog "examples" + catalog/query_bank.json)
//   into catalog/query_bank.embeddings.json, which BuildPrompt uses to pick the
//   examples most similar to the user's question. Same reuse/skip rules; not
//   written when the bank has validation errors (the old file is kept).
//
// It never modifies catalog content. n8n's ReadCatalog node already globs
// catalog/*.json, so the sidecars are picked up without any workflow change.
//
// Requires Node 18+ (uses the built-in fetch).

const fs = require('fs');
const path = require('path');
const { loadCatalogs, sidecarPathFor, SIDECAR_SUFFIX } = require('./lib/catalog-loader');
const { validateCatalogs } = require('./lib/catalog-validator');
const { embeddableItems, buildGenericIndex } = require('./lib/catalog-texts');
const { createEmbedClient } = require('./lib/embed-client');
const store = require('./lib/sidecar-store');
const { loadQueryBank, allExamples, QUERY_BANK_FILE } = require('./lib/query-bank');
const { textHash } = require('./lib/catalog-texts');

const EXAMPLE_SIDECAR = QUERY_BANK_FILE.replace(/\.json$/, SIDECAR_SUFFIX);

function parseArgs(argv) {
  const args = {
    catalogDir: path.join(__dirname, '..', 'catalog'),
    embedUrl: 'http://localhost:8080/embed',
    force: false,
    batchSize: 32,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--catalog-dir') args.catalogDir = argv[++i];
    else if (argv[i] === '--embed-url') args.embedUrl = argv[++i];
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--batch-size') args.batchSize = Number(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/index-catalog-embeddings.js [--catalog-dir <dir>] [--embed-url <url>] [--force] [--batch-size <n>]');
      process.exit(0);
    }
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) throw new Error('--batch-size must be a positive integer');
  return args;
}

function removeOrphanSidecars(catalogDir, catalogFiles, log) {
  // the example index belongs to all catalogs' examples, not to one catalog file
  const live = new Set([...catalogFiles, QUERY_BANK_FILE]);
  for (const f of fs.readdirSync(catalogDir)) {
    if (!f.endsWith(SIDECAR_SUFFIX)) continue;
    const source = f.slice(0, -SIDECAR_SUFFIX.length) + '.json';
    if (!live.has(source)) {
      fs.unlinkSync(path.join(catalogDir, f));
      log(`Removed ${f} (its catalog ${source} no longer exists)`);
    }
  }
}

// Returns { indexed, skipped, invalid, failed, embedCalls }. `embedClient` can
// be injected for tests.
async function run(options, { embedClient, log = console.log } = {}) {
  const { catalogDir, force } = options;
  if (!fs.existsSync(catalogDir)) throw new Error(`Catalog directory not found: ${catalogDir}`);

  const catalogs = loadCatalogs(catalogDir);
  if (catalogs.length === 0) throw new Error(`No catalog *.json files found in ${catalogDir}`);

  const bank = loadQueryBank(catalogDir);
  const { errors } = validateCatalogs(catalogs, { queryBank: bank });
  const badFiles = new Set(errors.map((e) => e.file));
  for (const e of errors) log(`  INVALID ${e.file}: [${e.rule}] ${e.message}`);

  const client = embedClient || createEmbedClient(options.embedUrl, { batchSize: options.batchSize });
  const existing = new Map(catalogs.map((c) => [c.file, store.readSidecar(sidecarPathFor(c.path))]));
  const exampleSidecarPath = path.join(catalogDir, EXAMPLE_SIDECAR);
  const existingExamples = store.readExampleSidecar(exampleSidecarPath);
  const cache = force ? new Map() : store.vectorCache([...existing.values(), existingExamples]);
  const generic = buildGenericIndex(catalogs.filter((c) => c.data).map((c) => c.data));
  const summary = { indexed: [], skipped: [], invalid: [], failed: [], embedCalls: 0, examples: null };

  removeOrphanSidecars(catalogDir, catalogs.map((c) => c.file), log);

  for (const cat of catalogs) {
    if (badFiles.has(cat.file)) {
      log(`${cat.file}: not indexed - fix the validation errors above (existing sidecar kept)`);
      summary.invalid.push(cat.file);
      continue;
    }
    const items = embeddableItems(cat.data, generic);
    const hash = store.itemsHash(items);
    if (!force && store.isUpToDate(existing.get(cat.file), hash)) {
      summary.skipped.push(cat.file);
      continue;
    }

    const missing = [...new Map(items.filter((it) => !cache.has(it.hash)).map((it) => [it.hash, it.text])).entries()];

    try {
      if (missing.length) {
        const before = client.requests;
        const vectors = await client.embedMany(missing.map(([, text]) => text));
        missing.forEach(([h], i) => cache.set(h, vectors[i]));
        summary.embedCalls += client.requests - before;
      }
      const out = store.buildSidecar({ sourceFile: cat.file, hash, items, vectorOf: (h) => cache.get(h) });
      store.writeSidecar(sidecarPathFor(cat.path), out);
      log(`${cat.file}: wrote ${path.basename(sidecarPathFor(cat.path))} - ${items.length} vectors `
        + `(${missing.length} embedded, ${items.length - missing.length} reused), dim=${out.dim}`);
      summary.indexed.push(cat.file);
    } catch (err) {
      log(`${cat.file}: FAILED - ${err.message}`);
      summary.failed.push(cat.file);
    }
  }
  if (summary.skipped.length) log(`Up to date, skipped: ${summary.skipped.join(', ')}`);

  summary.examples = await indexExamples({
    catalogs, bank, badFiles, client, cache, force, existing: existingExamples, outPath: exampleSidecarPath, log,
  });
  summary.embedCalls += summary.examples.embedCalls || 0;
  return summary;
}

// One vector per distinct example question. Returns { status, count, embedCalls }
// with status: none | invalid | skipped | indexed | failed.
async function indexExamples({ catalogs, bank, badFiles, client, cache, force, existing, outPath, log }) {
  if (badFiles.has(QUERY_BANK_FILE)) {
    log(`${QUERY_BANK_FILE}: examples not indexed - fix the validation errors above (existing ${EXAMPLE_SIDECAR} kept)`);
    return { status: 'invalid', count: 0 };
  }
  const usable = catalogs.filter((c) => c.data && !badFiles.has(c.file)).map((c) => c.data);
  const questions = [...new Set(allExamples(usable, bank && bank.data).map((ex) => ex.q))];
  if (!questions.length) {
    if (fs.existsSync(outPath)) { fs.unlinkSync(outPath); log(`Removed ${EXAMPLE_SIDECAR} (no examples left)`); }
    return { status: 'none', count: 0 };
  }
  const items = questions.map((q) => ({ text: q, hash: textHash(q) }));
  const hash = store.itemsHash(items.map((it) => ({ entity: it.text, column: null, hash: it.hash })));
  if (!force && store.isExampleSidecarUpToDate(existing, hash)) return { status: 'skipped', count: items.length };

  const missing = items.filter((it) => !cache.has(it.hash));
  try {
    const before = client.requests;
    if (missing.length) {
      const vectors = await client.embedMany(missing.map((it) => it.text));
      missing.forEach((it, i) => cache.set(it.hash, vectors[i]));
    }
    fs.writeFileSync(outPath, JSON.stringify(store.buildExampleSidecar({ hash, items, vectorOf: (h) => cache.get(h) })));
    log(`examples: wrote ${EXAMPLE_SIDECAR} - ${items.length} questions (${missing.length} embedded, ${items.length - missing.length} reused)`);
    return { status: 'indexed', count: items.length, embedCalls: client.requests - before };
  } catch (err) {
    log(`examples: FAILED - ${err.message}`);
    return { status: 'failed', count: 0 };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Embeddings endpoint: ${args.embedUrl}`);
  const summary = await run(args);
  if (summary.failed.length || summary.invalid.length || ['failed', 'invalid'].includes(summary.examples.status)) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Indexing failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run, parseArgs };
