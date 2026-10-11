---
type: how-to
updated: 2026-10-11
---
# How-to

Every repeatable task. Commands run in the repo folder (the one with `docker-compose.yml`).
No Node.js on the PC? Put `docker compose run --rm indexer` in front of any `node ...` command.

## Edit the catalog
The notes in `Catalog/` are what the model knows. Edit them in Obsidian and save; with Docker running,
`indexer-watch` turns them into `catalog/*.json` within a minute, rebuilds the embeddings and refreshes
[[#System check]]. No n8n change, no re-import.

| To... | Edit |
|---|---|
| make a word find a table | the table note, property `synonyms` (Properties panel: add an item) |
| hide a column from the model | the table note, *Columns*, Show = `hidden` (`review` = sent, expert should check) |
| link two tables | the table note, *Links to other tables*: `` - `Product_Key` → [[Dim_Product]] `Product_key` `` |
| give a business rule for one domain | the domain note, *Rules for the model* (start with `[[Table]]: ` to send it only with that table) |
| give a rule for every question | `Rules for every question` |
| define a number exactly («فروش خالص») | the domain note, *Metrics*: `### name`, `- Also called:`, `- Formula:`, `- Always filter:`, `- Note:` |
| add an example | the domain note, *Examples*: `### question` and a ```` ```sql ```` block |
| let an AD group see a domain | the domain note, *Who may see it*: `` - `NLSQL-sales`: * `` |
| add a table | copy a table note into the domain folder, rename it to the table name, add `- [[Name]]` under *Tables* |

A mistake (unknown Show value, a link to a table with no note, a metric naming a missing column) is listed at the
top of `Inbox/System check.md` with the note it is in; until it is fixed the model keeps the last good version.
Without Docker: `node scripts/obsidian-to-catalog.js` (prints the mistakes). Commit the notes **and** `catalog/*.json`.
Not in notes on purpose: the answer format and the security rules (n8n code - the Security node depends on them).

## After a change
| I changed... | Run | Done when |
|---|---|---|
| a note in `Catalog/` | `node scripts/obsidian-to-catalog.js` (or wait a minute for `indexer-watch`) | "updated ..." or "nothing changed" |
| | `node scripts/validate-catalogs.js --schema sql/SA_DataWarehouse_schema.sql` (checks against the real DB) | `0 errors` |
| | `node scripts/generate-verify-sql.js` and `node scripts/generate-value-sql.js` | files rewritten |
| `catalog/query_bank.json` | `node scripts/generate-bank-check-sql.js` | file rewritten |
| `n8n_workflows/code/*.js` (one file per Code node: Find Tables, BuildPrompt, Security, ...) | `node scripts/sync-workflow-code.js` | "in sync" |
| `benchmark/02/questions.json` | `node scripts/build-benchmark-questions.js`, then `sync-workflow-code.js` | |
| anything | `npm test` | all pass |

Common catalog edits ([[#Edit the catalog]]):
- **A question picked the wrong table:** add the user's word to `synonyms` of the right table note.
- **A business term is computed wrongly** («فروش خالص»): add a metric to that domain note.
- **A question was answered well:** tick ✅ on its note - [[#Review answers]]. (By hand: add it to
  `catalog/query_bank.json` as `{ id, q, sql, status }`; never copy a benchmark question there, `npm test` checks it.)
- **Give an AD group a right** (error details, review notes, benchmark data): edit `RIGHTS` at the top of
  `n8n_workflows/code/AuthCheck.js`, run `sync-workflow-code.js`, re-import. Which *tables* a group sees is
  `permissions` in the catalog, not this.
- **New subject area:** a new folder in `Catalog/` with a domain note (copy one; `domain:` = folder name), one table
  with `core: true`, and *Who may see it* for `NLSQL-<domain>`; dimensions other domains use go to [[common]].

Embeddings rebuild by themselves (`indexer-watch`, every 60 s, only after a change), and then the
[[#System check]] note is refreshed.

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
Rollback: re-activate the previous workflow; `git checkout <commit> -- obsidian/Catalog catalog/`.

## Benchmark
You rarely need to run these by hand: the [[#System check]] runs the offline part by itself, and
[[#Review answers]] turns approved answers into benchmark questions without writing SQL.

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
*Summarize Results* starts with `inPlainWords` (the result in Persian sentences), then accuracy and
`byFailureType` - fix the biggest group first:
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

## Review answers
The way to measure and improve accuracy without writing SQL. n8n writes a note into `Inbox/n8n/` (no user names):
- **answered question** - for every answer a member of `IT - Data` / `IT - Security` got. It shows how the
  question was understood, the answer, and the tables the model was given with the reason for each.
- **failed question** - for every question that got no answer (any user), with what to check.

Set up once: `docker-compose.yml` mounts the folder (`./obsidian/Inbox/n8n:/home/node/.n8n-files/obsidian-inbox`);
`docker compose up -d n8n`, import the workflow ([[#Deploy]] step 6). Test: ask a sales question as an
`IT - Data` member - a note appears within seconds.

Every week (10 minutes):
1. Open each **answered question** note and tick **one** box: `✅ correct` or `❌ wrong`.
   Not sure? Leave it unticked.
2. Run `node scripts/learn-from-inbox.js` (or with `docker compose run --rm indexer` in front).
   Every ✅ becomes a verified example (similar questions are answered the same way from now on) and a
   *confirmed* benchmark question (the end-to-end benchmark warns if a later change breaks it); the note is deleted.
3. Each ❌ note stays and says what to fix: a missing table -> add the user's word to `synonyms_fa`;
   a wrong number -> add or fix a metric. Fix it, then delete the note.
4. **failed question** notes: same fixes, then delete.
5. Commit and push what the script lists (`catalog/query_bank.json`, `benchmark/02/confirmed.json`,
   `sql/check_query_bank.sql`, `n8n_workflows/`). Never commit the notes themselves (real questions; git-ignored).

## System check
`Inbox/System check.md` is written by itself (`scripts/system-check.js` in the `indexer-watch` container) whenever
a catalog, the embeddings, the benchmark questions or the Find Tables code change, and at least once a day.
No Qwen, no database. It says:
- whether the catalogs are valid (⛔ at the top means n8n may fail on every question - fix that first);
- how many benchmark questions get the right tables, with or without meaning search (embeddings);
- for each miss: the question and the table it needed -> add the question's word to that table's `synonyms_fa`.

Refresh it now: `docker compose run --rm indexer node scripts/system-check.js --embed-url http://embeddings:80/embed --force`.
It does not prove the SQL is right - that is what [[#Review answers]] is for.

**The scores in the logs** (`SCORES`, `retrieval.scores`) only put tables in order; nobody needs to tune them.
To see *why* a table was chosen, read the reasons (`WHY` in the log, "Tables the model was given" in the note):
a synonym or column word in the question, «معنای نزدیک به سوال» (meaning search), a metric, a value, a date,
the core table of the domain, a link table, a similar example.
