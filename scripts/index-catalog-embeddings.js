#!/usr/bin/env node
// Builds a sidecar "<catalog-file>.embeddings.json" next to each catalog/*.json
// file, so BuildPrompt's semantic scoring (SEMANTIC_WEIGHT) has real vectors to
// compare the question against instead of always scoring 0.
//
// Usage (from the repo root, with `docker compose up` running so the
// embeddings service is reachable on the host):
//   node scripts/index-catalog-embeddings.js
//   node scripts/index-catalog-embeddings.js --catalog-dir ./catalog --embed-url http://localhost:8080/embed
//   node scripts/index-catalog-embeddings.js --force   # rebuild even if content is unchanged
//
// Each catalog/*.json file is re-embedded only when its content actually
// changed: every sidecar stores a contentHash of the source file, and a run
// that finds a matching hash skips that file entirely (no embed calls, no
// write). That makes this script cheap and safe to run on a schedule instead
// of by hand - see the "indexer-watch" service in docker-compose.yml, which
// reruns this every 60s in a loop and only ever does real work when a
// catalog/*.json file (entities, columns, descriptions, synonyms) actually
// changed. It does not read or write catalog content itself - it only
// produces sidecar files. n8n's ReadCatalog node already globs
// catalog/*.json, so no workflow rewiring is needed: the sidecar is picked up
// automatically the next time BuildPrompt runs.
//
// Requires Node 18+ (uses the built-in fetch).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const args = {
    catalogDir: path.join(__dirname, '..', 'catalog'),
    embedUrl: 'http://localhost:8080/embed',
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--catalog-dir') args.catalogDir = argv[++i];
    else if (argv[i] === '--embed-url') args.embedUrl = argv[++i];
    else if (argv[i] === '--force') args.force = true;
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/index-catalog-embeddings.js [--catalog-dir <dir>] [--embed-url <url>] [--force]');
      process.exit(0);
    }
  }
  return args;
}

function contentHash(raw) {
  return crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
}

async function embed(embedUrl, text) {
  const res = await fetch(embedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text }),
  });
  if (!res.ok) {
    throw new Error(`embed request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  // text-embeddings-inference returns [[...]] for a single input on some
  // versions and [...] on others - accept both.
  const vec = Array.isArray(data[0]) ? data[0] : data;
  if (!Array.isArray(vec) || typeof vec[0] !== 'number') {
    throw new Error('unexpected embedding response shape: ' + JSON.stringify(data).slice(0, 200));
  }
  return vec;
}

function entityText(ent) {
  const parts = [ent.name, ent.description_fa || '', ...(ent.synonyms_fa || [])];
  return parts.filter(Boolean).join(' — ');
}

function columnText(col) {
  const parts = [col.alias || col.name, col.description_fa || '', ...(col.synonyms_fa || [])];
  return parts.filter(Boolean).join(' — ');
}

async function indexCatalogFile(filePath, embedUrl, force) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw.entities)) {
    return null; // not a catalog file (e.g. an existing embeddings sidecar) - skip
  }

  const hash = contentHash(raw);
  const outPath = filePath.replace(/\.json$/, '.embeddings.json');
  if (!force && fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (existing.contentHash === hash) {
        return { unchanged: true };
      }
    } catch (e) {
      // corrupt or pre-hash sidecar - fall through and rebuild it
    }
  }

  const vectors = {};
  for (const ent of raw.entities) {
    process.stdout.write(`  entity ${ent.name} ... `);
    vectors[ent.name] = { embedding: await embed(embedUrl, entityText(ent)) };

    const columns = {};
    for (const col of ent.columns || []) {
      if (col.exposed === false) continue;
      columns[col.name] = { embedding: await embed(embedUrl, columnText(col)) };
    }
    if (Object.keys(columns).length) vectors[ent.name].columns = columns;
    console.log('ok');
  }

  const dim = Object.values(vectors)[0]?.embedding?.length || null;
  return {
    embeddingIndex: true,
    sourceFile: path.basename(filePath),
    contentHash: hash,
    generatedAt: new Date().toISOString(),
    dim,
    vectors,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.catalogDir)) {
    console.error(`Catalog directory not found: ${args.catalogDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(args.catalogDir)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.embeddings.json'))
    .map((f) => path.join(args.catalogDir, f));

  if (files.length === 0) {
    console.error(`No catalog *.json files found in ${args.catalogDir}`);
    process.exit(1);
  }

  console.log(`Embeddings endpoint: ${args.embedUrl}`);
  for (const file of files) {
    console.log(`Indexing ${file}`);
    let index;
    try {
      index = await indexCatalogFile(file, args.embedUrl, args.force);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      process.exitCode = 1;
      continue;
    }
    if (!index) {
      console.log('  skipped (no "entities" array)');
      continue;
    }
    if (index.unchanged) {
      console.log('  up to date, skipped (content unchanged)');
      continue;
    }
    const outPath = file.replace(/\.json$/, '.embeddings.json');
    fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
    console.log(`  wrote ${outPath} (${Object.keys(index.vectors).length} entities, dim=${index.dim})`);
  }
}

main().catch((err) => {
  console.error('Indexing failed:', err.message);
  process.exit(1);
});
