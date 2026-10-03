// Validates the catalog/*.json contract that BuildPrompt and Security rely on.
//
// Each rule is a small function (context) => [finding...]; the engine just runs
// every rule in RULES and collects the findings. Adding a check means adding a
// rule to the list, not editing the engine (open/closed).
//
// Severities:
//   error   - would make BuildPrompt/Security misbehave (silent entity overwrite,
//             a join or example that references something that does not exist,
//             a source that is not a real table). Blocks indexing.
//   warning - quality problems that still produce a working system (unreviewed
//             descriptions, missing synonyms). Reported, never blocks.

// Entity names are emitted unquoted by the model and matched by Security with
// [A-Za-z0-9_]+ when unbracketed, so anything else would be unreachable.
const ENTITY_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
// [schema].[table] or [database].[schema].[table]
const SOURCE_RE = /^(?:\[[^\]\[]+\]\.){1,2}\[[^\]\[]+\]$/;
const KINDS = new Set(['table', 'virtual']);
const { STATUSES } = require('./query-bank');

const lc = (s) => String(s).toLowerCase();

function finding(severity, rule, file, message) {
  return { severity, rule, file, message };
}

// ---------- context: indexes every rule can use ----------
function buildContext(catalogs, options = {}) {
  const entities = new Map(); // lower name -> { entity, file, catalog }
  const duplicates = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    for (const entity of data.entities || []) {
      if (!entity || typeof entity.name !== 'string') continue;
      const key = lc(entity.name);
      if (entities.has(key)) duplicates.push({ name: entity.name, file, other: entities.get(key).file });
      else entities.set(key, { entity, file, catalog: data });
    }
  }
  const columnOf = (entityName, columnName) => {
    const hit = entities.get(lc(entityName));
    if (!hit) return null;
    return (hit.entity.columns || []).find((c) => lc(c.name) === lc(columnName)) || null;
  };
  return { catalogs, entities, duplicates, columnOf, schema: options.schema || null, queryBank: options.queryBank || null };
}

// ---------- rules ----------
function parseErrors({ catalogs }) {
  return catalogs
    .filter((c) => c.parseError)
    .map((c) => finding('error', 'parse', c.file, `not valid JSON: ${c.parseError}`));
}

function catalogShape({ catalogs }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    if (typeof data.domain !== 'string' || !data.domain.trim()) {
      out.push(finding('error', 'catalog-shape', file, '"domain" must be a non-empty string'));
    }
    const perms = data.permissions;
    if (!perms || typeof perms !== 'object' || Object.keys(perms).length === 0) {
      out.push(finding('error', 'catalog-shape', file, '"permissions" is missing or empty - nobody could see this catalog'));
    }
    if (data.shared !== undefined && typeof data.shared !== 'boolean') {
      out.push(finding('error', 'catalog-shape', file, '"shared" must be true or false'));
    }
  }
  return out;
}

function entityShape({ catalogs }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    for (const e of data.entities || []) {
      const where = `entity ${e && e.name}`;
      if (!e || typeof e.name !== 'string' || !ENTITY_NAME_RE.test(e.name)) {
        out.push(finding('error', 'entity-shape', file, `${where}: name must match ${ENTITY_NAME_RE}`));
        continue;
      }
      const kind = e.kind || 'table';
      if (!KINDS.has(kind)) out.push(finding('error', 'entity-shape', file, `${where}: unknown kind "${kind}"`));
      if (kind === 'table' && !SOURCE_RE.test(e.source || '')) {
        out.push(finding('error', 'entity-shape', file, `${where}: source "${e.source}" must look like [schema].[table]`));
      }
      if (kind === 'virtual' && !e.sql) {
        out.push(finding('error', 'entity-shape', file, `${where}: virtual entity needs "sql"`));
      }
      if (!Array.isArray(e.columns) || e.columns.length === 0) {
        out.push(finding('error', 'entity-shape', file, `${where}: has no columns`));
        continue;
      }
      const seen = new Set();
      for (const c of e.columns) {
        if (!c || typeof c.name !== 'string' || !c.name) {
          out.push(finding('error', 'entity-shape', file, `${where}: a column has no name`));
          continue;
        }
        if (seen.has(lc(c.name))) out.push(finding('error', 'entity-shape', file, `${where}: duplicate column ${c.name}`));
        seen.add(lc(c.name));
      }
      if (!e.columns.some((c) => c && c.exposed !== false)) {
        out.push(finding('error', 'entity-shape', file, `${where}: every column is hidden (exposed:false)`));
      }
    }
  }
  return out;
}

// BuildPrompt keys entities by name in one Map across all catalogs, and Security
// compares names case-insensitively: two entities that differ only in case (or
// share a name across files) would silently shadow each other.
function uniqueEntityNames({ duplicates }) {
  return duplicates.map((d) =>
    finding('error', 'unique-names', d.file, `entity ${d.name} is already defined in ${d.other} (names are global and case-insensitive)`)
  );
}

function coreEntities({ catalogs }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    const cores = (data.entities || []).filter((e) => e && e.core);
    if (cores.length > 1) {
      out.push(finding('error', 'core', file, `more than one core entity: ${cores.map((e) => e.name).join(', ')}`));
    }
    if (cores.length === 0 && !data.shared) {
      out.push(finding('warning', 'core', file, 'no core entity - questions for this domain get no guaranteed anchor table'));
    }
    if (cores.length > 0 && data.shared) {
      out.push(finding('error', 'core', file, 'a shared catalog must not have a core entity (it would be added to every prompt)'));
    }
  }
  return out;
}

function permissionTargets({ catalogs }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data || !data.permissions) continue;
    const names = new Set((data.entities || []).map((e) => e && e.name));
    for (const [group, list] of Object.entries(data.permissions)) {
      if (!Array.isArray(list)) {
        out.push(finding('error', 'permissions', file, `group "${group}" must map to an array`));
        continue;
      }
      for (const n of list) {
        if (n !== '*' && !names.has(n)) {
          out.push(finding('error', 'permissions', file, `group "${group}" grants unknown entity "${n}"`));
        }
      }
    }
  }
  return out;
}

function joins(ctx) {
  const out = [];
  for (const { file, data } of ctx.catalogs) {
    if (!data) continue;
    for (const j of data.joins || []) {
      const label = `join ${j.from}.${j.from_column} -> ${j.to}.${j.to_column}`;
      let ok = true;
      for (const [ent, col] of [[j.from, j.from_column], [j.to, j.to_column]]) {
        const hit = ctx.entities.get(lc(ent));
        if (!hit) {
          out.push(finding('error', 'joins', file, `${label}: entity ${ent} does not exist`));
          ok = false;
          continue;
        }
        const column = ctx.columnOf(ent, col);
        if (!column) {
          out.push(finding('error', 'joins', file, `${label}: column ${ent}.${col} does not exist`));
          ok = false;
        } else if (column.exposed === false) {
          // Security builds each CTE from exposed columns only, so a join on a
          // hidden column can never execute.
          out.push(finding('error', 'joins', file, `${label}: column ${ent}.${col} is hidden (exposed:false)`));
          ok = false;
        }
      }
      if (!ok) continue;
      // A join into another non-shared domain only works for users who can see
      // both domains; for everyone else BuildPrompt silently drops it.
      const fromCat = ctx.entities.get(lc(j.from)).catalog;
      const toCat = ctx.entities.get(lc(j.to)).catalog;
      if (fromCat !== toCat && !fromCat.shared && !toCat.shared) {
        out.push(finding('warning', 'joins', file,
          `${label}: crosses into domain "${toCat.domain}" - users without that domain lose this join (move the dimension to a shared catalog)`));
      }
    }
  }
  return out;
}

// Examples are copied almost verbatim by the model; one that names a
// non-existent entity teaches the model to write SQL that Security rejects.
// Shared by catalog `examples` and the query bank.
function exampleSqlFindings(ctx, sql, file, label, rule) {
  const out = [];
  const refRe = /\b(?:from|join)\s+\[([^\]]+)\]/gi;
  let m;
  while ((m = refRe.exec(sql)) !== null) {
    if (!ctx.entities.has(lc(m[1]))) {
      out.push(finding('error', rule, file, `${label}: references unknown entity [${m[1]}]`));
    }
  }
  const colRe = /\[([^\]]+)\]\.\[([^\]]+)\]/g;
  while ((m = colRe.exec(sql)) !== null) {
    if (!ctx.entities.has(lc(m[1]))) continue; // already reported, or an alias
    const col = ctx.columnOf(m[1], m[2]);
    if (!col) out.push(finding('error', rule, file, `${label}: references unknown column [${m[1]}].[${m[2]}]`));
    else if (col.exposed === false) out.push(finding('error', rule, file, `${label}: uses hidden column [${m[1]}].[${m[2]}]`));
  }
  return out;
}

function examples(ctx) {
  const out = [];
  for (const { file, data } of ctx.catalogs) {
    if (!data) continue;
    (data.examples || []).forEach((ex, i) => {
      const label = `example ${i + 1}`;
      if (!ex || typeof ex.q !== 'string' || typeof ex.sql !== 'string') {
        out.push(finding('error', 'examples', file, `${label}: needs "q" and "sql" strings`));
        return;
      }
      out.push(...exampleSqlFindings(ctx, ex.sql, file, label, 'examples'));
    });
  }
  return out;
}

// catalog/query_bank.json (passed as options.queryBank): same checks as catalog
// examples, plus unique ids, a known status and no question repeated.
function queryBank(ctx) {
  const bank = ctx.queryBank;
  if (!bank) return [];
  const { file } = bank;
  if (bank.parseError) return [finding('error', 'query-bank', file, `not valid JSON: ${bank.parseError}`)];
  const data = bank.data || {};
  if (data.queryBank !== true || !Array.isArray(data.examples)) {
    return [finding('error', 'query-bank', file, 'must be { "queryBank": true, "examples": [...] }')];
  }
  const out = [];
  const ids = new Set();
  const questions = new Set();
  data.examples.forEach((ex, i) => {
    const label = `example ${ex && ex.id ? ex.id : i + 1}`;
    if (!ex || typeof ex.id !== 'string' || !ex.id || typeof ex.q !== 'string' || !ex.q.trim() || typeof ex.sql !== 'string') {
      out.push(finding('error', 'query-bank', file, `${label}: needs "id", "q" and "sql" strings`));
      return;
    }
    if (ids.has(ex.id)) out.push(finding('error', 'query-bank', file, `${label}: duplicate id`));
    ids.add(ex.id);
    const qKey = ex.q.replace(/\s+/g, ' ').trim();
    if (questions.has(qKey)) out.push(finding('error', 'query-bank', file, `${label}: question appears twice`));
    questions.add(qKey);
    if (ex.status !== undefined && !STATUSES.has(ex.status)) {
      out.push(finding('error', 'query-bank', file, `${label}: status must be one of ${[...STATUSES].join(', ')}`));
    }
    if (!/\b(?:from|join)\s+\[/i.test(ex.sql)) {
      out.push(finding('error', 'query-bank', file, `${label}: reads no [Entity]`));
    }
    out.push(...exampleSqlFindings(ctx, ex.sql, file, label, 'query-bank'));
  });
  return out;
}

function hints({ catalogs, entities }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    (data.hints_fa || []).forEach((h, i) => {
      if (typeof h === 'string') return;
      if (!h || typeof h.text !== 'string' || !Array.isArray(h.entities)) {
        out.push(finding('error', 'hints', file, `hint ${i + 1}: must be a string or { "text": ..., "entities": [...] }`));
        return;
      }
      for (const n of h.entities) {
        if (!entities.has(lc(n))) out.push(finding('error', 'hints', file, `hint ${i + 1}: unknown entity ${n}`));
      }
    });
  }
  return out;
}

function reviewFlags({ catalogs }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    for (const e of data.entities || []) {
      for (const c of (e && e.columns) || []) {
        if (c && c.review && c.exposed !== false) {
          out.push(finding('warning', 'review', file, `${e.name}.${c.name} is still marked review:true and is sent to the model: ${c.description_fa || ''}`));
        }
      }
    }
  }
  return out;
}

function synonyms({ catalogs }) {
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    for (const e of data.entities || []) {
      if (e && (!Array.isArray(e.synonyms_fa) || e.synonyms_fa.length === 0)) {
        out.push(finding('warning', 'synonyms', file, `${e.name} has no synonyms_fa - keyword retrieval can only match its name/description`));
      }
    }
  }
  return out;
}

// Only runs when a database schema (see sql-schema-parser.js) is supplied.
function databaseSchema({ catalogs, schema }) {
  if (!schema) return [];
  const out = [];
  for (const { file, data } of catalogs) {
    if (!data) continue;
    for (const e of data.entities || []) {
      if (!e || (e.kind || 'table') !== 'table' || !SOURCE_RE.test(e.source || '')) continue;
      const parts = e.source.match(/\[[^\]]+\]/g);
      const key = parts.slice(-2).join('.').toLowerCase(); // ignore an optional [database] prefix
      const table = schema[key];
      if (!table) {
        out.push(finding('error', 'db-schema', file, `${e.name}: source ${e.source} does not exist in the database schema`));
        continue;
      }
      for (const c of e.columns || []) {
        const real = table.columns[lc(c.name)];
        if (!real) {
          out.push(finding('error', 'db-schema', file, `${e.name}.${c.name} does not exist in ${e.source}`));
        } else if (c.type && lc(c.type) !== lc(real.type)) {
          out.push(finding('warning', 'db-schema', file, `${e.name}.${c.name}: catalog type ${c.type}, database type ${real.type}`));
        }
      }
    }
  }
  return out;
}

const RULES = [
  parseErrors, catalogShape, entityShape, uniqueEntityNames, coreEntities,
  permissionTargets, joins, examples, queryBank, hints, reviewFlags, synonyms, databaseSchema,
];

function validateCatalogs(catalogs, options = {}) {
  const ctx = buildContext(catalogs, options);
  const findings = (options.rules || RULES).flatMap((rule) => rule(ctx));
  return {
    findings,
    errors: findings.filter((f) => f.severity === 'error'),
    warnings: findings.filter((f) => f.severity === 'warning'),
  };
}

module.exports = { validateCatalogs, RULES };
