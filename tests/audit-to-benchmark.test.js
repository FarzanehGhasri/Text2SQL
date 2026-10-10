const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildCandidates, benchmarkKeys } = require('../scripts/audit-to-benchmark');
const { parseCsv } = require('../scripts/lib/csv');
const { questionKey } = require('../scripts/lib/persian-text');

test('CSV parser handles quotes, commas and newlines inside fields, and a BOM', () => {
  const rows = parseCsv('﻿id,question,generated_sql\r\n1,"فروش, امسال","SELECT 1\nFROM [x]"\r\n2,"he said ""hi""",\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].question, 'فروش, امسال');
  assert.equal(rows[0].generated_sql, 'SELECT 1\nFROM [x]');
  assert.equal(rows[1].question, 'he said "hi"');
});

test('repeats are merged and counted, benchmark questions skipped, usernames never copied', () => {
  const rows = [
    { username: 'ali', created_at: '2026-09-01', question: 'فروش هر دفتر فروش؟', generated_sql: 'old', attempt: '1', row_count: '3' },
    { username: 'sara', created_at: '2026-09-05', question: 'فروش  هر دفتر‌فروش', generated_sql: 'new', attempt: '2', row_count: '4' },
    { username: 'ali', created_at: '2026-09-02', question: 'تعداد کارمندان هر واحد', generated_sql: 'x' },
    { username: 'ali', created_at: '2026-09-03', question: '' },
  ];
  const existing = new Set([questionKey('تعداد کارمندان هر واحد')]);
  const out = buildCandidates(rows, existing);
  assert.equal(out.length, 1);
  assert.equal(out[0].seen, 2);
  assert.equal(out[0].draft_sql, 'new');
  assert.equal(out[0].retried, true);
  assert.equal(out[0].row_count, 4);
  assert.equal(out[0].first_seen, '2026-09-01');
  assert.ok(!JSON.stringify(out).includes('sara') && !JSON.stringify(out).includes('ali'));
});

test('the real benchmark questions are recognised as existing', () => {
  const keys = benchmarkKeys(path.join(__dirname, '..', 'benchmark', '02'));
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'benchmark', '02', 'questions.json'), 'utf8')).questions[0];
  assert.ok(keys.has(questionKey(q.question)));
});

test('scripts/lib/persian-text.js normalises exactly like Find Tables', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'n8n_workflows', 'code', 'Find Tables.js'), 'utf8');
  const lib = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'lib', 'persian-text.js'), 'utf8');
  const body = (text, start) => {
    const i = text.indexOf(start);
    return text.slice(i, text.indexOf(';\n', i)).replace(/\(s\) =>|s =>/, '').replace(/\(d\) =>|d =>/g, '').replace(/\s+/g, '');
  };
  assert.equal(body(lib, 'const norm ='), body(src, 'const norm ='));
});
