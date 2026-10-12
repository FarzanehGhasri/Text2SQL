// One search piece per table for the notes search (catalog-service POST /notes), built from catalog/*.json -
// the catalog the Obsidian notes generate. A table is never split: its description, synonyms, every column the
// model may see and its joins (the catalog's "joins": from / from_column -> to / to_column, type, inferred) stay
// together, so a question about a table always gets the whole table and how it connects.
//
//   tablePieces(catalogs) -> [{ id, note, path, heading: 'Table', text, access: { scope: 'table', domain, entity } }]
//
// A join is listed on both tables, but only when the other table is in the same domain or in a shared catalog:
// a shared dimension (Dim_Date) is joined from every domain, and listing those tables would tell an HR-only user
// the names of sales tables.

const entityKey = (n) => String(n).toLowerCase();

// entity name -> { domain, shared }
function domainIndex(catalogs) {
  const out = new Map();
  for (const c of catalogs) for (const e of c.entities || []) out.set(entityKey(e.name), { domain: c.domain, shared: Boolean(c.shared) });
  return out;
}

const joinLine = (j) => `- [${j.from}].[${j.from_column}] = [${j.to}].[${j.to_column}] (${j.type || 'INNER'} JOIN`
  + `${j.inferred ? ', inferred from the column names' : ''})`;

function columnLine(c) {
  const name = c.alias ? `${c.alias} (column ${c.name})` : c.name;
  const extra = [c.description_fa, ...(c.synonyms_fa || [])].filter(Boolean).join(' - ');
  return `- ${name} (${c.type || '?'})${extra ? `: ${extra}` : ''}${c.review ? ' [to be checked by a domain expert]' : ''}`;
}

function tablePiece(ent, cat, joins, domains) {
  const visible = (other) => {
    const d = domains.get(entityKey(other));
    return Boolean(d && (d.domain === cat.domain || d.shared));
  };
  const out = joins.filter((j) => j.from === ent.name && visible(j.to));
  const into = joins.filter((j) => j.to === ent.name && j.from !== ent.name && visible(j.from));
  const synonyms = (ent.synonyms_fa || []).join('، ');
  const text = [
    `${ent.name} | domain: ${cat.domain} | ${ent.description_fa || ''}${synonyms ? ` | synonyms: ${synonyms}` : ''}`,
    '## Table',
    `Source: ${ent.source || '?'}${ent.core ? ` · the core table of ${cat.domain}` : ''}`,
    'Columns the model may use:',
    ...(ent.columns || []).filter((c) => c.exposed !== false).map(columnLine),
    'Joins from this table:',
    ...(out.length ? out.map(joinLine) : ['- none']),
    'Joins into this table:',
    ...(into.length ? into.map(joinLine) : ['- none']),
  ].join('\n');
  const notePath = `Catalog/${cat.domain}/${ent.name}.md`;
  return { id: `${notePath}#Table`, note: ent.name, path: notePath, heading: 'Table', text,
    access: { scope: 'table', domain: cat.domain, entity: ent.name } };
}

function tablePieces(catalogs) {
  const domains = domainIndex(catalogs);
  const joins = catalogs.flatMap((c) => c.joins || []);
  return catalogs.flatMap((c) => (c.entities || []).map((e) => tablePiece(e, c, joins, domains)));
}

module.exports = { tablePieces };
