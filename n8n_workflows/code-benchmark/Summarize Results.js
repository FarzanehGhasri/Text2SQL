// ===== خلاصه نتایج کل benchmark پس از پایان حلقه =====
// اول «inPlainWords» را بخوانید: نتیجه به زبان ساده. عددهای پایین‌تر برای جزئیات است.
// سوال‌های confirmed (جواب‌هایی که بازبین در Obsidian تأیید کرده) جدا شمرده می‌شوند: همان سوال‌ها مثال
// بانک کوئری هم هستند، پس فقط نشان می‌دهند تغییری جواب قبلاً درست را خراب نکرده است.
const all = $input.all().map(i => i.json);
const items = all.filter(i => i.category !== 'confirmed');
const confirmed = all.filter(i => i.category === 'confirmed' && i.passed !== null);
const scored = items.filter(i => i.passed !== null);
const passed = scored.filter(i => i.passed);
const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : null);

// هر نوع خطا به زبان ساده و کاری که معمولاً درستش می‌کند
const MEANING = {
  retrieval_miss:        'جدول لازم به مدل داده نشد - معمولاً مترادفِ جدول کم است (synonyms_fa)',
  wrong_values:          'جدول درست بود ولی عدد یا فیلتر غلط - معمولاً یک معیار (metrics) یا راهنما لازم است',
  wrong_row_count:       'تعداد ردیف‌ها غلط است - گروه‌بندی یا TOP اشتباه؛ یک مثال مشابه در بانک کوئری کمک می‌کند',
  empty_result:          'نتیجه خالی شد - معمولاً فیلتر مقدار یا تاریخ غلط؛ ایندکس مقدارها (values.json) کمک می‌کند',
  sql_error:             'SQL روی سرور خطا داد - حتی بعد از یک بار اصلاح',
  security_rejected:     'لایه امنیتی SQL مدل را رد کرد - معمولاً جدولی خارج از فهرست داده‌شده',
  wrongly_not_supported: 'مدل گفت «قابل پاسخ نیست» ولی بود - معمولاً جدول یا معیار لازم به مدل نرسیده',
  answered_unanswerable: 'سوال خارج از داده بود ولی مدل جواب ساخت',
  refused_wrong_reason:  'سوال خارج از داده بود و رد شد، ولی با پیام دیگری',
  security_not_refused:  'درخواست خطرناک رد نشد - فوراً بررسی شود',
  eval_mode_off:         'ردیف‌ها برنگشت - ایمیل «Call Webhook» باید عضو IT - Data باشد'
};

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

const failCounts = scored.filter(i => !i.passed).reduce((acc, i) => {
  const k = i.failure_type || 'unknown';
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});
const top = Object.entries(failCounts).sort((a, b) => b[1] - a[1])[0];
const confirmedOk = confirmed.filter(i => i.passed).length;

const summary = {
  inPlainWords: [
    `${passed.length} از ${scored.length} سوال درست جواب گرفت (${pct(passed.length, scored.length) ?? '-'}٪).`,
    confirmed.length
      ? `جواب‌های تأییدشده در Obsidian: ${confirmedOk} از ${confirmed.length} هنوز درست است`
        + (confirmedOk < confirmed.length ? ' - تغییر اخیر چیزی را خراب کرده؛ confirmedBroken را ببینید.' : '.')
      : 'هنوز جوابی در Obsidian تأیید نشده (How-to → Review answers).',
    top ? `بیشترین مشکل (${top[1]} سوال): ${MEANING[top[0]] || top[0]}.` : 'هیچ سوالی خطا نداشت.',
    items.length - scored.length ? `${items.length - scored.length} سوال مبهم باید با چشم بررسی شود (needsManualReview).` : ''
  ].filter(Boolean),
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
  failed: scored.filter(i => !i.passed).map(i => ({ id: i.id, failure_type: i.failure_type,
                                                   meaning: MEANING[i.failure_type] || '', note: i.note })),
  confirmedStillCorrectPct: pct(confirmedOk, confirmed.length),
  confirmedBroken: confirmed.filter(i => !i.passed).map(i => ({ id: i.id, question: i.question, note: i.note }))
};

return [{ json: { summary, details: all } }];
