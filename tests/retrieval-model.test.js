// The learned table-relevance model: keyword evidence (BM25F), logistic regression, training, the model file.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { buildLexicalIndex, lexicalEvidence, matchPhrases, tokenize } = require('../catalog-service/text2sql/lexical');
const { chooseModel, featuresOf, score, zScores } = require('../catalog-service/text2sql/relevance');
const { fit, predict, logLoss } = require('../scripts/lib/logistic-regression');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');
const { runBuildPrompt } = require('../scripts/lib/n8n-code-runner');
const T = require('../scripts/lib/retrieval-training');
const { loadQuestions } = require('../scripts/train-retrieval');

const ROOT = path.join(__dirname, '..');
const REAL = loadCatalogs(path.join(ROOT, 'catalog')).map((c) => c.data);
const MODEL = require('../catalog-service/text2sql/baseline-model.json');

const table = (name, synonyms, description, columns = []) => ({ name, synonyms_fa: synonyms, description_fa: description,
  columns: columns.map((c) => (typeof c === 'string' ? { name: c } : c)) });

// ---------------------------------------------------------------- keyword evidence
test('whole words only: a synonym never matches inside another word («سن» in «حسنی»)', () => {
  const ix = buildLexicalIndex([table('Dim_BirthDay', ['سن'], 'تاریخ تولد'), table('Fact_Sales', ['فروش'], 'اقلام فروش')]);
  const ev = lexicalEvidence(ix, 'فروش آقای حسنی');
  assert.ok(!ev.has('Dim_BirthDay'));
  assert.ok(ev.get('Fact_Sales').identity > 0);
  assert.ok(lexicalEvidence(ix, 'میانگین سن کارکنان').get('Dim_BirthDay').identity > 0);
});

test('longest match first: «دفتر فروش» is one concept, «دفتر» inside it is not counted again', () => {
  const ix = buildLexicalIndex([table('Dim_SalesOffice', ['دفتر فروش'], 'دفاتر'), table('Dim_Ledger', ['دفتر'], 'دفاتر حسابداری'),
    table('Fact_Sales', ['فروش'], 'اقلام')]);
  const ev = lexicalEvidence(ix, 'فروش خالص هر دفتر فروش');
  assert.ok(ev.get('Dim_SalesOffice').identity > 0);
  assert.ok(!ev.has('Dim_Ledger') || ev.get('Dim_Ledger').identity === 0, 'no «دفتر» match left for the ledger');
  assert.ok(ev.get('Fact_Sales').identity > 0, 'the first «فروش» is still free');
  assert.deepEqual(matchPhrases(ix, tokenize('دفتر فروش')).map((m) => m.key), ['دفتر فروش']);
});

test('rarity: a phrase on many tables counts less than one on a single table', () => {
  const ix = buildLexicalIndex([table('A', ['واحد'], 'x'), table('B', ['واحد'], 'y'), table('C', ['انبار'], 'z'), table('D', [], 'w')]);
  assert.ok(lexicalEvidence(ix, 'انبار').get('C').identity > lexicalEvidence(ix, 'واحد').get('A').identity);
});

test('one word, one piece of evidence: a synonym word does not count again in the same table\'s description', () => {
  const ix = buildLexicalIndex([table('Fact_Sales', ['فروش'], 'اقلام فروش'), table('Dim_SalesOffice', [], 'دفاتر فروش')]);
  const ev = lexicalEvidence(ix, 'فروش');
  assert.equal(ev.get('Fact_Sales').description, 0);
  assert.ok(ev.get('Dim_SalesOffice').description > 0, 'another table\'s description still counts');
});

test('column vocabulary is the table\'s vocabulary; wide tables get less per matched column (BM25 length)', () => {
  const cols = (n) => Array.from({ length: n }, (_, i) => ({ name: `c${i}` }));
  const ix = buildLexicalIndex([
    table('Narrow', [], 'a', [{ name: 'X', synonyms_fa: ['مبلغ پرداخت'] }, ...cols(1)]),
    table('Wide', [], 'b', [{ name: 'Y', synonyms_fa: ['مبلغ پرداخت'] }, ...cols(40)]),
  ]);
  const ev = lexicalEvidence(ix, 'مبلغ پرداخت');
  assert.ok(ev.get('Narrow').columns > ev.get('Wide').columns);
  assert.ok(ev.get('Narrow').hits.includes('ستون «مبلغ پرداخت»'));
});

// ---------------------------------------------------------------- the model
test('logistic regression recovers the direction of real effects and is deterministic', () => {
  // y depends on x0 (strongly), not on x1
  const X = [], y = [];
  for (let i = 0; i < 400; i++) { const a = (i % 20) / 10 - 1, b = ((i * 7) % 13) / 6 - 1; X.push([a, b]); y.push(a + 0.1 * Math.sin(i) > 0 ? 1 : 0); }
  const m = fit(X, y, { l2: 1 });
  assert.ok(m.weights[0] > 2 && Math.abs(m.weights[1]) < 0.5, JSON.stringify(m.weights));
  assert.deepEqual(fit(X, y, { l2: 1 }), m, 'same data, same weights');
  assert.ok(predict(m, [0.9, 0]) > 0.9 && predict(m, [-0.9, 0]) < 0.1);
  assert.ok(logLoss(m, X, y) < logLoss(fit(X, y, { l2: 1000 }), X, y), 'a heavy penalty fits worse');
});

test('z-scores: the same similarity for every table means nobody stands out', () => {
  const z = zScores(new Map([['a', 0.6], ['b', 0.6], ['c', 0.6], ['d', null]]));
  assert.deepEqual([...z.values()], [0, 0, 0, 0]);
  const z2 = zScores(new Map([['a', 0.9], ['b', 0.4], ['c', 0.4], ['d', 0.4]]));
  assert.ok(z2.get('a') > 1.5 && z2.get('b') < 0);
});

test('the richest model whose signals are all available is used', () => {
  const file = { models: [{ signals: ['lexical'] }, { signals: ['lexical', 'semantic'] }, { signals: ['lexical', 'semantic', 'rerank'] }] };
  assert.deepEqual(chooseModel(file, new Set(['lexical'])).signals, ['lexical']);
  assert.deepEqual(chooseModel(file, new Set(['lexical', 'semantic'])).signals, ['lexical', 'semantic']);
  assert.deepEqual(chooseModel(file, new Set(['lexical', 'semantic', 'rerank'])).signals, ['lexical', 'semantic', 'rerank']);
  assert.equal(chooseModel(null, new Set(['lexical'])), null);
});

test('confidence ignores stored-value matches: a city name alone does not make a question answerable', () => {
  const m = MODEL.models[0];
  const x = Object.fromEntries(m.features.map((f) => [f, 0]));
  const withValue = score(m, Object.assign({}, x, { value_partial: 1 }));
  assert.equal(withValue.pConfidence, score(m, x).pConfidence);
});

// ---------------------------------------------------------------- the committed model file
test('the baseline model (keyword-only, committed): learned, complete, and its thresholds act in the real pipeline', () => {
  assert.equal(MODEL.retrievalModel, true);
  assert.ok(MODEL.trainedOn.labelled >= 60, 'trained on the benchmark questions');
  const lexical = MODEL.models.find((m) => m.signals.join() === 'lexical');
  assert.ok(lexical, 'a keyword-only model is always there (embeddings may be down)');
  for (const m of MODEL.models) {
    assert.deepEqual(m.features, featuresOf(m.signals));
    for (const k of ['weights', 'mean', 'std']) assert.equal(m[k].length, m.features.length, k);
    const t = m.thresholds;
    assert.ok(t.select > 0 && t.select < 1 && t.joinPath >= t.select && t.domainRatio > 0 && t.domainRatio <= 1, JSON.stringify(t));
    assert.ok(Number.isInteger(t.maxDomains) && t.maxDomains >= 1);
  }
  const { json } = runBuildPrompt({ inputs: REAL, nodes: { AuthCheck: { groups: ['NLSQL-Full'] }, Webhook: { body: { question: 'فروش خالص هر دفتر فروش' } } } });
  assert.equal(json.retrieval.model.thresholds.select, lexical.thresholds.select);
  assert.ok(json.selectedEntities.includes('Fact_Sales') && json.selectedEntities.includes('Dim_SalesOffice'));
  assert.ok(!json.selectedEntities.includes('Dim_Ledger'), '«دفتر» inside «دفتر فروش» no longer brings the ledger');
});

test('training: weights and every threshold come from the data, deterministically', () => {
  const items = require('fs').readdirSync(path.join(ROOT, 'catalog')).filter((f) => f.endsWith('.json') && f !== 'retrieval-model.json')
    .map((f) => require(path.join(ROOT, 'catalog', f)));
  const qs = loadQuestions(path.join(ROOT, 'benchmark', '02')).filter((q) => q.set === 'join_path_questions');
  const m = T.fitModel(items, qs, ['lexical']);
  assert.deepEqual(T.fitModel(items, qs, ['lexical']), m);
  assert.ok(T.L2_GRID.includes(m.l2));
  const select = T.chooseSelect(items, m, qs);
  assert.ok(T.SELECT_GRID.includes(select));
  // F-beta: recall counts beta^2 times precision
  const exp = new Set(['A', 'B']);
  assert.ok(T.f2(exp, new Set(['A', 'B', 'C', 'D'])) > T.f2(exp, new Set(['A'])), 'an extra table costs less than a missing one');
});
