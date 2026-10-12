// Learns the table-relevance model from labelled questions - the weights AND the thresholds - and measures it
// honestly. Used by scripts/train-retrieval.js; no file or network access here.
//
// A labelled question: { id, set, question, groups, expected: Set(tables) | null, vector, rerank }
//   expected = the tables its SQL needs (benchmark "expected_entities"); null = not answerable (not_supported).
//
//   fitModel(items, questions, signals)    weights: logistic regression on every (question, table) pair the
//                                          question's user may see; L2 strength chosen by 5-fold cross-validation
//                                          (log-loss), folds by question so no question is in both halves.
//                                          Left out: a needed table that another needed table joins to (the join
//                                          closure brings it) and tables a catalog rule always sends (metric,
//                                          whole stored value, pattern) - the model learns what is left to decide.
//   chooseSelect(items, model, labelled)   the probability a table needs to reach the prompt, measured on the REAL
//                                          pipeline (Find Tables + BuildPrompt, closure, join paths, 24 000-char
//                                          budget): the best mean F2 over the questions (ties: the higher threshold).
//                                          F2 weighs recall 4x precision (beta = 2, the usual recall-first measure;
//                                          --beta changes it - check the choice with the end-to-end benchmark):
//                                          a missing table makes the SQL impossible, an extra one is noise for the
//                                          model. Counting only "all needed tables present" was tried and rejected:
//                                          the 24 000-char budget cuts long prompts silently, so it learned to send
//                                          nearly everything (25-31 tables) for one more pass.
//   chooseDomainRatio(...)                 which domains take part (their core table, rules and examples come
//                                          with them): those within this fraction of the best domain's score,
//                                          by the same rule (ties: the higher fraction); and at most how many
//                                          domains (1..6, ties: fewer)
//   chooseJoinPath(...)                    which tables get connected through link tables (join paths): the
//                                          threshold, at or above `select`, by the same rule
//   chooseConfident(...)                   below which top probability a question is flagged "probably not
//                                          answerable": the value with the best balanced accuracy between the
//                                          not_supported questions and the answerable ones (ties: the lower value,
//                                          i.e. fewer answerable questions flagged)
//   crossValidate(items, questions, signals, k)  every question answered by a model that never saw it

const { featuresOf } = require('../../catalog-service/text2sql/relevance');
const { tableEvidence } = require('../../catalog-service/text2sql/find-tables');
const { fit, logLoss } = require('./logistic-regression');
const { runBuildPrompt } = require('./n8n-code-runner');

const L2_GRID = [0.01, 0.1, 1, 10, 100];
const L2_FOLDS = 5;
const MAX_DOMAINS_GRID = [6, 5, 4, 3, 2, 1];   // descending: on equal quality the later (fewer) wins
const RATIO_GRID = Array.from({ length: 20 }, (_, i) => (i + 1) / 20);
const SELECT_GRID = Array.from({ length: 30 }, (_, i) => Math.exp(Math.log(0.002) + (i / 29) * (Math.log(0.9) - Math.log(0.002))));

const groupsOf = (q) => q.groups && q.groups.length ? q.groups : ['NLSQL-Full'];
const modelItem = (model) => ({ retrievalModel: true, formatVersion: 1, models: [model] });

// rows of one question for the given signals: [{ name, x, y }]
const evidenceCache = new WeakMap();
function rowsOf(items, q, signals) {
  if (!evidenceCache.has(q)) evidenceCache.set(q, new Map());
  const key = signals.join('+');
  const cache = evidenceCache.get(q);
  if (!cache.has(key)) {
    const ev = tableEvidence({
      items, question: q.question, groups: groupsOf(q),
      questionEmbedding: signals.includes('semantic') ? q.vector : null,
      rerankScores: signals.includes('rerank') ? q.rerank : null,
    });
    // a needed table that another needed table joins to (from -> to) arrives through the join closure anyway;
    // asking the model to score it high from its own (often absent) evidence only teaches noise: left out
    const joins = ev.parsed.catalogs.flatMap((c) => c.joins || []);
    const implied = new Set(q.expected ? joins.filter((j) => q.expected.has(j.from) && q.expected.has(j.to) && j.from !== j.to).map((j) => j.to) : []);
    // tables a catalog rule always sends (a named metric's tables, a whole stored value's table, a matched
    // pattern) are decided already; the model learns the rest
    const ruled = (r) => r.x.metric || r.x.value_exact || r.x.pattern;
    cache.set(key, ev.rows.filter((r) => !implied.has(r.ent.name) && !ruled(r))
      .map((r) => ({ name: r.ent.name, x: r.x, y: q.expected && q.expected.has(r.ent.name) ? 1 : 0 })));
  }
  return cache.get(key);
}

function design(items, questions, features, signals) {
  const X = [], y = [], owner = [];
  questions.forEach((q, qi) => {
    for (const r of rowsOf(items, q, signals)) {
      X.push(features.map((f) => Number(r.x[f] || 0)));
      y.push(r.y);
      owner.push(qi);
    }
  });
  return { X, y, owner };
}

function chooseL2(items, questions, features, signals) {
  const { X, y, owner } = design(items, questions, features, signals);
  let best = null;
  for (const l2 of L2_GRID) {
    let loss = 0;
    for (let k = 0; k < L2_FOLDS; k++) {
      const tr = [], te = [];
      owner.forEach((qi, i) => ((qi % L2_FOLDS === k) ? te : tr).push(i));
      if (!te.length || !tr.length || !tr.some((i) => y[i])) continue;
      const m = fit(tr.map((i) => X[i]), tr.map((i) => y[i]), { l2 });
      loss += logLoss(m, te.map((i) => X[i]), te.map((i) => y[i])) * te.length;
    }
    if (!best || loss < best.loss - 1e-12) best = { l2, loss };
  }
  return best.l2;
}

function fitModel(items, questions, signals) {
  const labelled = questions.filter((q) => q.expected);
  const features = featuresOf(signals);
  const l2 = chooseL2(items, labelled, features, signals);
  const { X, y } = design(items, labelled, features, signals);
  const m = fit(X, y, { l2 });
  const r = (v) => Math.round(v * 1e6) / 1e6;
  return { signals, features, l2, mean: m.mean.map(r), std: m.std.map(r), weights: m.weights.map(r), bias: r(m.bias),
           thresholds: { select: 0, domainRatio: 0, maxDomains: 6, joinPath: 0, confident: 0 } };
}

// The real pipeline for one question with this model: { selected: Set, chars, topScore, lowConfidence }
function runQuestion(items, model, q) {
  const { json, plan } = runBuildPrompt({
    inputs: [...items, modelItem(model)],
    nodes: { AuthCheck: { groups: groupsOf(q) }, Webhook: { body: { question: q.question } },
             'Embed Question': model.signals.includes('semantic') && q.vector ? [q.vector] : {} },
    rerankScores: model.signals.includes('rerank') ? q.rerank : null,
  });
  return { selected: new Set(json.selectedEntities), chars: json.promptChars, topScore: plan.retrieval.topScore,
           lowConfidence: plan.retrieval.lowConfidence };
}

// F-beta of the tables in the prompt against the needed ones; beta = how many times recall counts over precision
let BETA = 4;
const setBeta = (b) => { BETA = b; };
const getBeta = () => BETA;
function f2(expected, selected, beta = BETA) {
  const tp = [...expected].filter((n) => selected.has(n)).length;
  if (!tp) return 0;
  const p = tp / selected.size, r = tp / expected.size, b2 = beta * beta;
  return ((1 + b2) * p * r) / (b2 * p + r);
}
const passes = (expected, selected) => [...expected].every((n) => selected.has(n));

// { passed, f2 } of a model over the labelled questions; better() orders them by mean F2, then passes
function quality(items, m, labelled) {
  let passed = 0, f = 0;
  for (const q of labelled) {
    const sel = runQuestion(items, m, q).selected;
    if (passes(q.expected, sel)) passed++;
    f += f2(q.expected, sel);
  }
  return { passed, f2: f / labelled.length };
}
const atLeast = (a, b) => a.f2 > b.f2 + 1e-12 || (Math.abs(a.f2 - b.f2) <= 1e-12 && a.passed >= b.passed);

// over the grid (ascending), the best quality; on equal quality the later (higher) threshold
function bestThreshold(grid, items, labelled, withT) {
  let best = null;
  for (const t of grid) {
    const q = quality(items, withT(t), labelled);
    if (!best || atLeast(q, best.q)) best = { t, q };
  }
  return best;
}

const withThresholds = (model, t) => Object.assign({}, model, { thresholds: Object.assign({}, model.thresholds, t) });

function chooseSelect(items, model, labelled) {
  return bestThreshold(SELECT_GRID, items, labelled, (t) => withThresholds(model, { select: t, domainRatio: 0, maxDomains: 6, joinPath: t, confident: 0 })).t;
}

// a threshold at or above `select`, the others as they are
function chooseAbove(name, items, model, labelled) {
  const grid = SELECT_GRID.filter((x) => x >= model.thresholds.select);
  if (!grid.length) return model.thresholds.select;
  return bestThreshold(grid, items, labelled, (t) => withThresholds(model, { [name]: t, confident: 0 })).t;
}
const chooseDomainRatio = (items, model, labelled) =>
  bestThreshold(RATIO_GRID, items, labelled, (t) => withThresholds(model, { domainRatio: t, confident: 0 })).t;
const chooseMaxDomains = (items, model, labelled) =>
  bestThreshold(MAX_DOMAINS_GRID, items, labelled, (t) => withThresholds(model, { maxDomains: t, confident: 0 })).t;
const chooseJoinPath = (items, model, labelled) => chooseAbove('joinPath', items, model, labelled);

function chooseConfident(items, model, labelled, unanswerable) {
  if (!unanswerable.length) return 0;
  const m = Object.assign({}, model, { thresholds: Object.assign({}, model.thresholds, { confident: 0 }) });
  const top = (q) => runQuestion(items, m, q).topScore;
  const pos = unanswerable.map(top), neg = labelled.map(top);
  const cuts = [...new Set([...pos, ...neg])].sort((a, b) => a - b);
  const candidates = [0, ...cuts.map((v, i) => (i + 1 < cuts.length ? (v + cuts[i + 1]) / 2 : v + 1e-9))];
  let best = null;
  for (const t of candidates) {
    const tpr = pos.filter((v) => v < t).length / pos.length;    // not answerable, flagged
    const tnr = neg.filter((v) => v >= t).length / neg.length;   // answerable, not flagged
    const ba = (tpr + tnr) / 2;
    if (!best || ba > best.ba + 1e-12) best = { t, ba };          // ties: the lower threshold
  }
  return best.t;
}

// a complete model (weights + thresholds) from these questions
function train(items, questions, signals) {
  const labelled = questions.filter((q) => q.expected);
  const unanswerable = questions.filter((q) => !q.expected);
  const model = fitModel(items, questions, signals);
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  // coordinate ascent: each threshold in turn with the others fixed, two rounds (a choice can depend on a later one)
  model.thresholds.select = r6(chooseSelect(items, model, labelled));
  model.thresholds.joinPath = model.thresholds.select;
  for (let round = 0; round < 2; round++) {
    model.thresholds.domainRatio = r6(chooseDomainRatio(items, model, labelled));
    model.thresholds.maxDomains = chooseMaxDomains(items, model, labelled);
    model.thresholds.select = r6(bestThreshold(SELECT_GRID, items, labelled,
      (t) => withThresholds(model, { select: t, joinPath: Math.max(t, model.thresholds.joinPath), confident: 0 })).t);
    model.thresholds.joinPath = r6(chooseJoinPath(items, model, labelled));
  }
  model.thresholds.confident = r6(chooseConfident(items, model, labelled, unanswerable));
  return model;
}

// Per question, held out: { id, set, pass, f2, tables, chars, flagged } (pass/f2 only for labelled questions)
function evaluate(items, model, questions) {
  return questions.map((q) => {
    const r = runQuestion(items, model, q);
    return q.expected
      ? { id: q.id, set: q.set, pass: passes(q.expected, r.selected), f2: f2(q.expected, r.selected), tables: r.selected.size, chars: r.chars, flagged: r.lowConfidence }
      : { id: q.id, set: q.set, unanswerable: true, flagged: r.lowConfidence, tables: r.selected.size, chars: r.chars };
  });
}

// k-fold by question (sorted by id, every k-th question in the same fold)
function crossValidate(items, questions, signals, k = 10) {
  const sorted = [...questions].sort((a, b) => a.id.localeCompare(b.id));
  const out = [];
  for (let f = 0; f < k; f++) {
    const test = sorted.filter((_, i) => i % k === f);
    const trainSet = sorted.filter((_, i) => i % k !== f);
    if (!test.length) continue;
    out.push(...evaluate(items, train(items, trainSet, signals), test));
  }
  return out;
}

function summarise(results) {
  const by = {};
  for (const r of results) {
    const s = by[r.set] = by[r.set] || { questions: 0, passed: 0, f2: 0, tables: 0, chars: 0, unanswerable: 0, flagged: 0, answerableFlagged: 0 };
    if (r.unanswerable) { s.unanswerable++; if (r.flagged) s.flagged++; continue; }
    s.questions++; if (r.pass) s.passed++; s.f2 += r.f2; s.tables += r.tables; s.chars += r.chars; if (r.flagged) s.answerableFlagged++;
  }
  for (const s of Object.values(by)) if (s.questions) { s.f2 = Math.round(s.f2 / s.questions * 1000) / 1000; s.tables = Math.round(s.tables / s.questions * 10) / 10; s.chars = Math.round(s.chars / s.questions); }
  return by;
}

module.exports = { setBeta, getBeta, train, fitModel, chooseSelect, chooseDomainRatio, chooseMaxDomains, chooseJoinPath, chooseConfident, evaluate, crossValidate, summarise, f2, passes, runQuestion, SELECT_GRID, L2_GRID };
