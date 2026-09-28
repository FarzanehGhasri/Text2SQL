// Client for the text-embeddings-inference (TEI) /embed endpoint. Sends texts in
// batches (TEI's default --max-client-batch-size is 32) instead of one HTTP call
// per text. Requires Node 18+ (built-in fetch).

function toVectors(data, expected) {
  // One input may come back as [..] or [[..]]; a batch always comes back as [[..], ...].
  const vectors = Array.isArray(data) && typeof data[0] === 'number' ? [data] : data;
  if (!Array.isArray(vectors) || vectors.length !== expected
      || !vectors.every((v) => Array.isArray(v) && typeof v[0] === 'number')) {
    throw new Error('unexpected embedding response shape: ' + JSON.stringify(data).slice(0, 200));
  }
  return vectors;
}

function createEmbedClient(embedUrl, { batchSize = 32, fetchImpl = fetch } = {}) {
  let requests = 0;

  async function embedBatch(texts) {
    requests++;
    const res = await fetchImpl(embedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: texts }),
    });
    if (!res.ok) {
      throw new Error(`embed request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    return toVectors(await res.json(), texts.length);
  }

  async function embedMany(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      out.push(...(await embedBatch(texts.slice(i, i + batchSize))));
    }
    return out;
  }

  return { embedMany, get requests() { return requests; } };
}

module.exports = { createEmbedClient, toVectors };
