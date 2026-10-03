// ===== Build a repair prompt: send the failed SQL + the DB error back to the model =====
const errItem = $input.first().json;
const errMsg = String(
  (errItem.error && (errItem.error.message || errItem.error)) ||
  errItem.message ||
  JSON.stringify(errItem)
).slice(0, 1000);

// The SQL that actually failed. Prefer the model's raw SELECT (modelSql) over the
// CTE-wrapped version (sql) so the fix-up prompt matches the shape the model produced.
const failedSql = $('Security').first().json.modelSql || $('Security').first().json.sql || '';

// Reuse the original prompt (schema, rules, question) so the model has full context again.
const originalPrompt = $('BuildPrompt').first().json.body.string2;

const fixPrompt = `${originalPrompt}

Your previous answer was:
${failedSql}

Running it against Microsoft SQL Server failed with this error:
${errMsg}

Fix the query so it runs successfully. Reply in the exact same shape as before:
UNDERSTOOD: <English sentence>
PLAN:
- error: <what in the previous query caused this error>
- tables / filters / result: <the corrected plan, in one or two short lines>
SQL:
<the corrected T-SQL SELECT query>
Use ONLY the listed entities and columns with their exact names. No markdown fences, no other text.`;

return [{
  json: {
    body: { string1: '-', string2: fixPrompt }
  }
}];
