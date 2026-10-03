const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { evaluate, summarize } = require('../scripts/benchmark-retrieval');
const { loadCatalogs } = require('../scripts/lib/catalog-loader');

const ROOT = path.join(__dirname, '..');
const questions = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmark', '02', 'questions.json'), 'utf8')).questions;
const catalogs = loadCatalogs(path.join(ROOT, 'catalog')).map((c) => c.data);

test('benchmark questions are well formed', () => {
  const ids = new Set();
  const entities = new Set(catalogs.flatMap((c) => c.entities.map((e) => e.name)));
  for (const q of questions) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    for (const k of ['id', 'domain', 'category', 'difficulty', 'question']) assert.ok(q[k], `${q.id}: ${k}`);
    for (const n of q.expected_entities || []) assert.ok(entities.has(n), `${q.id}: unknown entity ${n}`);
    const scored = !['security', 'not_supported', 'ambiguous', 'access'].includes(q.category);
    if (scored) {
      assert.ok(q.gold_sql, `${q.id}: scored category needs gold_sql`);
      assert.ok(Array.isArray(q.score_on) && q.score_on.length, `${q.id}: score_on`);
    }
  }
});

test('keyword-only retrieval finds the needed tables and never leaks across domains', async () => {
  const results = await evaluate(questions, catalogs, [], null);
  const s = summarize(results);
  const failed = results.filter((r) => r.checked && !r.pass).map((r) => `${r.id}: ${r.missing.join(',')}`);
  assert.equal(s.leaks, 0);
  assert.ok(s.meanRecall >= 0.9, `mean recall ${s.meanRecall}; failing: ${failed.join(' | ')}`);
  assert.ok(results.find((r) => r.id === 'hr_006').pass, 'an HR-only user must not see procurement tables');
});

test('retrieval-only question sets name real entities and unique ids', () => {
  const entities = new Set(catalogs.flatMap((c) => c.entities.map((e) => e.name)));
  for (const file of ['paraphrase_questions.json', 'join_path_questions.json']) {
    const qs = JSON.parse(fs.readFileSync(path.join(ROOT, 'benchmark', '02', file), 'utf8')).questions;
    assert.equal(new Set(qs.map((q) => q.id)).size, qs.length, `${file}: duplicate ids`);
    for (const q of qs) {
      assert.ok(q.question && q.expected_entities.length, `${file} ${q.id}: question and expected_entities`);
      for (const e of q.expected_entities) assert.ok(entities.has(e), `${file} ${q.id}: unknown entity ${e}`);
    }
  }
});
