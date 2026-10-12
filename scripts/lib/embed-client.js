// Client for an embeddings service. Sends texts in batches (TEI's default --max-client-batch-size is 32)
// instead of one HTTP call per text. Requires Node 18+ (built-in fetch).
//
// The address says which service it is - every script and catalog-service take just --embed-url / EMBED_URL:
//   http://embeddings:80/embed                                   text-embeddings-inference (TEI): { inputs } -> [[..]]
//   http://host.docker.internal:11434/api/embed?model=bge-m3     Ollama: { model, input } -> { embeddings: [[..]] }
//   http://host:port/v1/embeddings?model=bge-m3                  OpenAI-compatible: { model, input } -> { data: [{ embedding }] }
// Use the same model everywhere (bge-m3): catalog vectors, note vectors and question vectors are compared with
// each other. After switching service, rebuild the vectors once with --force.

const DEFAULT_MODEL = 'bge-m3';
// bge-m3 reads up to 8192 tokens (TEI's limit too); Ollama's own default window is smaller and would cut long notes
const OLLAMA_OPTIONS = { num_ctx: 8192 };

function toVectors(data, expected) {
  // One input may come back as [..] or [[..]]; a batch always comes back as [[..], ...].
  const vectors = Array.isArray(data) && typeof data[0] === 'number' ? [data] : data;
  if (!Array.isArray(vectors) || vectors.length !== expected
      || !vectors.every((v) => Array.isArray(v) && typeof v[0] === 'number')) {
    throw new Error('unexpected embedding response shape: ' + JSON.stringify(data).slice(0, 200));
  }
  return vectors;
}

// { url, body(texts), vectors(json) } for the service the address names
function protocolFor(embedUrl) {
  const u = new URL(embedUrl);
  const model = u.searchParams.get('model') || DEFAULT_MODEL;
  u.searchParams.delete('model');
  const url = u.toString();
  if (/\/api\/embed\/?$/.test(u.pathname)) {
    return { name: 'ollama', url, body: (texts) => ({ model, input: texts, options: OLLAMA_OPTIONS }), vectors: (j) => j && j.embeddings };
  }
  if (/\/v1\/embeddings\/?$/.test(u.pathname)) {
    return { name: 'openai', url, body: (texts) => ({ model, input: texts }),
             vectors: (j) => j && Array.isArray(j.data) && [...j.data].sort((a, b) => a.index - b.index).map((d) => d.embedding) };
  }
  return { name: 'tei', url, body: (texts) => ({ inputs: texts }), vectors: (j) => j };
}

// "fetch failed" says nothing; the cause (ECONNREFUSED, ENOTFOUND, a timeout) does
function reachError(url, err) {
  const c = err.cause || {};
  return new Error(`cannot reach ${url}: ${c.code || c.message || err.name === 'TimeoutError' && 'timeout' || err.message}`);
}

function createEmbedClient(embedUrl, { batchSize = 32, fetchImpl = fetch } = {}) {
  const proto = protocolFor(embedUrl);
  let requests = 0;

  async function embedBatch(texts) {
    requests++;
    let res;
    try {
      res = await fetchImpl(proto.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proto.body(texts)),
      });
    } catch (e) {
      throw reachError(proto.url, e);
    }
    if (!res.ok) {
      throw new Error(`embed request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    return toVectors(proto.vectors(await res.json()), texts.length);
  }

  async function embedMany(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      out.push(...(await embedBatch(texts.slice(i, i + batchSize))));
    }
    return out;
  }

  return { embedMany, protocol: proto.name, get requests() { return requests; } };
}

module.exports = { createEmbedClient, toVectors, protocolFor };
