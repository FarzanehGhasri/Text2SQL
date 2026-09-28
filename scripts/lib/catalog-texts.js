// What gets embedded for each catalog entity and column. The text recipe is the
// same one BuildPrompt's vectors were always built from; changing it changes
// every vector, so do it deliberately (and rebuild with --force).

const crypto = require('crypto');

function entityText(ent) {
  const parts = [ent.name, ent.description_fa || '', ...(ent.synonyms_fa || [])];
  return parts.filter(Boolean).join(' — ');
}

function columnText(col) {
  const parts = [col.alias || col.name, col.description_fa || '', ...(col.synonyms_fa || [])];
  return parts.filter(Boolean).join(' — ');
}

function textHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// Flat list of everything to embed in one catalog. Hidden columns are skipped:
// BuildPrompt never scores them and they never reach the model.
function embeddableItems(catalog) {
  const items = [];
  for (const ent of catalog.entities || []) {
    const text = entityText(ent);
    items.push({ entity: ent.name, column: null, text, hash: textHash(text) });
    for (const col of ent.columns || []) {
      if (col.exposed === false) continue;
      const ctext = columnText(col);
      items.push({ entity: ent.name, column: col.name, text: ctext, hash: textHash(ctext) });
    }
  }
  return items;
}

module.exports = { entityText, columnText, textHash, embeddableItems };
