#!/usr/bin/env node
// Builds vault-index/vault.embeddings.json: the Obsidian notes as search pieces, one embedding vector per
// piece, plus who may see each piece. catalog-service searches it for questions about the notes (POST /notes).
//   - every table: ONE piece from the catalog - description, synonyms, visible columns, joins in and out
//     (scripts/lib/table-pieces.js); a table is never split
//   - every other note: cut at ## headings (scripts/lib/vault-notes.js)
//
// Usage (from the repo root; indexer-watch runs it every minute):
//   node scripts/index-vault-embeddings.js
//   node scripts/index-vault-embeddings.js --quiet          (address from EMBED_URL, or --embed-url)
//   node scripts/index-vault-embeddings.js --force        # re-embed everything (e.g. after changing the embedding model)
//
// What a run does:
// - Reads the vault: Inbox/ (real users' questions) and CLAUDE.md are skipped; `hidden` columns never appear
//   (table pieces list only the columns the model may see).
// - Copies the catalog permissions from catalog/*.json - the same ones Text2SQL uses - so Find Notes shows a
//   user only the tables they may query.
// - Does nothing when no note and no permission changed; otherwise embeds only the pieces whose text changed.
// - Never writes a half-built index: if the embeddings service fails, the previous file is kept.
//
// Requires Node 18+ (uses the built-in fetch).

const fs = require('fs');
const path = require('path');
const { readVault, chunkVault, VAULT_DIR } = require('./lib/vault-notes');
const { tablePieces } = require('./lib/table-pieces');
const { loadCatalogs } = require('./lib/catalog-loader');
const { createEmbedClient } = require('./lib/embed-client');
const store = require('./lib/vault-index-store');

const ROOT = path.join(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'vault-index', 'vault.embeddings.json');

function parseArgs(argv) {
  const args = {
    vaultDir: VAULT_DIR,
    catalogDir: path.join(ROOT, 'catalog'),
    out: INDEX_FILE,
    embedUrl: process.env.EMBED_URL || 'http://localhost:11434/api/embed?model=bge-m3',   // EMBED_URL is set in docker-compose.yml
    force: false,
    quiet: false,
    batchSize: 32,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--vault-dir') args.vaultDir = argv[++i];
    else if (argv[i] === '--catalog-dir') args.catalogDir = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--embed-url') args.embedUrl = argv[++i];
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--quiet') args.quiet = true;
    else if (argv[i] === '--batch-size') args.batchSize = Number(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/index-vault-embeddings.js [--embed-url <url>] [--force] [--quiet] [--vault-dir <dir>] [--catalog-dir <dir>] [--out <file>]');
      process.exit(0);
    }
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) throw new Error('--batch-size must be a positive integer');
  return args;
}

const catalogsIn = (catalogDir) => loadCatalogs(catalogDir).filter((c) => c.data && c.data.domain).map((c) => c.data);

// { <domain>: permissions } from the valid catalog files; a domain without a catalog file is visible to nobody
function catalogPermissions(catalogDir) {
  const out = {};
  for (const c of catalogsIn(catalogDir)) out[c.domain] = c.permissions || {};
  return out;
}

// Returns { status: 'skipped' | 'indexed' | 'failed', chunks, embedded }. `embedClient` can be injected for tests.
async function run(options, { embedClient, log = console.log } = {}) {
  const chunks = [...tablePieces(catalogsIn(options.catalogDir)), ...chunkVault(readVault(options.vaultDir))];
  if (!chunks.length) throw new Error(`No notes found in ${options.vaultDir}`);
  const permissions = catalogPermissions(options.catalogDir);
  const hash = store.itemsHash(chunks, permissions);
  const existing = store.readIndex(options.out);
  if (!options.force && store.isUpToDate(existing, hash)) {
    if (!options.quiet) log(`${path.basename(options.out)}: up to date (${chunks.length} pieces)`);
    return { status: 'skipped', chunks: chunks.length, embedded: 0 };
  }

  const cache = options.force ? new Map() : store.vectorCache(existing);
  const missing = [...new Map(chunks.map((c) => [store.textHash(c.text), c.text]).filter(([h]) => !cache.has(h))).entries()];
  try {
    if (missing.length) {
      const client = embedClient || createEmbedClient(options.embedUrl, { batchSize: options.batchSize });
      const vectors = await client.embedMany(missing.map(([, text]) => text));
      missing.forEach(([h], i) => cache.set(h, vectors[i]));
    }
    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    store.writeIndex(options.out, store.buildIndex({ chunks, permissions, hash, vectorOf: (h) => cache.get(h) }));
    log(`${path.basename(options.out)}: wrote ${chunks.length} pieces (${missing.length} embedded, ${chunks.length - missing.length} reused)`);
    return { status: 'indexed', chunks: chunks.length, embedded: missing.length };
  } catch (err) {
    log(`${path.basename(options.out)}: FAILED - ${err.message} (previous index kept)`);
    return { status: 'failed', chunks: chunks.length, embedded: 0 };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await run(args);
  if (summary.status === 'failed') process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Vault indexing failed:', err.message);
    process.exit(1);
  });
}

module.exports = { run, parseArgs, catalogPermissions, INDEX_FILE };
