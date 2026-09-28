// Reads and writes the <catalog>.embeddings.json sidecars that BuildPrompt
// loads next to each catalog. Shape (what BuildPrompt reads is marked *):
//   { embeddingIndex*: true, formatVersion, sourceFile, contentHash, generatedAt, dim,
//     vectors*: { <Entity>: { embedding*: [..], textHash,
//                             columns*: { <Column>: { embedding*: [..], textHash } } } } }
//
// Format 2 rounds components to 5 decimals and writes compact JSON: roughly a
// third of the old pretty-printed size, which matters because n8n reads every
// sidecar on every question. The cosine-similarity change from rounding is
// below 1e-4.

const fs = require('fs');
const crypto = require('crypto');

const FORMAT_VERSION = 2;
const round = (x) => Math.round(x * 1e5) / 1e5;

function contentHash(rawCatalog) {
  return crypto.createHash('sha256').update(JSON.stringify(rawCatalog)).digest('hex');
}

function readSidecar(path) {
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    return data && data.embeddingIndex === true && data.vectors ? data : null;
  } catch (e) {
    return null; // missing or corrupt - treated as absent and rebuilt
  }
}

function isUpToDate(sidecar, hash) {
  return Boolean(sidecar && sidecar.contentHash === hash && sidecar.formatVersion === FORMAT_VERSION);
}

// textHash -> embedding, gathered from every existing sidecar, so a text that
// did not change (or an entity that only moved to another catalog file) is
// never re-embedded.
function vectorCache(sidecars) {
  const cache = new Map();
  for (const sc of sidecars) {
    for (const ent of Object.values((sc && sc.vectors) || {})) {
      if (ent.textHash && ent.embedding) cache.set(ent.textHash, ent.embedding);
      for (const col of Object.values(ent.columns || {})) {
        if (col.textHash && col.embedding) cache.set(col.textHash, col.embedding);
      }
    }
  }
  return cache;
}

// A sidecar written by the old indexer has no textHash, but when its catalog
// content is unchanged its vectors still belong to exactly the current texts.
function adoptLegacyVectors(sidecar, hash, items, cache) {
  if (!sidecar || sidecar.contentHash !== hash || sidecar.formatVersion === FORMAT_VERSION) return;
  for (const it of items) {
    const ent = sidecar.vectors[it.entity];
    const vec = it.column ? ent && ent.columns && ent.columns[it.column] && ent.columns[it.column].embedding
                          : ent && ent.embedding;
    if (vec && !cache.has(it.hash)) cache.set(it.hash, vec);
  }
}

function buildSidecar({ sourceFile, hash, items, vectorOf }) {
  const vectors = {};
  for (const it of items) {
    const entry = { embedding: vectorOf(it.hash).map(round), textHash: it.hash };
    if (!it.column) {
      vectors[it.entity] = Object.assign(vectors[it.entity] || {}, entry);
    } else {
      vectors[it.entity] = vectors[it.entity] || {};
      vectors[it.entity].columns = vectors[it.entity].columns || {};
      vectors[it.entity].columns[it.column] = entry;
    }
  }
  const first = Object.values(vectors)[0];
  return {
    embeddingIndex: true,
    formatVersion: FORMAT_VERSION,
    sourceFile,
    contentHash: hash,
    generatedAt: new Date().toISOString(),
    dim: first && first.embedding ? first.embedding.length : null,
    vectors,
  };
}

function writeSidecar(path, sidecar) {
  fs.writeFileSync(path, JSON.stringify(sidecar));
}

module.exports = {
  FORMAT_VERSION, contentHash, readSidecar, isUpToDate, vectorCache,
  adoptLegacyVectors, buildSidecar, writeSidecar,
};
