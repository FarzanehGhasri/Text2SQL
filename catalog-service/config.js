// catalog-service settings. Every value can be set in docker-compose.yml (environment:); the defaults are
// the ones the compose file uses, so `node catalog-service/server.js` also works from the repo root.

const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadConfig(env = process.env) {
  const num = (name, fallback) => {
    const v = Number(env[name] || fallback);
    if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} must be a positive number`);
    return v;
  };
  return {
    port: num('PORT', 8090),
    catalogDir: env.CATALOG_DIR || path.join(ROOT, 'catalog'),                         // written from the Obsidian notes
    vaultIndexFile: env.VAULT_INDEX || path.join(ROOT, 'vault-index', 'vault.embeddings.json'),
    embedUrl: env.EMBED_URL || 'http://embeddings:80/embed',                           // TEI, bge-m3
    embedTimeoutMs: num('EMBED_TIMEOUT_MS', 10000),
    llmUrl: env.LLM_URL || 'http://172.16.55.28:5000/combine',                         // the same /combine as n8n's "request to LLM"
    llmTimeoutMs: num('LLM_TIMEOUT_MS', 180000),
  };
}

module.exports = { loadConfig };
