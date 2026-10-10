// ===== ErrorFormat: پیام خطا برای کاربر =====
// پیام‌هایی که با ⛔ شروع می‌شوند برای کاربر نوشته شده‌اند و همیشه نشان داده می‌شوند. خطای فنی (پیام SQL Server،
// نام جدول و ستون) فقط به اعضای DETAIL_GROUPS نشان داده می‌شود؛ بقیه یک پیام عمومی می‌بینند.
// (قبلاً یک کلید DEBUG برای همه بود که روشن ماندنش جزئیات فنی را به همه کاربران نشان می‌داد.)
const DETAIL_GROUPS = ['IT - Data', 'IT - Security'];

const e = $input.first().json;
let raw = (e.error && (e.error.message || e.error)) || e.message || '';
raw = String(raw).replace(/\s*\[line \d+\]\s*$/i, '').trim();

const showDetail = (() => {
  try { return ($('AuthCheck').first().json.groups || []).some(g => DETAIL_GROUPS.includes(g)); }
  catch (err) { return false; } // خطا پیش از AuthCheck: کاربر هنوز شناخته نشده
})();
const answer = (raw.startsWith('⛔') || (showDetail && raw))
  ? raw
  : '⛔ در پردازش درخواست شما خطایی رخ داد.\n\nلطفاً سوال را به شکل دیگری بپرسید. اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید.';

// ===== حالت ارزیابی (benchmark) =====
// runner بنچمارک (n8n_workflows/Text-to-SQL Benchmark-02.json) با هدر x-eval-mode: true
// ردیف‌های خام و SQL را هم می‌خواهد تا نتیجه را با gold مقایسه کند. فقط برای اعضای
// EVAL_GROUPS فعال است؛ برای بقیه (از جمله OpenWebUI که این هدر را نمی‌فرستد) پاسخ دقیقاً
// مثل قبل فقط { answer } است.
const EVAL_GROUPS = ['IT - Data'];
const evalMode = (() => {
  try {
    const headers = $('Webhook').first().json.headers || {};
    const groups  = $('AuthCheck').first().json.groups || [];
    return String(headers['x-eval-mode'] || '').toLowerCase() === 'true'
      && groups.some(g => EVAL_GROUPS.includes(g));
  } catch (e) {
    return false; // خطا پیش از AuthCheck: کاربر هنوز شناخته نشده
  }
})();

// در حالت ارزیابی، runner خطا را از فیلد error تشخیص می‌دهد (رد شدن سوال امنیتی = موفقیت).
// selectedEntities (اگر BuildPrompt اجرا شده باشد) برای جدا کردن خطای retrieval از خطای SQL است.
const selectedEntities = (() => {
  try { return $('BuildPrompt').first().json.selectedEntities || []; } catch (e) { return []; }
})();
return [{ json: evalMode ? { answer, error: raw || answer, selectedEntities } : { answer } }];