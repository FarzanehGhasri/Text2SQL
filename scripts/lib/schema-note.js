// obsidian/Schema.md - one page with every table the model knows, by domain: what it is, where it comes from,
// which tables it links to, and the metrics of the domain. Written from catalog/*.json (which is generated
// from the Catalog/ notes), so it never disagrees with them; nobody edits it by hand.
//
//   schemaNote(catalogs) -> the note's text      (catalogs: the `data` of loadCatalogs())

const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const MAX_SYNONYMS = 4;

function tableRow(ent, joins) {
  const links = [...new Set(joins.filter((j) => j.from === ent.name).map((j) => j.to))];
  const shown = (ent.columns || []).filter((c) => c.exposed !== false).length;
  const synonyms = (ent.synonyms_fa || []).slice(0, MAX_SYNONYMS).join('، ');
  return `| [[${ent.name}]]${ent.core ? ' ⭐' : ''} | ${cell(ent.description_fa)} | ${cell(synonyms)} | \`${cell(ent.source)}\` | ${shown} | `
    + `${links.length ? links.map((l) => `[[${l}]]`).join(', ') : '-'} |`;
}

function domainSection(cat) {
  const entities = [...(cat.entities || [])].sort((a, b) => (b.core ? 1 : 0) - (a.core ? 1 : 0) || a.name.localeCompare(b.name));
  const metrics = (cat.metrics || []).map((m) => m.name_fa).filter(Boolean);
  const groups = Object.entries(cat.permissions || {}).map(([g, list]) => `\`${g}\`${(list || []).includes('*') ? '' : ` (${list.length} tables)`}`);
  return [
    `## ${cat.domain} - ${cat.description_fa || ''}${cat.shared ? ' (shared)' : ''}`,
    `Domain note: [[${cat.domain}]] · ${entities.length} tables · who may see it: ${groups.join(', ') || 'nobody'}`,
    ...(metrics.length ? [`Metrics: ${metrics.join('، ')}`] : []),
    '',
    '| Table | What it is | Also called | Source | Columns shown | Links to |',
    '|---|---|---|---|---|---|',
    ...entities.map((e) => tableRow(e, cat.joins || [])),
    '',
  ];
}

function schemaNote(catalogs) {
  const cats = [...catalogs].sort((a, b) => (a.shared ? 1 : 0) - (b.shared ? 1 : 0) || a.domain.localeCompare(b.domain));
  const tables = cats.reduce((n, c) => n + (c.entities || []).length, 0);
  return [
    '---',
    'type: generated',
    'tags: [catalog, schema]',
    '---',
    '> Written by `scripts/build-schema-note.js` from `catalog/*.json` (indexer-watch, every minute). Do not edit:',
    '> edit the notes in `Catalog/` - this page follows within a minute.',
    '',
    `# Schema`,
    `Every table of \`SA_DataWarehouse\` the model knows: ${tables} tables in ${cats.length} domains. ⭐ = the domain's core table.`,
    'Columns, synonyms and links are in each table note; rules, metrics and examples in each domain note.',
    'Back to [[Home]].',
    '',
    ...cats.flatMap(domainSection),
  ].join('\n');
}

module.exports = { schemaNote };
