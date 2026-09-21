#!/usr/bin/env node
// Builds a sidecar "<catalog-file>.embeddings.json" next to each catalog/*.json
// file, so BuildPrompt's semantic scoring (SEMANTIC_WEIGHT) has real vectors to
// compare the question against instead of always scoring 0.
//
// Usage (from the repo root, with `docker compose up` running so the
// embeddings service is reachable on the host):
//   node scripts/index-catalog-embeddings.js
//   node scripts/index-catalog-embeddings.js --catalog-dir ./catalog --embed-url http://localhost:8080/embed
//   node scripts/index-catalog-embeddings.js --batch-size 16
//
// Rerun this any time a catalog/*.json file changes (entities, columns,
// descriptions, synonyms). It does not read or write catalog content itself -
// it only produces sidecar files. n8n's ReadCatalog node already globs
// catalog/*.json, so no workflow rewiring is needed: the sidecar is picked up
// automatically the next time BuildPrompt runs.
//
// Texts are sent to the embeddings service in batches (TEI's /embed accepts
// an array of strings and returns one vector per string, in order) rather
// than one request per entity/column - with a large multi-domain catalog
// (hundreds of entities, thousands of columns) a one-at-a-time loop would
// mean thousands of sequential round trips.
//
// Requires Node 18+ (uses the built-in fetch).

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    catalogDir: path.join(__dirname, '..', 'catalog'),
    embedUrl: 'http://localhost:8080/embed',
    batchSize: 32,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--catalog-dir') args.catalogDir = argv[++i];
    else if (argv[i] === '--embed-url') args.embedUrl = argv[++i];
    else if (argv[i] === '--batch-size') args.batchSize = parseInt(argv[++i], 10);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(
        'Usage: node scripts/index-catalog-embeddings.js [--catalog-dir <dir>] [--embed-url <url>] [--batch-size <n>]'
      );
      process.exit(0);
    }
  }
  return args;
}

// Sends one batch and returns one vector per input text, in the same order.
async function embedBatch(embedUrl, texts) {
  const res = await fetch(embedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: texts }),
  });
  if (!res.ok) {
    throw new Error(`embed request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  // text-embeddings-inference returns an array of vectors, one per input
  // string - [[...], [...], ...]. Guard against a flattened single-vector
  // response in case a batch of 1 comes back unwrapped.
  const vectors = Array.isArray(data[0]) ? data : [data];
  if (vectors.length !== texts.length) {
    throw new Error(
      `embed response length mismatch: sent ${texts.length} texts, got ${vectors.length} vectors back`
    );
  }
  for (const v of vectors) {
    if (!Array.isArray(v) || typeof v[0] !== 'number') {
      throw new Error('unexpected embedding response shape: ' + JSON.stringify(data).slice(0, 200));
    }
  }
  return vectors;
}

function entityText(ent) {
  const parts = [ent.name, ent.description_fa || '', ...(ent.synonyms_fa || [])];
  return parts.filter(Boolean).join(' — ');
}

function columnText(col) {
  const parts = [col.alias || col.name, col.description_fa || '', ...(col.synonyms_fa || [])];
  return parts.filter(Boolean).join(' — ');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function indexCatalogFile(filePath, embedUrl, batchSize) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw.entities)) {
    return null; // not a catalog file (e.g. an existing embeddings sidecar) - skip
  }

  // Flatten every entity and every exposed column into one list of
  // {ref, text} jobs so they can be batched together regardless of which
  // entity they belong to.
  const jobs = [];
  for (const ent of raw.entities) {
    jobs.push({ ref: { kind: 'entity', entity: ent.name }, text: entityText(ent) });
    for (const col of ent.columns || []) {
      if (col.exposed === false) continue;
      jobs.push({ ref: { kind: 'column', entity: ent.name, column: col.name }, text: columnText(col) });
    }
  }

  const vectors = {};
  const batches = chunk(jobs, batchSize);
  let done = 0;
  for (const batch of batches) {
    const embeddings = await embedBatch(
      embedUrl,
      batch.map((j) => j.text)
    );
    batch.forEach((job, i) => {
      const vec = embeddings[i];
      if (job.ref.kind === 'entity') {
        vectors[job.ref.entity] = Object.assign({ embedding: vec }, vectors[job.ref.entity]);
      } else {
        const entVec = (vectors[job.ref.entity] = vectors[job.ref.entity] || {});
        entVec.columns = entVec.columns || {};
        entVec.columns[job.ref.column] = { embedding: vec };
      }
    });
    done += batch.length;
    process.stdout.write(`\r  ${done}/${jobs.length} texts embedded`);
  }
  if (jobs.length) console.log('');

  const dim = Object.values(vectors)[0]?.embedding?.length || null;
  return {
    embeddingIndex: true,
    sourceFile: path.basename(filePath),
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

  console.log(`Embeddings endpoint: ${args.embedUrl} (batch size ${args.batchSize})`);
  for (const file of files) {
    console.log(`Indexing ${file}`);
    let index;
    try {
      index = await indexCatalogFile(file, args.embedUrl, args.batchSize);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      process.exitCode = 1;
      continue;
    }
    if (!index) {
      console.log('  skipped (no "entities" array)');
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
