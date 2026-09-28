// ===== خلاصه نتایج کل benchmark پس از پایان حلقه =====
const items = $input.all().map(i => i.json);
const scored = items.filter(i => i.passed !== null);
const passed = scored.filter(i => i.passed);
const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : null);

const groupBy = field => {
  const acc = {};
  for (const r of scored) (acc[r[field]] = acc[r[field]] || []).push(r.passed);
  return Object.entries(acc).map(([k, vals]) => ({
    [field]: k,
    passed: vals.filter(Boolean).length,
    total: vals.length,
    accuracyPct: pct(vals.filter(Boolean).length, vals.length)
  }));
};

const summary = {
  overallAccuracyPct: pct(passed.length, scored.length),
  passedCount: passed.length,
  scoredCount: scored.length,
  needsManualReview: items.length - scored.length,
  retriedCount: items.filter(i => i.retried).length,
  byCategory: groupBy('category'),
  byDomain: groupBy('domain'),
  failed: scored.filter(i => !i.passed).map(i => ({ id: i.id, note: i.note }))
};

return [{ json: { summary, details: items } }];
