---
type: runbook
updated: 2026-10-03
tags: [runbook, accuracy]
---
# Accuracy data: value index, query bank, real questions

Three data sets make answers more accurate. All three need SSMS (they read the warehouse) and none of
them changes the n8n workflow: n8n reads every `catalog/*.json` on each question.

## 1. Value index - `catalog/values.json` (Step 2)
So that «دفتر فروش تهران», «باطل شده», «بانک ملت» are written exactly as stored (and as keys where possible).
1. `node scripts/generate-value-sql.js` (only after a catalog change; the file is committed).
2. SSMS, **as the read-only login**: run `sql/extract_values.sql`. Messages lists columns skipped (more than
   5000 distinct values) or failed.
3. Result grid → right click → *Save Results As…* → `values.csv` (turn on *Tools > Options > Query Results >
   SQL Server > Results to Grid > Quote strings containing list separators*).
4. `node scripts/build-value-index.js --input values.csv` → prints columns, values and file size.
5. Copy `catalog/values.json` to the deploy folder. **Never commit it or the CSV** (real names - both are git-ignored).
6. Refresh monthly, or after new customers/suppliers/offices.

Check: a question naming a value shows `VALUES | ...` in the BuildPrompt log and a *VALUES FROM THE QUESTION*
section in the prompt. Size/time: ~20k values ≈ 0.6 MB, +45 ms per question; 100k ≈ 3 MB, +200 ms.

## 2. Query bank - `catalog/query_bank.json` (Step 3)
Examples the model sees when a question is similar. 50 seed examples are `"status": "draft"`.
1. `node scripts/generate-bank-check-sql.js`, then run `sql/check_query_bank.sql` in SSMS as the read-only login.
2. Messages tab: an error right after `<id> | <question>` means that example is wrong - fix it.
3. For each result that looks right for its question, set `"status": "verified"` (verified ones win ties).
4. Add examples: real questions users confirmed as answered correctly. Entity names, `[Entity].[Column]`,
   `N'...'` for Persian. **Never copy a benchmark question** - `npm test` checks it.
5. `node scripts/validate-catalogs.js` → 0 errors; `indexer-watch` embeds the new questions within a minute.

## 3. Real questions → benchmark (Step 0)
Once the audit log exists (`sql/NLSQL_AuditLog.sql`):
1. SSMS: `SELECT id, created_at, question, generated_sql, understood_query, attempt, status, row_count FROM [dbo].[NLSQL_AuditLog] ORDER BY id;`
   → save as `audit.csv`.
2. `node scripts/audit-to-benchmark.js --input audit.csv` → `benchmark/02/candidates.local.json`
   (repeats merged and counted, existing benchmark questions skipped, no usernames; git-ignored).
3. Pick 100-200 representative questions, write gold SQL on the physical tables, add them to
   `benchmark/02/questions.json`, then `node scripts/build-benchmark-questions.js` and `node scripts/sync-workflow-code.js`.
4. [[Run the benchmark]]: `byFailureType` in *Summarize Results* says which part fails most.

Back: [[Skill Map]] · [[Text2SQL]]
