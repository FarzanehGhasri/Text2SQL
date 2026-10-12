// One embeddings client for TEI, Ollama and OpenAI-compatible services; the address says which.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmbedClient, protocolFor } = require('../scripts/lib/embed-client');

function fakeFetch(reply) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    calls.push({ url, body });
    return { ok: true, json: async () => reply(body), text: async () => '' };
  };
  return { calls, fetchImpl };
}
const vec = (t) => [t.length, 1, 0];

test('Ollama: /api/embed with the model from the address, vectors from "embeddings"', async () => {
  const f = fakeFetch((b) => ({ model: b.model, embeddings: b.input.map(vec) }));
  const c = createEmbedClient('http://host.docker.internal:11434/api/embed?model=bge-m3', { batchSize: 2, fetchImpl: f.fetchImpl });
  assert.equal(c.protocol, 'ollama');
  assert.deepEqual(await c.embedMany(['a', 'bb', 'ccc']), [[1, 1, 0], [2, 1, 0], [3, 1, 0]]);
  assert.deepEqual(f.calls.map((x) => x.url), ['http://host.docker.internal:11434/api/embed', 'http://host.docker.internal:11434/api/embed']);
  assert.deepEqual(f.calls[0].body, { model: 'bge-m3', input: ['a', 'bb'], options: { num_ctx: 8192 } });
  // no ?model= -> bge-m3, the model the whole system is built on
  assert.equal(JSON.parse(JSON.stringify(protocolFor('http://x:11434/api/embed').body(['q']))).model, 'bge-m3');
});

test('OpenAI-compatible: /v1/embeddings, vectors back in input order', async () => {
  const f = fakeFetch((b) => ({ data: b.input.map((t, i) => ({ index: i, embedding: vec(t) })).reverse() }));
  const c = createEmbedClient('http://x:8000/v1/embeddings?model=bge-m3', { fetchImpl: f.fetchImpl });
  assert.equal(c.protocol, 'openai');
  assert.deepEqual(await c.embedMany(['a', 'bb']), [[1, 1, 0], [2, 1, 0]]);
});

test('TEI stays the default: { inputs } -> [[..]]', async () => {
  const f = fakeFetch((b) => b.inputs.map(vec));
  const c = createEmbedClient('http://embeddings:80/embed', { fetchImpl: f.fetchImpl });
  assert.equal(c.protocol, 'tei');
  assert.deepEqual(await c.embedMany(['abc']), [[3, 1, 0]]);
  assert.deepEqual(f.calls[0].body, { inputs: ['abc'] });
});

test('an unreachable service names the address and the cause, not just "fetch failed"', async () => {
  const fetchImpl = async () => { const e = new TypeError('fetch failed'); e.cause = { code: 'ECONNREFUSED' }; throw e; };
  await assert.rejects(createEmbedClient('http://embeddings:80/embed', { fetchImpl }).embedMany(['q']),
    /cannot reach http:\/\/embeddings(:80)?\/embed: ECONNREFUSED/);
});
