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
  // کدام بخش سیستم بیشترین خطا را می‌سازد؛ بزرگ‌ترین عدد = اولویت بعدی بهبود
  byFailureType: Object.entries(
    scored.filter(i => !i.passed).reduce((acc, i) => {
      const k = i.failure_type || 'unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).map(([failure_type, count]) => ({ failure_type, count })),
  failed: scored.filter(i => !i.passed).map(i => ({ id: i.id, failure_type: i.failure_type, note: i.note }))
};

return [{ json: { summary, details: items } }];
