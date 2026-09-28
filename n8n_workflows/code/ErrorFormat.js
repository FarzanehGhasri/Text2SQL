const DEBUG = true;   // در زمان توسعه true کن تا متن فنی هم دیده شود

const e = $input.first().json;
let raw = (e.error && (e.error.message || e.error)) || e.message || '';
raw = String(raw).replace(/\s*\[line \d+\]\s*$/i, '').trim();

const answer = (raw.startsWith('⛔') || DEBUG)
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

// در حالت ارزیابی، runner خطا را از فیلد error تشخیص می‌دهد (رد شدن سوال امنیتی = موفقیت)
return [{ json: evalMode ? { answer, error: raw || answer } : { answer } }];