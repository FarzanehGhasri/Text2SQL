// ===== Audit Row: یک ردیف برای جدول NLSQL_AuditLog پس از هر پاسخ موفق =====
// نود بعدی (Write Audit Log) این ردیف را در SQL Server می‌نویسد؛ تا وقتی جدول و login مخصوصش ساخته
// نشده (sql/NLSQL_AuditLog.sql) آن نود بی‌خطر شکست می‌خورد و پاسخ کاربر تغییری نمی‌کند.
const rows = $input.all();
const rowCount = rows.length;

const username = $('AuthCheck').first().json.username || 'unknown';
const question = $('Webhook').first().json.body.question || '';

const secData = $('Security').first().json;
const attempt = secData.attempt || 1;

return [{
  json: {
    username: username,
    question: question,
    generated_sql: secData.sql || '',
    understood_query: secData.understood || '',
    thinking: secData.thinking || '',
    attempt: attempt,
    status: 'SUCCESS',
    row_count: rowCount
  }
}];
