// The verified-query bank (catalog/query_bank.json) and the catalogs' own
// `examples`: one list of question/SQL pairs that BuildPrompt draws few-shot
// examples from, by similarity to the question (Step 3 of the accuracy plan).
//
// File shape (what BuildPrompt reads is marked *):
//   { queryBank*: true, description, examples*: [{ id, q*, sql*, status: "draft"|"verified" }] }
//
// n8n's ReadCatalog globs catalog/*.json, so the bank reaches BuildPrompt with
// no workflow change; loadCatalogs() skips it because it has no "entities".

const fs = require('fs');
const path = require('path');

const QUERY_BANK_FILE = 'query_bank.json';
const STATUSES = new Set(['draft', 'verified']);

// { file, path, data } | { file, path, parseError } | null when there is no bank.
function loadQueryBank(dir) {
  const full = path.join(dir, QUERY_BANK_FILE);
  if (!fs.existsSync(full)) return null;
  try {
    return { file: QUERY_BANK_FILE, path: full, data: JSON.parse(fs.readFileSync(full, 'utf8')) };
  } catch (err) {
    return { file: QUERY_BANK_FILE, path: full, parseError: err.message };
  }
}

// Entity names a query reads (FROM / JOIN targets, bracketed or bare), in order
// of first use. Same rule as BuildPrompt's exampleEntities and Security's
// reference check; derived subqueries "FROM (" are not names.
function exampleEntities(sql) {
  const out = [];
  const re = /\b(?:from|join)\s+(\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)/gi;
  let m;
  while ((m = re.exec(String(sql))) !== null) {
    const name = m[1].replace(/^\[|\]$/g, '');
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

// [{ id, q, sql, source }] - catalog examples first (id "<domain>#<n>"), then the bank.
function allExamples(catalogs, bank) {
  const out = [];
  for (const c of catalogs) {
    (c.examples || []).forEach((ex, i) => out.push({ id: `${c.domain}#${i + 1}`, q: ex.q, sql: ex.sql, source: c.domain }));
  }
  for (const ex of (bank && bank.examples) || []) out.push({ id: ex.id, q: ex.q, sql: ex.sql, source: 'query_bank' });
  return out.filter((ex) => typeof ex.q === 'string' && ex.q.trim() && typeof ex.sql === 'string');
}

module.exports = { QUERY_BANK_FILE, STATUSES, loadQueryBank, exampleEntities, allExamples };
