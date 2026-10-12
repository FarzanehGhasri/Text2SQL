// The outside services catalog-service talks to, behind small functions so the use cases can be tested
// with fakes:
//   createEmbedder(url) -> async (text) => vector | null   never throws: no vector = keyword search only
//   createLlm(url)      -> async (prompt) => response       the same /combine body n8n sends ({ string1, string2 })
//   createReranker(url) -> async (question, texts) => scores | null   TEI /rerank with a cross-encoder
//                          (BAAI/bge-reranker-v2-m3); null when off or failing: the model without reranker is used

const { createEmbedClient } = require('../scripts/lib/embed-client');

const withTimeout = (fetchImpl, ms) => (url, opts) => fetchImpl(url, { ...opts, signal: AbortSignal.timeout(ms) });

function createEmbedder(url, { timeoutMs = 10000, fetchImpl = fetch, log = () => {} } = {}) {
  const client = createEmbedClient(url, { batchSize: 1, fetchImpl: withTimeout(fetchImpl, timeoutMs) });
  return async (text) => {
    try {
      const [vector] = await client.embedMany([text]);
      return vector;
    } catch (e) {
      log(`EMBED FAILED | ${e.message} - keyword search only`);
      return null;
    }
  };
}

function createLlm(url, { timeoutMs = 180000, fetchImpl = fetch } = {}) {
  return async (prompt) => {
    const res = await withTimeout(fetchImpl, timeoutMs)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ string1: '-', string2: prompt }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 300)}`);
    try { return JSON.parse(text); } catch (e) { return text; }
  };
}

function createReranker(url, { timeoutMs = 10000, fetchImpl = fetch, log = () => {} } = {}) {
  if (!url) return async () => null;
  return async (question, texts) => {
    try {
      const res = await withTimeout(fetchImpl, timeoutMs)(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question, texts, raw_scores: false, truncate: true }),
      });
      if (!res.ok) throw new Error(`rerank request failed (${res.status})`);
      const out = new Array(texts.length).fill(0);
      for (const r of await res.json()) out[r.index] = r.score;   // [{ index, score }] in score order
      return out;
    } catch (e) {
      log(`RERANK FAILED | ${e.message} - model without reranker`);
      return null;
    }
  };
}

module.exports = { createEmbedder, createLlm, createReranker };
