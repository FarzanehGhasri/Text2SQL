// Which catalog columns get their stored values indexed (Step 2 of the accuracy
// plan: value retrieval, as in CHESS / CodeS). A question that names a value -
// «دفتر فروش تهران», «باطل شده», «بانک ملت» - only works if the model writes the
// exact stored spelling; the value index tells it.
//
// A column is indexed when it is exposed, holds text, and is not:
//   - a code / number / date / key (by name, or a description that starts with
//     کد / شماره / کلید): matching those is the model's job, not a lookup;
//   - a free-text description (Description, شرح, توضیحات ...) - unless the table is
//     a small lookup (at most LOOKUP_MAX_COLUMNS columns) whose only text column it
//     is, as in the HR dimensions where Description IS the name («شرح» of
//     Dim_Department = the department's name).
// "values": true / false on a catalog column overrides the rule either way.

const TEXT_TYPES = new Set(['nvarchar', 'varchar', 'nchar', 'char']);
const NOT_A_VALUE = /code|number|serial|sayad|shomare|date|_key$|^key$|ref$|_en$|شماره|کد|تاریخ/i;
const NOT_A_VALUE_DESC = /^\s*(کد|شماره|کلید)/;
const FREE_TEXT = /desc|decription|descreption|specification|شرح|توضیحات/i;
const LOOKUP_MAX_COLUMNS = 3;

const isExposed = (col) => col.exposed !== false;
const isText = (col) => TEXT_TYPES.has(String(col.type || '').toLowerCase());

function isCandidate(col) {
  return isExposed(col) && isText(col)
    && !NOT_A_VALUE.test(col.name) && !NOT_A_VALUE_DESC.test(col.description_fa || '');
}

// [{ entity, source, column, key }] for one entity. `key` is the column other
// tables join to (a dimension's primary key), so a matched value can also be
// given as its key: OrderItemState_Key = 6 instead of a join on the name.
function valueColumnsOf(ent, keyOf) {
  if ((ent.kind || 'table') !== 'table' || !ent.source) return [];
  const cols = ent.columns || [];
  const candidates = cols.filter(isCandidate);
  const picked = cols.filter((c) => {
    if (c.values === false) return false;
    if (c.values === true) return isExposed(c);
    if (!candidates.includes(c)) return false;
    const freeText = FREE_TEXT.test(c.name) || FREE_TEXT.test(c.description_fa || '');
    return !freeText || (candidates.length === 1 && cols.length <= LOOKUP_MAX_COLUMNS);
  });
  return picked.map((c) => ({ entity: ent.name, source: ent.source, column: c.name, key: keyOf(ent.name) }));
}

// All value columns across catalogs, in catalog/entity/column order.
function valueColumns(catalogs) {
  const keys = new Map(); // entity -> the single column joins point at
  for (const c of catalogs) {
    for (const j of c.joins || []) {
      const k = keys.get(j.to);
      keys.set(j.to, k === undefined || k === j.to_column ? j.to_column : null);
    }
  }
  const keyOf = (name) => keys.get(name) || null;
  return catalogs.flatMap((c) => (c.entities || []).flatMap((e) => valueColumnsOf(e, keyOf)));
}

module.exports = { valueColumns, valueColumnsOf, isCandidate };
