// ===== ErrorFormat: پیام خطا برای کاربر =====
// ورودی:  خطای هر نودی که شکست خورد (LDAP، AuthCheck، Find Tables، Security، اجرای SQL، ...)
// خروجی:  { answer }؛ در حالت ارزیابی (بنچمارک) { answer, error, selectedEntities }
// پیام‌هایی که با ⛔ شروع می‌شوند برای کاربر نوشته شده‌اند و همیشه نشان داده می‌شوند. خطای فنی (پیام SQL Server،
// نام جدول و ستون) فقط به کسی که اجازه seeDetails دارد نشان داده می‌شود (AuthCheck)؛ بقیه پیام عمومی می‌بینند.
// بعد از این نود: Respond to Webhook1 (جواب کاربر) و Obsidian note (یادداشت «سوال بی‌جواب»).

const GENERIC = '⛔ در پردازش درخواست شما خطایی رخ داد.\n\nلطفاً سوال را به شکل دیگری بپرسید. اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید.';

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
// نودی که اجرا نشده (مثلاً خطای LDAP پیش از AuthCheck) یعنی «هیچ اجازه‌ای نیست»
function readN8nInputs() {
  const json = name => { try { return $(name).first().json || {}; } catch (e) { return {}; } };
  return {
    error: $input.first().json,
    can: json('AuthCheck').can || {},
    selectedEntities: json('BuildPrompt').selectedEntities || [],
  };
}

// ---------- ۲. منطق ----------
function errorText(e) {
  const raw = (e.error && (e.error.message || e.error)) || e.message || '';
  return String(raw).replace(/\s*\[line \d+\]\s*$/i, '').trim();
}

function formatError({ error, can, selectedEntities }) {
  const raw = errorText(error);
  const answer = (raw.startsWith('⛔') || (can.seeDetails && raw)) ? raw : GENERIC;
  // در حالت ارزیابی، runner بنچمارک خطا را از فیلد error می‌شناسد (رد شدن سوال امنیتی = موفقیت) و
  // selectedEntities خطای retrieval را از خطای SQL جدا می‌کند
  return can.evalMode ? { answer, error: raw || answer, selectedEntities } : { answer };
}

// ---------- ۳. اجرا ----------
return [{ json: formatError(readN8nInputs()) }];
