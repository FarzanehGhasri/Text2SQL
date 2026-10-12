// What catalog-service knows, read from disk and kept in memory until a file changes:
//   catalogItems()  every catalog/*.json - the catalogs generated from the Obsidian notes, their embedding
//                   sidecars, query_bank.json, values.json, rules.json (exactly what n8n's ReadCatalog used to read)
//   vaultIndex()    vault-index/vault.embeddings.json for the notes search, or null while it is not built
// A file is read again only when its size or modification time changes (indexer-watch rewrites them after an
// edit in Obsidian), so a question costs a few stat() calls, not 5 MB of JSON. A file caught half-written keeps
// its previous content until the next request.

const fs = require('fs');
const path = require('path');
const { readIndex } = require('../scripts/lib/vault-index-store');

const stamp = (st) => `${st.size}:${st.mtimeMs}`;

function createKnowledge({ catalogDir, vaultIndexFile }) {
  const files = new Map();   // path -> { stamp, data }

  function cached(file, parse) {
    let st;
    try { st = fs.statSync(file); } catch (e) { files.delete(file); return null; }
    const hit = files.get(file);
    if (hit && hit.stamp === stamp(st)) return hit.data;
    const data = parse(file);
    if (data == null) return hit ? hit.data : null;   // half-written: keep the last good one
    files.set(file, { stamp: stamp(st), data });
    return data;
  }

  const parseJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } };

  function catalogItems() {
    if (!fs.existsSync(catalogDir)) return [];
    return fs.readdirSync(catalogDir).filter((f) => f.endsWith('.json')).sort()
      .map((f) => cached(path.join(catalogDir, f), parseJson)).filter(Boolean);
  }

  const vaultIndex = () => cached(vaultIndexFile, readIndex);

  return { catalogItems, vaultIndex };
}

module.exports = { createKnowledge };
