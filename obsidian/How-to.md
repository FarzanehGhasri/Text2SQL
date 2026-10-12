---
type: how-to
updated: 2026-10-13
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
| `catalog-service/*.js` (the search: Find Tables, notes) | `npm test`, then `docker compose restart catalog-service` | "listening on :8090" in its log |
| a benchmark question, or anything the table choice depends on | nothing - `indexer-watch` retrains the [[#Table-choice model]] | "wrote ... model(s)" in its log |
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
[[#System check]] note is refreshed. So do [[Schema]] (never edit it by hand) and the index of the [[#Obsidian notes model]].
catalog-service picks the new files up by itself - nothing to restart.

## Deploy
1. Get the branch into the deploy folder (`git pull`).
2. Validate: `docker compose run --rm indexer node scripts/validate-catalogs.js --schema sql/SA_DataWarehouse_schema.sql` -> `0 errors`.
3. n8n -> *Credentials* -> "Microsoft SQL account": database `SA_DataWarehouse`, the **read-only** user.
4. SSMS, logged in as that read-only user: run `sql/verify_catalog_access.sql` -> **no rows**.
5. `docker compose up -d` (recreates n8n when `docker-compose.yml` changed). The embeddings (bge-m3) come from Ollama on
   the host: `ollama list` must show `bge-m3` (else `ollama pull bge-m3`). Ollama on another machine: a `.env` next to
   `docker-compose.yml` with `EMBED_URL=http://<host>:11434/api/embed?model=bge-m3`. With Hugging Face access the TEI
   container works too: `docker compose --profile tei up -d` and `EMBED_URL=http://embeddings:80/embed`.
   After switching between them, rebuild the vectors once (all must come from the same service):
   `docker compose run --rm indexer node scripts/index-catalog-embeddings.js --force` and the same with
   `index-vault-embeddings.js`; the model retrains by itself.
6. n8n: deactivate the old workflow, import `n8n_workflows/final_improving security.json`, check the credentials on
   the SQL and LDAP nodes, activate. (If an older `Obsidian assistant` workflow was imported: deactivate and delete it.)
7. Open WebUI -> *Admin Panel* -> *Functions*: add `openwebui/text2sql.py` ([[#Obsidian notes model]] step 3).
8. `docker compose logs indexer-watch`: `wrote ... embeddings.json` (catalog and `vault.embeddings.json`), no `INVALID` / `FAILED`.
   `docker compose logs catalog-service`: `catalog-service listening on :8090`.
9. [[#Accuracy data]] and [[#LLM settings]].
10. Ask 3 questions in Open WebUI (sales, procurement, one that should be "not answerable"), then [[#Benchmark]].

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
docker compose run --rm indexer node scripts/benchmark-retrieval.js
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

## Table-choice model
Which tables reach the prompt is decided by a model learned from the benchmark questions, not by points somebody chose
([[Architecture#Table-choice model]]). `indexer-watch` retrains it by itself - with the real embeddings - whenever a
catalog, a benchmark question or a service changes (`catalog/retrieval-model.json`, not in git; `Inbox/System check.md`
shows which model is used).

- **Make it better:** tick ✅ on correct answers ([[#Review answers]]) - each one becomes a training question. A wrong
  table is still fixed first in the catalog (a synonym, a metric).
- **Measure it honestly** (a few minutes; each question answered by a model that never saw it):
  `docker compose run --rm indexer node scripts/train-retrieval.js --report`.
  Write the "cross-validated" lines into *Results* on [[Home]].
- **Reranker (optional, more accurate, slower):** add `RERANK_URL=http://reranker:80/rerank` to a `.env` file next to
  `docker-compose.yml`, then `docker compose --profile reranker up -d`. The first start downloads `BAAI/bge-reranker-v2-m3`
  (~2 GB). The model then learns how much to trust it; if it is down, the model without it is used. Compare the
  `--report` numbers with and without it before keeping it.
- **Recall vs prompt size:** thresholds are chosen so a missing table counts 16x an extra one (`--beta 4`). If the
  end-to-end [[#Benchmark]] shows Qwen does better with fewer tables, train with `--beta 2` (or more tables: `--beta 6`).
- Until the server has trained its own, the keyword-only baseline that comes with the code is used
  (`catalog-service/text2sql/baseline-model.json`; retrain it with `--out` that file and `--report`). Check: `docker compose exec catalog-service wget -qO- localhost:8090/health` lists
  `"models":["lexical","lexical+semantic"]`.

## LLM settings
n8n (SQL) and catalog-service (notes answers) only send the prompt to `/combine`; these are set **on the LLM server**.
If the address changes, change it in both: n8n node `request to LLM` and `LLM_URL` in `docker-compose.yml` (a test checks they match).

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

Refresh it now: `docker compose run --rm indexer node scripts/system-check.js --force`.
It does not prove the SQL is right - that is what [[#Review answers]] is for.

**The scores in the logs** (`SCORES`, `retrieval.scores`) only put tables in order; nobody needs to tune them.
To see *why* a table was chosen, read the reasons (`WHY` in the log, "Tables the model was given" in the note):
a synonym or column word in the question, «معنای نزدیک به سوال» (meaning search), a metric, a value, a date,
the core table of the domain, a link table, a similar example.

## Obsidian notes model
In Open WebUI pick the model **Obsidian notes** and ask about the notes: «فروش خالص چطور حساب می‌شود؟»,
«جدول مشتری با کدام جدول‌ها join می‌شود؟», «benchmark را چطور اجرا کنم؟». Qwen answers **only from the notes**, in
Persian, and lists the notes it used. For numbers pick **Text2SQL** - its answers also end with the notes they came from.

It is the same n8n workflow: the model choice sends `mode: "notes"`, and catalog-service searches the notes
(each table as one whole piece with its columns and joins; the other notes by `##` section) - [[Architecture#catalog-service]].

Who sees what - the same rules as Text2SQL:
- a table: whoever may query it (*Who may see it* in the domain note); a domain note: `*` on that domain;
- project notes ([[Home]], [[How-to]], [[Architecture]], [[Me]], [[Schema]]): `IT - Data`, `IT - Security`
  (`projectNotes` in `RIGHTS` at the top of `n8n_workflows/code/AuthCheck.js`);
- never: `Inbox/` (real users' questions), `CLAUDE.md`, and columns with Show = `hidden`.

Set up once:
1. `docker compose up -d` - starts `catalog-service`; `indexer-watch` builds `vault-index/`
   (`docker compose logs indexer-watch` shows `vault.embeddings.json: wrote ... pieces`).
2. n8n: import `n8n_workflows/final_improving security.json` ([[#Deploy]] step 6).
3. Open WebUI -> *Admin Panel* -> *Functions* -> **+**: paste `openwebui/text2sql.py`, save, enable. Two models appear:
   **Text2SQL** and **Obsidian notes**. Disable the old Text2SQL function if you had one (otherwise there are two "Text2SQL").
4. Test as an `IT - Data` member: model *Obsidian notes*, «benchmark را چطور اجرا کنم؟» -> an answer with `[n]` and the notes under it.

When an answer is wrong:
- *"چیزی پیدا نکردم"* although a note has it: the note uses other words -> add them to the note (or to
  `synonyms` of a table note); the index follows within a minute.
- *Wrong note chosen:* n8n -> *Executions* -> **Ask Notes** output, `logs`: the `NOTES` line lists each piece with its
  reason («معنای نزدیک», «کلمه‌های مشترک»). Without the embeddings service only shared words count.
- *"ایندکس ... هنوز ساخته نشده"*: `indexer-watch` is not running or failed - check its log.
- *`cannot reach .../api/embed: ECONNREFUSED`* in a log: Ollama is not running or not reachable from Docker
  ([[#Deploy]] step 5); `ENOTFOUND`: wrong host in `EMBED_URL`; `(404)` with "model": `ollama pull bge-m3`.
- *A new note is never found:* Obsidian creates new notes in `Inbox/` (vault setting), which is never indexed -
  move the note to the vault root or into `Catalog/`.
- Rebuild the index now: `docker compose run --rm indexer node scripts/index-vault-embeddings.js --force`.
