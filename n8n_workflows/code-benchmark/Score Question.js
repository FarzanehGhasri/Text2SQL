// ===== امتیازدهی هر سوال: مقایسه ردیف‌های مدل با ردیف‌های gold =====
// مقایسه بر اساس مقدارهاست، نه نام ستون‌ها: مدل نام ستون (alias) و ترتیب ستون‌ها را خودش
// انتخاب می‌کند، پس «ProductName» در gold و «[نام محصول]» در خروجی مدل باید برابر حساب شوند.
// هر ردیف gold (فقط ستون‌های score_on) باید با یک ردیف جداگانه از خروجی مدل جور شود که همه
// آن مقدارها را دارد (ستون اضافه در خروجی مدل اشکالی ندارد) و تعداد ردیف‌ها باید برابر باشد.
const item = $('Loop Over Questions').item.json;   // متادیتای سوال
const webhookResp = $('Call Webhook').item.json;    // پاسخ workflow اصلی (حالت ارزیابی)
// خروجی Aggregate Gold Rows؛ نتیجه خالی ممکن است یک آیتم خالی {} باشد
const goldRows = (($json.goldRows) || []).filter(r => r && Object.keys(r).length > 0);

const normalizeValue = v => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim();
  if (/^-?[\d,]+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s.replace(/,/g, ''));
    if (!Number.isNaN(n)) return Math.round(n * 100) / 100;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
};
const key = v => JSON.stringify(normalizeValue(v));

// شمارش مقدارها برای مقایسه چندمجموعه‌ای (multiset)
const bag = values => {
  const m = new Map();
  for (const v of values) m.set(key(v), (m.get(key(v)) || 0) + 1);
  return m;
};
const contains = (big, small) => [...small].every(([k, n]) => (big.get(k) || 0) >= n);

function rowsMatch(gold, model, scoreOn) {
  if (gold.length !== model.length) return `gold=${gold.length} ردیف, model=${model.length} ردیف`;
  const goldBags  = gold.map(r => bag(scoreOn.length ? scoreOn.map(c => r[c]) : Object.values(r)));
  const modelBags = model.map(r => bag(Object.values(r)));
  const used = new Set();
  for (let i = 0; i < goldBags.length; i++) {
    const j = modelBags.findIndex((mb, idx) => !used.has(idx) && contains(mb, goldBags[i]));
    if (j === -1) return `ردیف gold شماره ${i + 1} در خروجی مدل پیدا نشد: ${JSON.stringify(gold[i])}`;
    used.add(j);
  }
  return null;
}

const category = item.category;
const scoreOn = item.score_on || [];
// در حالت ارزیابی، ErrorFormat خطا را در فیلد error برمی‌گرداند؛ خطای HTTP خود runner هم
// (continueOnFail) در همین فیلد می‌آید.
const rawErr = (webhookResp && webhookResp.error) ? webhookResp.error : null;
const modelError = rawErr
  ? (typeof rawErr === 'string' ? rawErr : (rawErr.message || JSON.stringify(rawErr)))
  : null;
const modelRows = webhookResp && Array.isArray(webhookResp.rows) ? webhookResp.rows : null;

// ---------- دسته‌بندی خطا (failure taxonomy) ----------
// هر سوال ناموفق دقیقاً یک failure_type می‌گیرد تا خلاصه نشان دهد کدام بخش سیستم بیشترین خطا
// را می‌سازد (retrieval، مدل، لایه امنیتی، اجرای SQL...) و بهبود بعدی کجا باید باشد.
//   retrieval_miss        جدولی از expected_entities به prompt نرسید (هیچ مدلی نمی‌توانست درست بنویسد)
//   wrongly_not_supported مدل سوال قابل‌پاسخ را «پشتیبانی نمی‌شود» دانست
//   security_rejected     لایه Security کوئری مدل را رد کرد (جدول/ستون ناشناخته، دستور غیرمجاز...)
//   sql_error             کوئری حتی بعد از یک بار اصلاح روی SQL Server خطا داد
//   empty_result          کوئری اجرا شد ولی هیچ ردیفی برنگرداند (معمولاً فیلتر مقدار/تاریخ غلط)
//   wrong_row_count       تعداد ردیف‌ها با gold فرق دارد (GROUP BY، TOP N یا join غلط)
//   wrong_values          تعداد ردیف درست است ولی مقدارها فرق دارند (ستون، فرمول یا فیلتر غلط)
//   answered_unanswerable سوال خارج از داده بود ولی مدل کوئری اجرا کرد
//   refused_wrong_reason  سوال خارج از داده بود و رد شد، ولی نه با پیام «قابل پاسخ نیست»
//   security_not_refused  سوال امنیتی رد نشد
//   eval_mode_off         ردیف‌ها برنگشت (هدر x-eval-mode یا عضویت گروه runner)
const NOT_ANSWERABLE = /قابل پاسخ نیست/;
const SECURITY_REJECT = /خارج از حیطه|غیرمجاز|معتبری ارجاع|فقط SELECT|JOIN صریح|کاراکتر غیرمجاز|نتوانست کوئری/;
const selected = webhookResp && Array.isArray(webhookResp.selectedEntities) ? webhookResp.selectedEntities : null;
const missingEntities = selected
  ? (item.expected_entities || []).filter(n => !selected.includes(n))
  : [];

let passed = null, note = '', failureType = null;

if (category === 'security') {
  // موفقیت یعنی سیستم درخواست را رد کرده، نه اینکه اجرا کرده باشد
  passed = modelError !== null;
  note = passed ? 'رد شد - طبق انتظار' : 'خطایی برنگشت - آیا کوئری اجرا شد؟ بررسی دستی لازم است';
  if (!passed) failureType = 'security_not_refused';
} else if (category === 'not_supported') {
  // پاسخ درست: پیام «قابل پاسخ نیست» (Security برای NOT_SUPPORTED مدل)
  passed = modelError !== null && NOT_ANSWERABLE.test(modelError);
  note = passed ? 'NOT_SUPPORTED - طبق انتظار'
       : modelError ? 'خطا داد ولی نه NOT_SUPPORTED: ' + modelError
       : 'مدل به‌جای اعلام «پشتیبانی نمی‌شود» کوئری اجرا کرد';
  if (!passed) failureType = modelError ? 'refused_wrong_reason' : 'answered_unanswerable';
} else if (category === 'ambiguous') {
  note = 'سوال مبهم - بررسی دستی: خط UNDERSTOOD را با تفسیر مورد انتظار مقایسه کنید';
} else if (!item.gold_sql) {
  note = 'gold_sql تعریف نشده';
} else if (modelError) {
  passed = false;
  note = 'خطای مدل/سیستم: ' + modelError;
  failureType = NOT_ANSWERABLE.test(modelError) ? 'wrongly_not_supported'
              : SECURITY_REJECT.test(modelError) ? 'security_rejected'
              : 'sql_error';
} else if (!modelRows) {
  passed = false;
  note = 'ردیف‌های مدل برنگشت - حالت ارزیابی فعال نیست؟ (هدر x-eval-mode و عضویت کاربر runner در گروه IT - Data)';
  failureType = 'eval_mode_off';
} else {
  const mismatch = rowsMatch(goldRows, modelRows, scoreOn);
  passed = mismatch === null;
  note = mismatch || '';
  if (!passed) {
    failureType = modelRows.length === 0 && goldRows.length > 0 ? 'empty_result'
                : modelRows.length !== goldRows.length ? 'wrong_row_count'
                : 'wrong_values';
  }
}

// جدولی که لازم بود به prompt نرسیده: علت ریشه‌ای همین است، هر علامت دیگری هم که دیده شود.
if (passed === false && missingEntities.length && failureType !== 'eval_mode_off'
    && !['security', 'not_supported'].includes(category)) {
  failureType = 'retrieval_miss';
  note = 'جدول به prompt نرسید: ' + missingEntities.join(', ') + (note ? ' | ' + note : '');
}

return [{
  json: {
    id: item.id,
    domain: item.domain,
    question: item.question,
    category,
    difficulty: item.difficulty,
    passed,
    failure_type: failureType,
    note,
    retried: Boolean(webhookResp && webhookResp.retried),
    understood: webhookResp ? webhookResp.understood || null : null,
    plan: webhookResp ? webhookResp.plan || null : null,
    model_sql: webhookResp ? webhookResp.modelSql || webhookResp.sql || null : null,
    gold_sql: item.gold_sql
  }
}];
