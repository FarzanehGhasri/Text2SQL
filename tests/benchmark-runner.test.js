const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { runCodeNode } = require('../scripts/lib/n8n-code-runner');
const { generate, SOURCE, OUT } = require('../scripts/build-benchmark-questions');

function score(item, webhookResp, goldRows) {
  return runCodeNode('Score Question', {
    workflow: 'benchmark',
    inputs: [{ goldRows }],
    nodes: { 'Loop Over Questions': item, 'Call Webhook': webhookResp },
  }).json;
}
const q = (extra = {}) => ({ id: 't', category: 'ranking', gold_sql: 'SELECT 1', score_on: ['ProductName', 'NetSales'], ...extra });
const GOLD = [{ ProductName: 'پیچ', NetSales: 1500.004 }, { ProductName: 'مهره', NetSales: 900 }];

test('rows match by value regardless of the model\'s column names, order and extra columns', () => {
  const model = [
    { Total: '900.00', 'نام محصول': 'مهره', Product_key: 7 },
    { Total: 1500, 'نام محصول': 'پیچ', Product_key: 3 },
  ];
  const r = score(q(), { rows: model }, GOLD);
  assert.equal(r.passed, true, r.note);
});

test('a wrong value, a missing row or an extra row fails', () => {
  assert.equal(score(q(), { rows: [{ a: 'پیچ', b: 1500 }, { a: 'مهره', b: 901 }] }, GOLD).passed, false);
  assert.equal(score(q(), { rows: [{ a: 'پیچ', b: 1500 }] }, GOLD).passed, false);
  assert.equal(score(q(), { rows: [...GOLD, { ProductName: 'x', NetSales: 1 }] }, GOLD).passed, false);
  // the same model row cannot satisfy two gold rows
  assert.equal(score(q(), { rows: [{ a: 'پیچ', b: 1500 }, { a: 'پیچ', b: 1500 }] },
    [{ ProductName: 'پیچ', NetSales: 1500 }, { ProductName: 'مهره', NetSales: 1500 }]).passed, false);
});

test('empty gold result matches an empty model result', () => {
  assert.equal(score(q(), { rows: [] }, [{}]).passed, true);
});

test('security passes on any refusal; not_supported only on the not-answerable message', () => {
  assert.equal(score(q({ category: 'security' }), { error: '⛔ عملیات مجاز نیست' }, []).passed, true);
  assert.equal(score(q({ category: 'security' }), { rows: [{ a: 1 }] }, []).passed, false);
  assert.equal(score(q({ category: 'not_supported' }), { error: '⛔ این سوال با داده‌هایی که به آن دسترسی دارید قابل پاسخ نیست.' }, []).passed, true);
  assert.equal(score(q({ category: 'not_supported' }), { error: '⛔ خطای دیگر' }, []).passed, false);
  assert.equal(score(q({ category: 'not_supported' }), { rows: [{ a: 1 }] }, []).passed, false);
  assert.equal(score(q({ category: 'ambiguous' }), { rows: [] }, []).passed, null);
});

test('missing rows (eval mode off) is reported, not scored as a model error', () => {
  const r = score(q(), { answer: '| a |' }, GOLD);
  assert.equal(r.passed, false);
  assert.match(r.note, /x-eval-mode/);
});

test('Load Questions is generated from benchmark/02/questions.json', () => {
  const questions = JSON.parse(fs.readFileSync(SOURCE, 'utf8')).questions;
  assert.equal(fs.readFileSync(OUT, 'utf8'), generate(questions), 'run: node scripts/build-benchmark-questions.js');
  const loaded = runCodeNode('Load Questions', { workflow: 'benchmark' }).result.map((i) => i.json);
  assert.equal(loaded.length, questions.filter((x) => !x.offline_only).length);
  assert.ok(loaded.every((x) => x.id && x.question && x.category));
});
