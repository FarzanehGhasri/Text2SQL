---
type: how-to
updated: 2026-10-10
---
# How-to

Every repeatable task. Commands run in the repo folder (the one with `docker-compose.yml`).
No Node.js on the PC? Put `docker compose run --rm indexer` in front of any `node ...` command.

## After a change
| I changed... | Run | Done when |
|---|---|---|
| `catalog/*.json` | `node scripts/validate-catalogs.js --schema sql/SA_DataWarehouse_schema.sql` | `0 errors` |
| | `node scripts/export-catalog-to-obsidian.js` | `Catalog/` refreshed |
| | `node scripts/generate-verify-sql.js` and `node scripts/generate-value-sql.js` | files rewritten |
| `catalog/query_bank.json` | `node scripts/generate-bank-check-sql.js` | file rewritten |
| `n8n_workflows/code/*.js` | `node scripts/sync-workflow-code.js` | "in sync" |
| `benchmark/02/questions.json` | `node scripts/build-benchmark-questions.js`, then `sync-workflow-code.js` | |
| anything | `npm test` | all pass |

Common catalog edits:
- **A question picked the wrong table:** add the user's word to `synonyms_fa` of the right table.
- **A business term is computed wrongly** («فروش خالص»): add `{ name_fa, synonyms_fa, sql, filter, note_fa }`
  to `metrics` in that domain's catalog, columns written as `[Entity].[Column]`.
- **A question was answered well:** add it to `catalog/query_bank.json` as `{ id, q, sql, status }`.
  Never copy a benchmark question there (`npm test` checks it).
- **New subject area:** new `catalog/<domain>.json` with one `core` table and `permissions` for `NLSQL-<domain>`;
  dimensions other domains use go to `common.json`.

Embeddings rebuild by themselves (`indexer-watch`, every 60 s, only after a change).

## Deploy
1. Get the branch into the deploy folder (`git pull`).
2. Validate: `docker compose run --rm indexer node scripts/validate-catalogs.js --schema sql/SA_DataWarehouse_schema.sql` -> `0 errors`.
3. n8n -> *Credentials* -> "Microsoft SQL account": database `SA_DataWarehouse`, the **read-only** user.
4. SSMS, logged in as that read-only user: run `sql/verify_catalog_access.sql` -> **no rows**.
5. `docker compose up -d` (recreates n8n when `docker-compose.yml` changed).
6. n8n: deactivate the old workflow, import `n8n_workflows/final_improving security.json`, check the credentials on
   the SQL and LDAP nodes, activate.
7. `docker compose logs indexer-watch`: `wrote ... embeddings.json`, no `INVALID` / `FAILED`.
8. [[#Accuracy data]] and [[#LLM settings]].
9. Ask 3 questions in Open WebUI (sales, procurement, one that should be "not answerable"), then [[#Benchmark]].

Audit log: until a DBA runs `sql/NLSQL_AuditLog.sql` and an INSERT-only credential is set on the "Microsoft SQL"
node, auditing fails harmlessly. **Never** give the query login write access.
Rollback: re-activate the previous workflow; `git checkout rhk_branch_04 -- catalog/`.

## Benchmark
**Offline (no LLM, no database), minutes:**
```bash
node scripts/benchmark-retrieval.js
node scripts/benchmark-retrieval.js --questions benchmark/02/paraphrase_questions.json
node scripts/benchmark-retrieval.js --questions benchmark/02/join_path_questions.json
# with the real embeddings:
docker compose run --rm indexer node scripts/benchmark-retrieval.js --embed-url http://embeddings:80/embed
```
A `FAIL` line names the table that did not reach the prompt -> usually a missing synonym.

**End to end, in n8n:** import `n8n_workflows/Text-to-SQL Benchmark-02.json`, set the SQL credential on
"Run Gold SQL", use an `IT - Data` member's email in "Call Webhook", *Execute workflow*.
*Summarize Results* shows accuracy and `byFailureType` - fix the biggest group first:
`retrieval_miss` = table never reached the prompt; `wrong_values` / `wrong_row_count` / `empty_result` = the SQL;
`security_rejected`, `sql_error`, `wrongly_not_supported`. Add a row to *Results* in [[Home]].

## Accuracy data
All three need SSMS. None of them changes the workflow: n8n reads every `catalog/*.json` on each question.

**Value index** (`catalog/values.json`, monthly) - so values like «دفتر فروش تهران» are spelled as stored:
1. SSMS, as the read-only login: run `sql/extract_values.sql`.
2. Result grid -> *Save Results As...* -> `values.csv` (first turn on *Tools > Options > Query Results > SQL Server >
   Results to Grid > Quote strings containing list separators*).
3. `node scripts/build-value-index.js --input values.csv`
4. Never commit `values.json` or the CSV (real names; both are git-ignored).

**Query bank check** (after adding examples): run `sql/check_query_bank.sql` in SSMS. An error right after
`<id> | <question>` in *Messages* means that example is wrong; set `"status": "verified"` on the good ones.

**Real questions -> benchmark** (monthly, once the audit log exists):
1. SSMS: `SELECT id, created_at, question, generated_sql, understood_query, attempt, status, row_count FROM [dbo].[NLSQL_AuditLog] ORDER BY id;` -> save as `audit.csv`.
2. `node scripts/audit-to-benchmark.js --input audit.csv` -> `benchmark/02/candidates.local.json` (not in git).
3. Pick questions, write gold SQL, add them to `benchmark/02/questions.json`.

## LLM settings
n8n only sends the prompt to `/combine`; these are set **on the LLM server**.

| Model | temperature | top_p | max output tokens |
|---|---|---|---|
| Qwen2.5-32B(-Coder)-Instruct | **0** | 1.0 | 1024 |
| Qwen3-32B, thinking mode | 0.6 (never 0) | 0.95 | 4096+ |
| QwQ-32B | 0.6 (never 0) | 0.95 | 4096+ |

- Context: at least **16 384** tokens (vLLM `--max-model-len 16384`, Ollama `num_ctx 16384`). The prompt is up to
  24 000 characters ≈ 8 000 tokens; a smaller context silently cuts off the rules and tables.
- vLLM `--enable-prefix-caching` makes answers start faster.
- After changing anything here: run the [[#Benchmark]].

## Failed-question notes
n8n writes one note per failed or refused question into `Inbox/n8n/` (no user names). Set up once:
1. `docker-compose.yml` already mounts the folder: `./obsidian/Inbox/n8n:/home/node/.n8n-files/obsidian-inbox`.
2. `docker compose up -d n8n`, then import the workflow ([[#Deploy]] step 6). The nodes "Obsidian note" and
   "Write note" hang off `ErrorFormat`; the user gets the answer first.
3. Test: ask «پیش‌بینی هوای فردا». A note appears in `Inbox/n8n/` within seconds.

Every week: open each note, tick what applies (synonym / metric / example), fix the catalog, delete the note.
Notes hold real questions: they are git-ignored, keep them out of commits.
