// Reads and writes the <catalog>.embeddings.json sidecars that BuildPrompt
// loads next to each catalog. Shape (what BuildPrompt reads is marked *):
//   { embeddingIndex*: true, formatVersion, sourceFile, itemsHash, generatedAt, dim,
//     vectors*: { <Entity>: { embedding*: [..], textHash,
//                             columns*: { <Column>: { embedding*: [..], textHash } } } } }
//
// Components are rounded to 5 decimals and written as compact JSON: roughly a
// third of a pretty-printed file, which matters because n8n reads every sidecar
// on every question. The cosine-similarity change from rounding is below 1e-4.
//
// Format 3 (table cards + distinctive columns, see catalog-texts.js) is up to
// date when its itemsHash - a hash of exactly which (entity, column, text) it
// holds - matches what the recipe produces now. A catalog-content hash is not
// enough: whether a column is "generic" depends on the other catalogs too.

const fs = require('fs');
const crypto = require('crypto');

const FORMAT_VERSION = 3;
const round = (x) => Math.round(x * 1e5) / 1e5;

function itemsHash(items) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(items.map((it) => [it.entity, it.column, it.hash])))
    .digest('hex');
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
  return Boolean(sidecar && sidecar.itemsHash === hash && sidecar.formatVersion === FORMAT_VERSION);
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
    itemsHash: hash,
    generatedAt: new Date().toISOString(),
    dim: first && first.embedding ? first.embedding.length : null,
    vectors,
  };
}

function writeSidecar(path, sidecar) {
  fs.writeFileSync(path, JSON.stringify(sidecar));
}

// ---------- example index: catalog/query_bank.embeddings.json ----------
// One vector per example QUESTION (catalog examples + query bank), keyed by the
// question text itself, so BuildPrompt can look a vector up without hashing:
//   { exampleIndex*: true, formatVersion, itemsHash, generatedAt, dim,
//     vectors*: { <question>: { embedding*: [..], textHash } } }
// No "embeddingIndex" flag: BuildPrompt must not read these keys as entity names.
const EXAMPLE_FORMAT_VERSION = 1;

function readExampleSidecar(path) {
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    return data && data.exampleIndex === true && data.vectors ? data : null;
  } catch (e) {
    return null;
  }
}

function isExampleSidecarUpToDate(sidecar, hash) {
  return Boolean(sidecar && sidecar.itemsHash === hash && sidecar.formatVersion === EXAMPLE_FORMAT_VERSION);
}

function buildExampleSidecar({ hash, items, vectorOf }) {
  const vectors = {};
  for (const it of items) vectors[it.text] = { embedding: vectorOf(it.hash).map(round), textHash: it.hash };
  const first = Object.values(vectors)[0];
  return {
    exampleIndex: true,
    formatVersion: EXAMPLE_FORMAT_VERSION,
    itemsHash: hash,
    generatedAt: new Date().toISOString(),
    dim: first ? first.embedding.length : null,
    vectors,
  };
}

module.exports = {
  FORMAT_VERSION, itemsHash, readSidecar, isUpToDate, vectorCache, buildSidecar, writeSidecar,
  EXAMPLE_FORMAT_VERSION, readExampleSidecar, isExampleSidecarUpToDate, buildExampleSidecar,
};
