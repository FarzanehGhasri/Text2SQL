// The catalog as Obsidian notes - the ONE place that defines the note format, in both directions:
//   toNotes(catalogs, rules)   catalog objects  -> { 'sales/sales.md': text, 'sales/Fact_Sales.md': text, ... }
//   fromNotes(notes)           { path: text }   -> { catalogs: [{ domain, data }], rules, errors }
// The notes in obsidian/Catalog are the source; scripts/obsidian-to-catalog.js turns them into catalog/*.json
// for n8n. fromNotes(toNotes(x)) gives x back exactly (tests check it on every catalog).
//
// Domain note  <domain>/<domain>.md : description, who may see it, rules, metrics, examples, the list of tables.
// Table note   <domain>/<Table>.md  : description, synonyms, columns (what the model may see), links to other tables.
// Rules note   Rules for every question.md : lines added to the RULES of every prompt.

const yamlStr = (s) => JSON.stringify(String(s));
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|');
const NONE = '_none yet_';

// ---------------------------------------------------------------- writing
function frontmatter(pairs) {
  const out = ['---'];
  for (const [k, v] of pairs) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (!v.length) out.push(`${k}: []`);
      else out.push(`${k}:`, ...v.map((x) => `  - ${yamlStr(x)}`));
    } else out.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  out.push('---');
  return out;
}

const listOr = (items) => (items.length ? items : [NONE]);
const links = (names) => names.map((n) => `[[${n}]]`).join(', ');

function tableNote(ent, cat) {
  const cols = ent.columns || [];
  const needsReview = cols.some((c) => c.review);
  const joins = (cat.joins || []).filter((j) => j.from === ent.name);
  return [
    ...frontmatter([
      ['type', 'table'],
      ['domain', cat.domain],
      ['kind', ent.kind && ent.kind !== 'table' ? ent.kind : undefined],
      ['source', yamlStr(ent.source || '')],
      ['core', ent.core ? true : undefined],
      ['synonyms', ent.synonyms_fa || []],
      ['patterns', ent.patterns_fa],
      ['tags', `[catalog, domain/${cat.domain}${ent.core ? ', core' : ''}${needsReview ? ', needs-review' : ''}]`],
    ]),
    `> ${ent.description_fa || ''}`,
    '',
    '## Columns',
    'Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.',
    '',
    '| Column | Type | Description | Show |',
    '|---|---|---|---|',
    ...cols.map((c) => `| \`${cell(c.name)}\` | ${cell(c.type)} | ${cell(c.description_fa)} | ${c.exposed === false ? 'hidden' : c.review ? 'review' : 'yes'} |`),
    '',
    '## Links to other tables',
    'One line per foreign key: `this column` → a link to the other table → `its key column`.',
    '',
    ...listOr(joins.map((j) => `- \`${j.from_column}\` → [[${j.to}]] \`${j.to_column}\``
      + (j.type && j.type !== 'INNER' ? ` (${j.type})` : '') + (j.inferred ? ' (inferred)' : ''))),
    '',
  ].join('\n');
}

function hintLine(h) {
  return typeof h === 'string' ? `- ${h}` : `- ${links(h.entities)}: ${h.text}`;
}

function domainNote(cat) {
  const lines = [
    ...frontmatter([
      ['type', 'domain'],
      ['domain', cat.domain],
      ['shared', cat.shared === undefined ? undefined : cat.shared],
      ['tags', '[catalog, domain]'],
    ]),
    `> ${cat.description_fa || ''}`,
    '',
    '## Who may see it',
    'One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.',
    '',
    ...listOr(Object.entries(cat.permissions || {}).map(([g, l]) => `- \`${g}\`: ${l.includes('*') ? '*' : links(l)}`)),
    '',
  ];
  if (cat.hints_fa) {
    lines.push('## Rules for the model',
      'Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.',
      '', ...listOr(cat.hints_fa.map(hintLine)), '');
  }
  if (cat.metrics) {
    lines.push('## Metrics',
      'Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.', '');
    if (!cat.metrics.length) lines.push(NONE, '');
    for (const m of cat.metrics) {
      lines.push(`### ${m.name_fa}`);
      if ((m.synonyms_fa || []).length) lines.push(`- Also called: ${m.synonyms_fa.join('، ')}`);
      lines.push(`- Formula: \`${m.sql}\``);
      if (m.filter !== undefined) lines.push(`- Always filter: \`${m.filter}\``);
      if (m.note_fa !== undefined) lines.push(`- Note: ${m.note_fa}`);
      lines.push('');
    }
  }
  if (cat.examples) {
    lines.push('## Examples', 'A question and its correct SQL; the most similar ones are shown to the model.', '');
    if (!cat.examples.length) lines.push(NONE, '');
    for (const ex of cat.examples) lines.push(`### ${ex.q}`, '```sql', ex.sql, '```', '');
  }
  lines.push('## Tables',
    'Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.',
    '', ...listOr((cat.entities || []).map((e) => `- [[${e.name}]]`)), '');
  return lines.join('\n');
}

function rulesNote(rules) {
  return [
    ...frontmatter([['type', 'rules'], ['tags', '[catalog]']]),
    'Added to the RULES the model gets for **every** question, in every domain.',
    'Rules for one domain go in that domain note (*Rules for the model*). The answer format (UNDERSTOOD / PLAN / SQL)',
    'and the security rules are fixed in the n8n code on purpose: the Security node depends on them.',
    '',
    '## Rules',
    '',
    ...listOr(rules.map((r) => `- ${r}`)),
    '',
  ].join('\n');
}

const RULES_NOTE = 'Rules for every question.md';

function toNotes(catalogs, rules = []) {
  const files = { [RULES_NOTE]: rulesNote(rules) };
  for (const cat of catalogs) {
    files[`${cat.domain}/${cat.domain}.md`] = domainNote(cat);
    for (const ent of cat.entities || []) files[`${cat.domain}/${ent.name}.md`] = tableNote(ent, cat);
  }
  return files;
}

// ---------------------------------------------------------------- reading
// YAML front matter, the subset Obsidian's Properties editor writes: `key: value`, `key: [a, b]`, block lists.
function scalar(raw) {
  const s = raw.trim();
  if (s.startsWith('"')) return JSON.parse(s);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s === 'true' || s === 'false') return s === 'true';
  return s;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { props: {}, body: text };
  const props = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s*(.*)$/);
    if (item && listKey) { props[listKey].push(scalar(item[1])); continue; }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    listKey = null;
    if (value === '') { props[key] = []; listKey = key; }
    else if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      props[key] = inner ? splitInline(inner).map(scalar) : [];
    } else props[key] = scalar(value);
  }
  return { props, body: text.slice(m[0].length) };
}

// "a", "b, c", d  ->  ['"a"', '"b, c"', 'd']
function splitInline(s) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      cur += ch;
      if (ch === '\\' && quote === '"') { cur += s[++i]; continue; }
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") { quote = ch; cur += ch; }
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

// { '': [lines before the first ##], 'Columns': [lines], ... }
function sections(body) {
  const out = { '': [] };
  let cur = '';
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1]; out[cur] = []; } else out[cur].push(line);
  }
  return out;
}

const items = (lines) => (lines || []).filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim());
const unwrap = (s) => s.trim().replace(/^`(.*)`$/, '$1');
const linkNames = (s) => [...s.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim());

function description(lines) {
  return lines.filter((l) => /^>\s?/.test(l)).map((l) => l.replace(/^>\s?/, '').trim()).filter(Boolean).join(' ');
}

// split a Markdown table row on | that is not escaped
function rowCells(line) {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function parseColumns(lines, err) {
  const rows = (lines || []).filter((l) => l.trim().startsWith('|'));
  const cols = [];
  for (const line of rows.slice(2)) {          // header + |---|
    const [name, type, desc, show] = rowCells(line);
    if (!name) continue;
    const col = { name: unwrap(name), type: type || '' };
    if (desc) col.description_fa = desc;
    const s = (show || 'yes').toLowerCase();
    if (s === 'hidden') col.exposed = false;
    else if (s === 'review') col.review = true;
    else if (s !== 'yes') err(`column ${col.name}: Show must be yes, hidden or review (not "${show}")`);
    cols.push(col);
  }
  return cols;
}

function parseLinks(lines, from, err) {
  return items(lines).map((it) => {
    const m = it.match(/^`([^`]+)`\s*(?:→|->)\s*\[\[([^\]|#]+)[^\]]*\]\]\s*`([^`]+)`(.*)$/);
    if (!m) { err(`cannot read the link "${it}" - write: \`Column\` → [[Table]] \`KeyColumn\``); return null; }
    const flags = m[4].match(/\(([^)]+)\)/g) || [];
    const words = flags.map((f) => f.slice(1, -1).trim());
    const join = { from, from_column: m[1].trim(), to: m[2].trim(), to_column: m[3].trim(),
      type: words.find((w) => w !== 'inferred') || 'INNER' };
    if (words.includes('inferred')) join.inferred = true;
    return join;
  }).filter(Boolean);
}

function parseTableNote(name, text, err) {
  const { props, body } = parseFrontmatter(text);
  const sec = sections(body);
  const ent = { name, kind: props.kind || 'table', source: String(props.source || '') };
  if (props.core === true) ent.core = true;
  ent.description_fa = description(sec['']);
  ent.synonyms_fa = (props.synonyms || []).map(String);
  ent.columns = parseColumns(sec.Columns, err);
  if (props.patterns !== undefined) ent.patterns_fa = (props.patterns || []).map(String);
  if (!sec.Columns) err('has no "## Columns" section');
  return { ent, joins: parseLinks(sec['Links to other tables'], name, err), domain: props.domain };
}

function parseMetrics(lines, err) {
  const metrics = [];
  let m = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) { m = { name_fa: h[1], synonyms_fa: [] }; metrics.push(m); continue; }
    const it = line.match(/^\s*[-*]\s+([^:]+):\s*(.*)$/);
    if (!it || !m) continue;
    const [key, value] = [it[1].trim().toLowerCase(), it[2].trim()];
    if (key === 'also called') m.synonyms_fa = value.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    else if (key === 'formula') m.sql = unwrap(value);
    else if (key === 'always filter') m.filter = unwrap(value);
    else if (key === 'note') m.note_fa = value;
    else err(`metric «${m.name_fa}»: unknown line "${key}" (use Also called, Formula, Always filter, Note)`);
  }
  // fixed key order, as in the JSON files
  return metrics.map((x) => {
    if (!x.sql) err(`metric «${x.name_fa}» has no "- Formula:" line`);
    const o = { name_fa: x.name_fa, synonyms_fa: x.synonyms_fa, sql: x.sql || '' };
    if (x.filter !== undefined) o.filter = x.filter;
    if (x.note_fa !== undefined) o.note_fa = x.note_fa;
    return o;
  });
}

function parseExamples(lines, err) {
  const out = [];
  let ex = null;
  let inSql = false;
  let sql = [];
  for (const line of lines) {
    if (inSql) {
      if (/^```/.test(line.trim())) { ex.sql = sql.join('\n').trim(); inSql = false; } else sql.push(line);
      continue;
    }
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) { ex = { q: h[1], sql: '' }; out.push(ex); continue; }
    if (/^```/.test(line.trim()) && ex) { inSql = true; sql = []; }
  }
  for (const e of out) if (!e.sql) err(`example «${e.q}» has no \`\`\`sql block`);
  return out;
}

function parseHints(lines) {
  return items(lines).map((it) => {
    const m = it.match(/^((?:\[\[[^\]]+\]\]\s*,?\s*)+):\s*(.*)$/);
    return m ? { text: m[2], entities: linkNames(m[1]) } : it;
  });
}

function parsePermissions(lines, err) {
  const out = {};
  for (const it of items(lines)) {
    const m = it.match(/^`([^`]+)`\s*:\s*(.*)$/) || it.match(/^([^:]+):\s*(.*)$/);
    if (!m) { err(`cannot read the access line "${it}" - write: \`NLSQL-sales\`: *`); continue; }
    const v = m[2].trim();
    out[m[1].trim()] = v === '*' ? ['*'] : (linkNames(v).length ? linkNames(v) : v.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

// notes: { 'sales/Fact_Sales.md': text, ... } (paths relative to obsidian/Catalog, any folder layout)
function fromNotes(notes) {
  const errors = [];
  const byName = new Map();
  const domains = [];
  let rules = [];
  for (const [p, text] of Object.entries(notes)) {
    const name = p.split('/').pop().replace(/\.md$/, '');
    const { props } = parseFrontmatter(text);
    if (props.type === 'domain') domains.push({ p, text, props });
    else if (props.type === 'table') {
      if (byName.has(name)) errors.push({ note: p, message: `two table notes named ${name}` });
      byName.set(name, { p, text });
    } else if (props.type === 'rules') rules = rules.concat(items(sections(parseFrontmatter(text).body).Rules));
  }

  const used = new Set();
  const catalogs = [];
  for (const d of domains.sort((a, b) => String(a.props.domain).localeCompare(String(b.props.domain)))) {
    const err = (message) => errors.push({ note: d.p, message });
    const domain = String(d.props.domain || '');
    if (!domain) { err('has no "domain:" property'); continue; }
    const sec = sections(parseFrontmatter(d.text).body);
    const cat = { domain, description_fa: description(sec['']) };
    if (d.props.shared !== undefined) cat.shared = d.props.shared;
    if (sec['Rules for the model']) cat.hints_fa = parseHints(sec['Rules for the model']);
    cat.permissions = parsePermissions(sec['Who may see it'], err);
    cat.entities = [];
    cat.joins = [];
    for (const n of linkNames((sec.Tables || []).join('\n'))) {
      const note = byName.get(n);
      if (!note) { err(`lists [[${n}]] under Tables, but there is no table note named ${n}`); continue; }
      used.add(n);
      const tErr = (message) => errors.push({ note: note.p, message });
      const t = parseTableNote(n, note.text, tErr);
      if (t.domain && t.domain !== domain) tErr(`says "domain: ${t.domain}" but is listed in [[${domain}]]`);
      cat.entities.push(t.ent);
      cat.joins.push(...t.joins);
    }
    if (sec.Examples) cat.examples = parseExamples(sec.Examples, err);
    if (sec.Metrics) cat.metrics = parseMetrics(sec.Metrics, err);
    catalogs.push({ domain, data: cat });
  }
  for (const [n, note] of byName) {
    if (!used.has(n)) errors.push({ note: note.p, message: `is not listed under "## Tables" in any domain note, so the model never sees it` });
  }
  return { catalogs, rules, errors };
}

module.exports = { toNotes, fromNotes, parseFrontmatter, RULES_NOTE };
