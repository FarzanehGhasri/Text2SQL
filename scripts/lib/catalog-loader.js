// Loads catalog/*.json files. The single place that knows how catalog files are
// recognised on disk, shared by the validator CLI and the embedding indexer so
// both always see exactly the same set of catalogs.
//
// A file is a catalog when it is a *.json file that is not an embeddings
// sidecar (*.embeddings.json) and whose content has an "entities" array.

const fs = require('fs');
const path = require('path');

const SIDECAR_SUFFIX = '.embeddings.json';

function isCatalogFileName(fileName) {
  return fileName.endsWith('.json') && !fileName.endsWith(SIDECAR_SUFFIX);
}

function sidecarPathFor(catalogPath) {
  return catalogPath.replace(/\.json$/, SIDECAR_SUFFIX);
}

// Returns [{ file, path, data }] for every catalog file in `dir`, sorted by file
// name so results are deterministic. Files that fail to parse are returned with
// `parseError` instead of `data`, so callers can report them rather than crash.
function loadCatalogs(dir) {
  return fs
    .readdirSync(dir)
    .filter(isCatalogFileName)
    .sort()
    .map((file) => {
      const full = path.join(dir, file);
      try {
        return { file, path: full, data: JSON.parse(fs.readFileSync(full, 'utf8')) };
      } catch (err) {
        return { file, path: full, parseError: err.message };
      }
    })
    .filter((c) => c.parseError || Array.isArray(c.data && c.data.entities));
}

module.exports = { loadCatalogs, isCatalogFileName, sidecarPathFor, SIDECAR_SUFFIX };
