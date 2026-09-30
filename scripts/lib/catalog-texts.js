// What gets embedded for each catalog entity and column (the "text recipe").
// Changing it changes vectors; the indexer notices on its own because every
// sidecar records a hash of exactly which texts it was built from.
//
// Units:
//   - One "table card" per entity: name, description, synonyms, plus the
//     descriptions of its DISTINCTIVE columns. This is the main vector a table
//     is found by, so it should say what makes the table different.
//   - One vector per DISTINCTIVE column, with its table as context. Key columns
//     ("... کلید اتصال به ...") and columns whose description is shared by
//     GENERIC_MIN_ENTITIES or more tables ("شماره سند" x42, "عنوان" x37,
//     "تاریخ" x18 ...) get no vector: their vectors were near-identical across
//     dozens of tables, so a question mentioning "تاریخ" lifted all of them
//     alike, and wide tables with many such columns got an unearned boost.
//     Their meaning still reaches retrieval through the keyword score and the
//     table the key points to.

const crypto = require('crypto');

const TEXT_RECIPE = {
  GENERIC_MIN_ENTITIES: 3,  // a column description used by this many tables or more is "generic"
  CARD_MAX_COLUMNS:     40  // cap on column descriptions listed in one table card
};

const descKey = (d) => String(d || '').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const isExposed = (col) => col.exposed !== false;
const isKeyColumn = (col) => /_key$/i.test(col.name) || /^کلید/.test(descKey(col.description_fa));

// Descriptions (normalised) that GENERIC_MIN_ENTITIES or more entities use for
// an exposed column. Needs every catalog, since "generic" is a global property.
function buildGenericIndex(catalogs) {
  const users = new Map(); // description -> Set(entity name)
  for (const cat of catalogs) {
    for (const ent of cat.entities || []) {
      for (const col of (ent.columns || []).filter(isExposed)) {
        const k = descKey(col.description_fa);
        if (!k) continue;
        if (!users.has(k)) users.set(k, new Set());
        users.get(k).add(ent.name);
      }
    }
  }
  return new Set([...users].filter(([, ents]) => ents.size >= TEXT_RECIPE.GENERIC_MIN_ENTITIES).map(([k]) => k));
}

function isDistinctiveColumn(col, generic) {
  return isExposed(col) && !isKeyColumn(col) && !generic.has(descKey(col.description_fa));
}

function tableCardText(ent, generic) {
  const head = [ent.name, ent.description_fa || '', ...(ent.synonyms_fa || [])].filter(Boolean).join(' — ');
  const seen = new Set();
  const cols = [];
  for (const col of (ent.columns || []).filter((c) => isDistinctiveColumn(c, generic))) {
    const d = col.description_fa || col.alias || col.name;
    if (seen.has(descKey(d))) continue;
    seen.add(descKey(d));
    cols.push(d);
    if (cols.length >= TEXT_RECIPE.CARD_MAX_COLUMNS) break;
  }
  return cols.length ? `${head} — ستون‌ها: ${cols.join('، ')}` : head;
}

// Column text carries its table's description, so two columns with similar
// wording in different tables still land near their own table's topic.
function columnText(col, ent) {
  const parts = [col.alias || col.name, col.description_fa || '', ...(col.synonyms_fa || [])].filter(Boolean);
  return `${parts.join(' — ')} — جدول: ${ent.description_fa || ent.name}`;
}

function textHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// Flat list of everything to embed in one catalog: [{ entity, column|null, text, hash }].
// `generic` comes from buildGenericIndex over ALL catalogs.
function embeddableItems(catalog, generic = new Set()) {
  const items = [];
  for (const ent of catalog.entities || []) {
    const card = tableCardText(ent, generic);
    items.push({ entity: ent.name, column: null, text: card, hash: textHash(card) });
    for (const col of (ent.columns || []).filter((c) => isDistinctiveColumn(c, generic))) {
      const text = columnText(col, ent);
      items.push({ entity: ent.name, column: col.name, text, hash: textHash(text) });
    }
  }
  return items;
}

module.exports = {
  TEXT_RECIPE, buildGenericIndex, isDistinctiveColumn, tableCardText, columnText, textHash, embeddableItems,
};
