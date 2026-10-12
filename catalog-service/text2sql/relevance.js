// How likely a table is needed for a question - a probability learned from labelled questions, instead of
// points somebody chose. Every piece of evidence about a (question, table) pair becomes a number (a feature);
// a logistic model fitted on the benchmark questions (scripts/train-retrieval.js) turns them into P(needed).
// The thresholds that act on it (which tables to send, when a question looks unanswerable) are chosen from the
// same data and stored with the model: catalog/retrieval-model.json (trained on the server with the real
// embeddings, not in git), or the committed keyword-only baseline-model.json next to this file.
//
// Features, grouped by the signal that produces them:
//   lexical   identity, description            BM25F keyword evidence (lexical.js); identity = the vocabulary a
//                                              person attached to the table: its name and synonyms and its columns'
//                                              names, aliases and synonyms (columns alone had 1 training example in
//                                              10 000 - too few to learn a weight of their own)
//             *_rel                            the same, divided by the best table's value for this question (0..1):
//                                              what matters is how a table compares with the others for the
//                                              SAME question, not the raw number (which grows with question length)
//             domain_match                     the best identity_rel among the tables of this table's domain: a
//                                              dimension or core table of the domain the question is about
//             value_partial                    a phrase of the question is inside a stored value of the table
//             core                             the table is its domain's core table
// Not features but rules (find-tables.js ruleTables): a named metric's tables, a whole stored value's table and a
// matched table pattern (Persian year -> Dim_Date) are always sent - a person declared them in the catalog.
//   semantic  meaning_table, meaning_columns   how far the question's similarity to the table card / to its 3
//                                              closest columns stands above the mean over all tables (z-score)
//   rerank    rerank                           a cross-encoder's judgement of (question, table card) together
// The model file holds one model per combination of signals. For each question the richest model whose
// signals are all available is used, so a failing embeddings service or reranker gives a model trained for
// exactly that situation - not the same weights with features silently missing.

const { explain } = require('../../scripts/lib/logistic-regression');

const SIGNAL_FEATURES = {
  lexical: ['identity', 'description', 'identity_rel', 'description_rel', 'domain_match', 'value_partial', 'core'],
  semantic: ['meaning_table', 'meaning_columns'],
  rerank: ['rerank'],
};
// values say *where* to look, not *whether* the data can answer: «هوای تهران» names a city that may be a stored
// value but is still not answerable. Confidence is judged without them.
const NOT_FOR_CONFIDENCE = ['value_partial'];

const featuresOf = (signals) => signals.flatMap((s) => SIGNAL_FEATURES[s]);

// The richest model whose signals are all available, or null.
function chooseModel(file, available) {
  if (!file || !Array.isArray(file.models)) return null;
  const usable = file.models.filter((m) => m.signals.every((s) => available.has(s)));
  usable.sort((a, b) => b.signals.length - a.signals.length);
  return usable[0] || null;
}

const vector = (model, x) => model.features.map((f) => Number(x[f] || 0));

// { p, pConfidence, contrib: { feature: share of the log-odds } }
function score(model, x) {
  const full = explain(model, vector(model, x));
  const withoutWhere = Object.assign({}, x);
  for (const f of NOT_FOR_CONFIDENCE) withoutWhere[f] = 0;
  const contrib = {};
  model.features.forEach((f, j) => { contrib[f] = full.contrib[j]; });
  return { p: full.p, pConfidence: explain(model, vector(model, withoutWhere)).p, contrib };
}

// z-scores of each table's similarity against every catalog table's similarity to the same question; a
// similarity alone means little (bge-m3 gives ~0.4 even to unrelated text), its distance from the rest does.
function zScores(values) {
  const known = [...values.values()].filter((v) => v !== null);
  if (known.length < 2) return new Map([...values.keys()].map((k) => [k, 0]));
  const mean = known.reduce((a, b) => a + b, 0) / known.length;
  const sd = Math.sqrt(known.reduce((a, b) => a + (b - mean) ** 2, 0) / known.length) || 1;
  return new Map([...values].map(([k, v]) => [k, v === null ? 0 : (v - mean) / sd]));
}

module.exports = { SIGNAL_FEATURES, NOT_FOR_CONFIDENCE, featuresOf, chooseModel, score, zScores };
