// ===== Build Fix Prompt: SQL خطادار + پیام خطای SQL Server را برای اصلاح به مدل برمی‌گرداند =====
// ورودی:  خطای نود «execute query» (از راه «Retry once?»)؛ SQL مدل (Security) و prompt اصلی (BuildPrompt)
// خروجی:  { body: { string1, string2 } } برای همان «request to LLM» - همان شکل BuildPrompt، پس بقیه مسیر
//          (Security، execute query) فرقی بین تلاش اول و دوم نمی‌گذارد. Security از اجرا شدن همین نود
//          می‌فهمد که تلاش دوم است (attempt = 2) و «Retry once?» خطای دوم را به ErrorFormat می‌فرستد.

const MAX_ERROR_CHARS = 1000;

// ---------- ۱. آداپتر n8n: تنها جایی که $input و $('...') خوانده می‌شود ----------
function readN8nInputs() {
  const sec = $('Security').first().json;
  return {
    error: $input.first().json,
    // SQL خام مدل (modelSql) نه نسخه پیچیده‌شده در CTE (sql)، تا prompt اصلاح همان شکلی باشد که مدل نوشت
    failedSql: sec.modelSql || sec.sql || '',
    // همان prompt اصلی (جدول‌ها، قواعد، سوال) تا مدل دوباره همه زمینه را داشته باشد
    originalPrompt: $('BuildPrompt').first().json.body.string2,
  };
}

// ---------- ۲. منطق ----------
function errorText(e) {
  return String((e.error && (e.error.message || e.error)) || e.message || JSON.stringify(e)).slice(0, MAX_ERROR_CHARS);
}

function fixPrompt({ error, failedSql, originalPrompt }) {
  return `${originalPrompt}

Your previous answer was:
${failedSql}

Running it against Microsoft SQL Server failed with this error:
${errorText(error)}

Fix the query so it runs successfully. Reply in the exact same shape as before:
UNDERSTOOD: <English sentence>
PLAN:
- error: <what in the previous query caused this error>
- tables / filters / result: <the corrected plan, in one or two short lines>
SQL:
<the corrected T-SQL SELECT query>
Use ONLY the listed entities and columns with their exact names. No markdown fences, no other text.`;
}

// ---------- ۳. اجرا ----------
return [{ json: { body: { string1: '-', string2: fixPrompt(readN8nInputs()) } } }];
