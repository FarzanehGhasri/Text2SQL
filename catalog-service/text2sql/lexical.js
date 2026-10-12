// Keyword evidence for every table, scored the way search engines score documents (BM25F), instead of fixed
// points per kind of match. Three fields per table:
//   identity     the table's name and synonyms             - what a person wrote to say "this table"
//   columns      the visible columns' names and synonyms
//   description  the words of the table's description
//
// How a question is matched (fixes three measured faults of the old points: «سن» matched inside «حسنی»,
// «دفتر» counted again inside «دفتر فروش», a synonym on five tables counted as much as one on a single table):
//   1. word boundaries: question and catalog are cut into whole words (after Persian normalisation), and a
//      phrase only matches a run of whole words;
//   2. longest match first: a run of words taken by a longer phrase («دفتر فروش») is not matched again by a
//      shorter one inside it («دفتر»); equal phrases on several tables all match;
//   3. rarity (IDF): a phrase on many tables tells little about which one is meant:
//        idf = ln(1 + (N - df + 0.5) / (df + 0.5))      N = tables, df = tables that have the phrase;
//   4. field length (BM25): a match in a 50-column table counts less than in a 4-column one:
//        score = idf · (k1 + 1) · tf / (tf + k1 · (1 - b + b · length / mean length));
//   5. one word, one piece of evidence: a question word a table already matched by its own name, synonym or
//      column does not count again in that table's description (synonym words usually appear in the description too, and
//      counting them twice made the two fields say the same thing).
// k1 = 1.2, b = 0.75 are BM25's standard values (Robertson & Zaragoza 2009), not tuned here; how much each
// field counts against the others and against meaning is learned from data (scripts/train-retrieval.js).
//
//   buildLexicalIndex(entities)        -> index (once per catalog version)
//   lexicalEvidence(index, question)   -> Map(table -> { identity, columns, description, hits: [reason] })

const { lexNorm } = require('../../scripts/lib/persian-text');

const BM25 = { k1: 1.2, b: 0.75 };
const MIN_TOKEN = 2;   // one-letter tokens («و», «ی») carry no meaning

const tokenize = (s) => lexNorm(s).split(/[^\p{L}\p{N}_]+/u).filter((t) => t.length >= MIN_TOKEN);
const idf = (N, df) => Math.log(1 + (N - df + 0.5) / (df + 0.5));
const lengthNorm = (len, avg) => (BM25.k1 + 1) / (1 + BM25.k1 * (1 - BM25.b + BM25.b * (avg > 0 ? len / avg : 1)));

const visibleColumns = (ent) => (ent.columns || []).filter((c) => c.exposed !== false);

function addPhrase(phrases, text, owner) {
  const words = tokenize(text);
  if (!words.length) return;
  const key = words.join(' ');
  if (!phrases.has(key)) phrases.set(key, { words: words.length, owners: [] });
  const list = phrases.get(key).owners;
  if (!list.some((o) => o.table === owner.table && o.field === owner.field)) list.push(owner);
}

function buildLexicalIndex(entities) {
  const phrases = new Map();   // 'دفتر فروش' -> { words, owners: [{ table, field, label }] }
  const descriptions = new Map();   // table -> Map(token -> count)
  const columnCount = new Map();
  for (const e of entities) {
    addPhrase(phrases, e.name, { table: e.name, field: 'identity', label: 'نام جدول در سوال' });
    for (const s of e.synonyms_fa || []) addPhrase(phrases, s, { table: e.name, field: 'identity', label: `مترادف «${s}»` });
    const cols = visibleColumns(e);
    columnCount.set(e.name, cols.length);
    for (const c of cols) {
      addPhrase(phrases, c.alias || c.name, { table: e.name, field: 'columns', label: `ستون ${c.alias || c.name}` });
      for (const s of c.synonyms_fa || []) addPhrase(phrases, s, { table: e.name, field: 'columns', label: `ستون «${s}»` });
    }
    const counts = new Map();
    for (const t of tokenize(e.description_fa || '')) counts.set(t, (counts.get(t) || 0) + 1);
    descriptions.set(e.name, counts);
  }
  const N = entities.length;
  const phraseIdf = new Map([...phrases].map(([k, v]) => [k, idf(N, new Set(v.owners.map((o) => o.table)).size)]));
  const descDf = new Map();
  for (const counts of descriptions.values()) for (const t of counts.keys()) descDf.set(t, (descDf.get(t) || 0) + 1);
  const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  return {
    N,
    phrases,
    phraseIdf,
    maxWords: Math.max(1, ...[...phrases.values()].map((p) => p.words)),
    descriptions,
    descIdf: new Map([...descDf].map(([t, df]) => [t, idf(N, df)])),
    descLength: new Map([...descriptions].map(([n, c]) => [n, [...c.values()].reduce((a, b) => a + b, 0)])),
    avgDescLength: mean([...descriptions.values()].map((c) => [...c.values()].reduce((a, b) => a + b, 0))),
    columnCount,
    avgColumns: mean([...columnCount.values()]),
  };
}

// Phrases found in the question: longest first, never two on the same word; [{ key, start, words }]
function matchPhrases(index, words) {
  const found = [];
  for (let i = 0; i < words.length; i++) {
    for (let n = Math.min(index.maxWords, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).join(' ');
      if (index.phrases.has(key)) found.push({ key, start: i, words: n });
    }
  }
  found.sort((a, b) => b.words - a.words || a.start - b.start);
  const taken = new Array(words.length).fill(false);
  const accepted = [];
  for (const m of found) {
    let free = true;
    for (let k = m.start; k < m.start + m.words; k++) if (taken[k]) free = false;
    if (!free) continue;
    for (let k = m.start; k < m.start + m.words; k++) taken[k] = true;
    accepted.push(m);
  }
  return accepted;
}

function lexicalEvidence(index, question) {
  const words = tokenize(question);
  const out = new Map();
  const row = (table) => {
    if (!out.has(table)) out.set(table, { identity: 0, columns: 0, description: 0, hits: [] });
    return out.get(table);
  };
  const usedByIdentity = new Map();   // table -> question words its name/synonyms matched
  for (const m of matchPhrases(index, words)) {
    const w = index.phraseIdf.get(m.key);
    const seen = new Set();
    for (const o of index.phrases.get(m.key).owners) {
      const r = row(o.table);
      const dedupe = `${o.table}|${o.field}`;
      if (seen.has(dedupe)) continue;   // one phrase counts once per table and field
      seen.add(dedupe);
      r[o.field] += o.field === 'columns' ? w * lengthNorm(index.columnCount.get(o.table), index.avgColumns) : w;
      r.hits.push(o.label);
      if (o.field === 'identity' || o.field === 'columns') {
        if (!usedByIdentity.has(o.table)) usedByIdentity.set(o.table, new Set());
        for (let k = m.start; k < m.start + m.words; k++) usedByIdentity.get(o.table).add(words[k]);
      }
    }
  }
  const qWords = new Set(words);
  for (const [table, counts] of index.descriptions) {
    const len = index.descLength.get(table);
    const own = usedByIdentity.get(table) || new Set();
    const matched = [];
    let s = 0;
    for (const t of qWords) {
      if (own.has(t)) continue;
      const tf = counts.get(t);
      if (!tf) continue;
      s += index.descIdf.get(t) * tf * (BM25.k1 + 1) / (tf + BM25.k1 * (1 - BM25.b + BM25.b * (index.avgDescLength > 0 ? len / index.avgDescLength : 1)));
      matched.push(t);
    }
    if (!s) continue;
    const r = row(table);
    r.description = s;
    r.hits.push(`کلمه ${matched.slice(0, 2).map((w) => `«${w}»`).join(' و ')} در توضیح جدول`);
  }
  return out;
}

module.exports = { buildLexicalIndex, lexicalEvidence, matchPhrases, tokenize, BM25 };
