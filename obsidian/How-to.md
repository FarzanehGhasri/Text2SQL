---
type: how-to
updated: 2026-10-11
---
# How-to

Every repeatable task. Commands run in the repo folder (the one with `docker-compose.yml`).
`tx` below means `docker compose exec text2sql python -m text2sql` (inside the running service). Without Docker,
on a PC with Python 3.11: `python -m venv .venv`, `.venv\Scripts\pip install -r requirements-dev.txt`, then
`.venv\Scripts\python -m text2sql ...`.

## Edit the catalog
The notes in `Catalog/` and [[Settings]] are what the service knows. Edit them in Obsidian and save: the next
question uses the change. No import, no restart, no n8n.

| To... | Edit |
|---|---|
| make a word find a table | the table note, property `synonyms` (Properties panel: add an item) |
| hide a column from the model | the table note, *Columns*, Show = `hidden` (`review` = sent, an expert should check it) |
| link two tables | the table note, *Links to other tables*: `` - `Product_Key` → [[Dim_Product]] `Product_key` `` |
| give a business rule for one domain | the domain note, *Rules for the model* (start with `[[Table]]: ` to send it only with that table) |
| give a rule for every question | [[Rules for every question]] |
| define a number exactly («فروش خالص») | the domain note, *Metrics*: `### name`, `- Also called:`, `- Formula:`, `- Always filter:`, `- Note:` |
| add an example question + SQL | [[Query bank]] (or let the review loop add it: [[#Review answers]]) |
| let an AD group see a domain | the domain note, *Who may see it*: `` - `NLSQL-sales`: * `` |
| give a group a right (error details, review notes, benchmark data) | [[Settings]], *Who may do what* |
| add a table | copy a table note into the domain folder, rename it to the table name, add `- [[Name]]` under *Tables* |
| change the model, temperature, prompt size, chart address | [[Settings]] |

A mistake in a note (unknown Show value, a link to a table with no note, a metric naming a missing column) is listed
at the top of `Inbox/System check.md`; until it is fixed the model keeps the last good version. Check from the
command line: `tx validate`. Commit and push the notes you changed.
Not in notes on purpose: the answer format and the security rules (code: the SQL guard depends on them) and
passwords (`.env`).

## Deploy
First time (on the server, as an admin):
1. `git pull` the branch into the deploy folder.
2. `copy .env.example .env` and fill it in: the **read-only** SQL login, the AD service account, a new API key
   (`python -c "import secrets; print(secrets.token_urlsafe(32))"`). Never commit `.env`.
3. `docker compose build text2sql` then `docker compose up -d` (starts text2sql, embeddings, quickchart, Open WebUI;
   the old n8n is no longer started, a running one keeps running).
4. Check: `curl http://localhost:8000/health` -> `"ok": true`; `docker compose logs text2sql` has no errors.
5. DBA checks: `tx db verify` -> "catalog and database agree; the login is read-only";
   `tx db examples` -> lists broken examples (fix them in [[Query bank]]).
6. Value index: `tx values refresh` (then by itself every `refresh_hours`, [[Settings]]).
7. Open WebUI -> Admin -> Settings -> Connections -> OpenAI API -> add `http://text2sql:8000/v1`, key = the API key
   from `.env`. The model **text2sql** appears; the user's e-mail is sent along
   (`ENABLE_FORWARD_USER_INFO_HEADERS=true` is set in `docker-compose.yml`).
   (Or keep the old Open WebUI function and change its URL to `http://text2sql:8000/webhook/text2sql` and add the
   header `Authorization: Bearer <key>`.)
8. Ask 3 questions (sales, procurement, one that should be "not answerable"), then [[#Benchmark]].
9. Once it works for a week: [[Home#Open items]] "remove the legacy n8n stack".

Update: `git pull`, `docker compose build text2sql`, `docker compose up -d text2sql`.
Rollback: `docker compose --profile legacy up -d n8n indexer-watch` and point Open WebUI back to n8n.
Audit log: a DBA runs `sql/NLSQL_AuditLog.sql` (table + INSERT-only login) and sets `TEXT2SQL_AUDIT_DB`.
**Never** give the query login write access.

## Review answers
The way to measure and improve accuracy without writing SQL. The service writes notes into `Inbox/Review/`
(no user names):
- **answered question** - for every answer a member of a *review notes* group ([[Settings]]) got: how the question
  was understood, the answer, the tables the model was given and why.
- **failed question** - for every question that got no answer (any user), with what to check.

Every week (10 minutes):
1. Open each **answered question** note and tick **one** box: `✅ correct` or `❌ wrong` (not sure: leave it).
2. Run `tx learn`. Every ✅ becomes a verified example in [[Query bank]] (used from the next question on) and a
   *confirmed* benchmark question; the note is deleted.
3. Each ❌ note stays and says what to fix: a missing table -> add the user's word to `synonyms`; a wrong number ->
   add or fix a metric. Fix it, then delete the note.
4. **failed question** notes: same fixes, then delete.
5. Commit and push `obsidian/Catalog/Query bank.md` and `benchmark/02/confirmed.json`. Never commit the notes
   themselves (real questions; git-ignored).

## System check
`Inbox/System check.md` is written by the service itself whenever a catalog note changes. No model, no database.
It says whether the notes are readable, how many benchmark questions get the right tables (with or without meaning
search), and for each miss the table it needed -> add the question's word to that table's `synonyms`.
Now: `tx check`. It does not prove the SQL is right - that is what [[#Review answers]] is for.

The scores in the logs only put tables in order; nobody needs to tune them. To see *why* a table was chosen, read
the reasons in the review note ("Tables the model was given") or `tx ask "..." --groups NLSQL-Full --prompt-only`.

## Benchmark
- **Retrieval, seconds, no model, no database:** `tx benchmark retrieval` - a `FAIL` line names the table that did
  not reach the prompt (usually a missing synonym).
- **End to end, model + database:** `tx benchmark e2e` (or `--set questions.json --limit 10` for a quick run).
  The result in plain words goes to `Inbox/Benchmark.md`, details to `data/`. Fix the biggest failure group first:
  `retrieval_miss` = table never reached the prompt; `wrong_values` / `wrong_row_count` / `empty_result` = the SQL;
  `security_rejected`, `sql_error`, `wrongly_not_supported`. Add a row to *Results* in [[Home]].

## LLM settings
Set in [[Settings]] (*Model*) for what the service sends, and **on the model server** for the rest.

| Model | temperature | top_p | max_tokens |
|---|---|---|---|
| Qwen2.5-32B(-Coder)-Instruct | **0** | 1.0 | 1024 |
| Qwen3-32B, thinking mode | 0.6 (never 0) | 0.95 | 4096+ |
| QwQ-32B | 0.6 (never 0) | 0.95 | 4096+ |

- Context on the server: at least **16 384** tokens (vLLM `--max-model-len 16384`, Ollama `num_ctx 16384`); the
  prompt is up to 24 000 characters ≈ 8 000 tokens.
- vLLM: `api: openai` in [[Settings]] with `endpoint: http://<server>:8000/v1`; `--enable-prefix-caching` makes
  answers start faster.
- After changing anything here: run the [[#Benchmark]].

## Development
`.venv\Scripts\python -m pytest` - 2 000+ tests, including the old n8n behaviour recorded as golden cases
(`tests/py/fixtures`): the search, the prompt, the SQL guard and the answers give byte-identical results.
Code: `text2sql/` (see [[Architecture]]).
