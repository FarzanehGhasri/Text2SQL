// ===== Audit Row: یک ردیف برای جدول NLSQL_AuditLog پس از هر پاسخ موفق =====
// ورودی:  ردیف‌های نتیجه کوئری؛ کاربر (AuthCheck)، سوال (Webhook) و SQL (Security)
// خروجی:  یک ردیف با ستون‌های NLSQL_AuditLog
// نود بعدی (Write Audit Log) این ردیف را در SQL Server می‌نویسد؛ تا وقتی جدول و login مخصوصش ساخته
// نشده (sql/NLSQL_AuditLog.sql) آن نود بی‌خطر شکست می‌خورد و پاسخ کاربر تغییری نمی‌کند.

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  return {
    rowCount: $input.all().length,
    username: $('AuthCheck').first().json.username,
    question: $('Webhook').first().json.body.question,
    sec: $('Security').first().json,
  };
}

// ---------- ۲. منطق ----------
function auditRow({ rowCount, username, question, sec }) {
  return {
    username: username || 'unknown',
    question: question || '',
    generated_sql: sec.sql || '',
    understood_query: sec.understood || '',
    thinking: sec.thinking || '',
    attempt: sec.attempt || 1,
    status: 'SUCCESS',
    row_count: rowCount,
  };
}

// ---------- ۳. اجرا ----------
return [{ json: auditRow(readN8nInputs()) }];
