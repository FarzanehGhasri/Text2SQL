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
// - Skips a catalog whose content and sidecar format are unchanged - no embed
//   calls, no write. That keeps the "indexer-watch" service in
//   docker-compose.yml (reruns this every 60s) a no-op until something changes.
// - Re-embeds only texts that changed: every vector is stored with a hash of
//   the text it came from, and unchanged texts (including entities that only
//   moved to another catalog file) reuse their stored vector.
// - Sends texts to the embeddings service in batches instead of one call each.
// - Deletes sidecars whose catalog file no longer exists, so vectors of a
//   removed catalog are not loaded by BuildPrompt any more.
//
// It never modifies catalog content. n8n's ReadCatalog node already globs
// catalog/*.json, so the sidecars are picked up without any workflow change.
//
// Requires Node 18+ (uses the built-in fetch).

const fs = require('fs');
const path = require('path');
const { loadCatalogs, sidecarPathFor, SIDECAR_SUFFIX } = require('./lib/catalog-loader');
const { validateCatalogs } = require('./lib/catalog-validator');
const { embeddableItems } = require('./lib/catalog-texts');
const { createEmbedClient } = require('./lib/embed-client');
const store = require('./lib/sidecar-store');

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
  const live = new Set(catalogFiles);
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

  const { errors } = validateCatalogs(catalogs);
  const badFiles = new Set(errors.map((e) => e.file));
  for (const e of errors) log(`  INVALID ${e.file}: [${e.rule}] ${e.message}`);

  const client = embedClient || createEmbedClient(options.embedUrl, { batchSize: options.batchSize });
  const existing = new Map(catalogs.map((c) => [c.file, store.readSidecar(sidecarPathFor(c.path))]));
  const cache = force ? new Map() : store.vectorCache([...existing.values()]);
  const summary = { indexed: [], skipped: [], invalid: [], failed: [], embedCalls: 0 };

  removeOrphanSidecars(catalogDir, catalogs.map((c) => c.file), log);

  for (const cat of catalogs) {
    if (badFiles.has(cat.file)) {
      log(`${cat.file}: not indexed - fix the validation errors above (existing sidecar kept)`);
      summary.invalid.push(cat.file);
      continue;
    }
    const hash = store.contentHash(cat.data);
    const sidecar = existing.get(cat.file);
    if (!force && store.isUpToDate(sidecar, hash)) {
      summary.skipped.push(cat.file);
      continue;
    }

    const items = embeddableItems(cat.data);
    if (!force) store.adoptLegacyVectors(sidecar, hash, items, cache);
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
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Embeddings endpoint: ${args.embedUrl}`);
  const summary = await run(args);
  if (summary.failed.length || summary.invalid.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Indexing failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run, parseArgs };
