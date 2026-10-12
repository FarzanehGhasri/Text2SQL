#!/usr/bin/env node
// catalog-service: the search over the Obsidian notes, as a small HTTP service for n8n.
// n8n no longer reads the catalog or embeds the question; it calls this service once per question.
//
//   POST /tables  { question, groups, email }  -> plan for n8n's BuildPrompt  (or { refusal: '⛔ ...' })
//   POST /notes   { question, groups, can }    -> { answer } from the notes the user may see
//   GET  /health                               -> { ok, catalogFiles, notePieces }
//
// This file is only the HTTP adapter: read JSON, check its shape, call a use case (use-cases.js), write JSON.
// The service trusts the groups n8n sends (n8n got them from LDAP), so docker-compose.yml publishes no port for it:
// only the containers of the compose project (n8n) can reach it.
//
// Run: node catalog-service/server.js   (settings: catalog-service/config.js)

const http = require('http');
const { loadConfig } = require('./config');
const { createKnowledge } = require('./knowledge');
const { createEmbedder, createLlm } = require('./clients');
const { createUseCases } = require('./use-cases');

const MAX_BODY_BYTES = 64 * 1024;

class BadRequest extends Error {}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    // a body over the limit is read to the end but not kept, so the client still gets its 400
    req.on('data', (c) => { size += c.length; if (size <= MAX_BODY_BYTES) parts.push(c); });
    req.on('end', () => {
      if (size > MAX_BODY_BYTES) return reject(new BadRequest('request body too large'));
      try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { reject(new BadRequest('body is not JSON')); }
    });
    req.on('error', reject);
  });
}

const isStringList = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

// { question, groups, email?, can? } with the right types, or BadRequest
function questionRequest(body) {
  if (typeof body.question !== 'string') throw new BadRequest('question must be a string');
  if (!isStringList(body.groups)) throw new BadRequest('groups must be a list of strings');
  if (body.can !== undefined && (typeof body.can !== 'object' || body.can === null)) throw new BadRequest('can must be an object');
  return { question: body.question, groups: body.groups, email: String(body.email || '?'), can: body.can || {} };
}

function send(res, status, data) {
  const text = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

function createServer({ useCases, knowledge, log = console.log }) {
  const routes = {
    'POST /tables': async (req) => useCases.tables(questionRequest(await readJson(req))),
    'POST /notes': async (req) => useCases.notes(questionRequest(await readJson(req))),
    'GET /health': async () => {
      const index = knowledge.vaultIndex();
      return { ok: true, catalogFiles: knowledge.catalogItems().length, notePieces: index ? index.chunks.length : 0 };
    },
  };
  return http.createServer(async (req, res) => {
    const route = routes[`${req.method} ${req.url.split('?')[0]}`];
    if (!route) return send(res, 404, { error: 'not found' });
    try {
      send(res, 200, await route(req));
    } catch (e) {
      if (e instanceof BadRequest) return send(res, 400, { error: e.message });
      log(`ERROR | ${req.method} ${req.url} | ${e.message}`);   // never the question: it is a real user's
      send(res, 500, { error: e.message });
    }
  });
}

function main() {
  const config = loadConfig();
  const knowledge = createKnowledge(config);
  const useCases = createUseCases({
    knowledge,
    embed: createEmbedder(config.embedUrl, { timeoutMs: config.embedTimeoutMs, log: console.log }),
    llm: createLlm(config.llmUrl, { timeoutMs: config.llmTimeoutMs }),
  });
  createServer({ useCases, knowledge }).listen(config.port, () => console.log(`catalog-service listening on :${config.port}`));
}

if (require.main === module) main();

module.exports = { createServer, questionRequest };
