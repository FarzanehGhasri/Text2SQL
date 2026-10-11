// Reads and writes vault-index/vault.embeddings.json, the index the n8n node "Find Notes" searches.
// Shape (what Find Notes reads is marked *):
//   { vaultIndex*: true, formatVersion, itemsHash, generatedAt, dim,
//     permissions*: { <domain>: { <AD group>: ['*'] | [<table>, ...] } },   copied from catalog/*.json
//     chunks*: [{ id, note*, path*, heading*, text*, access*, textHash, embedding* }] }
// Vectors are rounded to 5 decimals and written as compact JSON (n8n reads the file on every question).
// The file is up to date when itemsHash - a hash of every chunk's id, text, access and the permissions -
// matches what the notes give now, so the indexer-watch loop is a no-op until a note or a permission changes.

const fs = require('fs');
const crypto = require('crypto');

const FORMAT_VERSION = 1;
const round = (x) => Math.round(x * 1e5) / 1e5;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const textHash = (text) => sha(text).slice(0, 16);

function itemsHash(chunks, permissions) {
  return sha(JSON.stringify([chunks.map((c) => [c.id, textHash(c.text), c.access]), permissions]));
}

function readIndex(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data && data.vaultIndex === true && Array.isArray(data.chunks) ? data : null;
  } catch (e) {
    return null;   // missing or corrupt - rebuilt
  }
}

const isUpToDate = (index, hash) => Boolean(index && index.itemsHash === hash && index.formatVersion === FORMAT_VERSION);

// textHash -> embedding from an existing index, so an unchanged piece is never embedded again
function vectorCache(index) {
  const cache = new Map();
  for (const c of (index && index.chunks) || []) if (c.textHash && c.embedding) cache.set(c.textHash, c.embedding);
  return cache;
}

function buildIndex({ chunks, permissions, hash, vectorOf }) {
  const out = chunks.map((c) => {
    const h = textHash(c.text);
    return { ...c, textHash: h, embedding: vectorOf(h).map(round) };
  });
  return {
    vaultIndex: true,
    formatVersion: FORMAT_VERSION,
    itemsHash: hash,
    generatedAt: new Date().toISOString(),
    dim: out.length ? out[0].embedding.length : null,
    permissions,
    chunks: out,
  };
}

function writeIndex(file, index) {
  fs.writeFileSync(file, JSON.stringify(index));
}

module.exports = { FORMAT_VERSION, textHash, itemsHash, readIndex, isUpToDate, vectorCache, buildIndex, writeIndex };
