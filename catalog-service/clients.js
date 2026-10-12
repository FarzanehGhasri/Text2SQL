// The two outside services catalog-service talks to, behind small functions so the use cases can be tested
// with fakes:
//   createEmbedder(url) -> async (text) => vector | null   never throws: no vector = keyword search only
//   createLlm(url)      -> async (prompt) => response       the same /combine body n8n sends ({ string1, string2 })

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

module.exports = { createEmbedder, createLlm };
