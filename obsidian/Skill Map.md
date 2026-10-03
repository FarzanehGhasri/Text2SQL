---
type: meta
updated: 2026-10-03
tags: [meta]
---
# Skill Map

> Every repeatable task in this project: when to do it, the exact command, and what "done" looks like.
> Commands run from the repo root (on Windows: in the folder with `docker-compose.yml`).
> `docker compose run --rm indexer <cmd>` runs any `node` command below without installing Node.

## Catalog

| Skill | When | How | Done when |
|---|---|---|---|
| **Validate catalogs** | After any edit to `catalog/*.json` | `node scripts/validate-catalogs.js --schema sql/SA_DataWarehouse_schema.sql` | `0 errors` (warnings = review list) |
| **Export catalog to Obsidian** | After a catalog change | `node scripts/export-catalog-to-obsidian.js` | `Catalog/` refreshed; `--check` passes |
| **Rebuild embeddings** | Automatic (`indexer-watch`, 60 s); force after changing the embedding model | `docker compose run --rm indexer` (add `node scripts/index-catalog-embeddings.js --embed-url http://embeddings:80/embed --force` to force) | log shows `wrote …embeddings.json`, no `INVALID`/`FAILED` |
| **Check DB access** | After pointing n8n at a server or changing the login | `node scripts/generate-verify-sql.js`, then run `sql/verify_catalog_access.sql` in SSMS **as the read-only login** | the query returns **no rows** |
| **Add synonyms from a failed question** | A real question picked the wrong table | find the table in [[Home#Catalog]], add the user's word to `synonyms_fa`, validate, export, add the question to `benchmark/02/paraphrase_questions.json` | retrieval benchmark passes that question |
| **Add a new domain** | New subject area | new `catalog/<domain>.json` (one `core` entity, `permissions` with `NLSQL-<domain>`), shared dimensions go to `common.json`; validate; export; AD group created | validator 0 errors, benchmark questions added |

## Workflow code

| Skill | When | How | Done when |
|---|---|---|---|
| **Edit a Code node** | Changing BuildPrompt / Security / formatter / ErrorFormat | edit `n8n_workflows/code/<Node>.js`, then `node scripts/sync-workflow-code.js` | `--check` passes, tests green |
| **Pull UI edits back** | Someone edited code in the n8n UI | export the workflow over the JSON, then `node scripts/sync-workflow-code.js --extract` | code files show the change |
| **Run tests** | Before every commit | `npm test` (or `node --test`) | all pass |

## Quality

| Skill | When | How | Done when |
|---|---|---|---|
| **Retrieval benchmark (offline)** | After catalog or BuildPrompt changes | `node scripts/benchmark-retrieval.js`, then `--questions benchmark/02/paraphrase_questions.json` and `--questions benchmark/02/join_path_questions.json`; with real embeddings add `--embed-url http://embeddings:80/embed` (inside Docker) | result added to *Results* in [[Text2SQL]] |
| **End-to-end benchmark (n8n)** | Before/after a deploy | import `n8n_workflows/Text-to-SQL Benchmark-02.json`, runner user in `IT - Data`, *Execute workflow* | accuracy added to *Results* in [[Text2SQL]] |
| **Review a failed question** | Weekly, from `Inbox/n8n/` | open the note, follow its checklist (wrong table -> synonym; wrong SQL -> hint/example) | fixed in the catalog, note deleted |

## Deploy
- [[Deploy to SA_DataWarehouse]] - switch n8n to the new server, verify, roll back.
- [[Run the benchmark]] - both benchmarks step by step.
- [[Obsidian with n8n and Docker]] - let n8n write notes into this vault.

## Claude Code
- Built-in: `/code-review` (bugs in a diff), `/security-review` (pending changes), `/simplify`.
- Ask Claude to read [[Me]], [[Vault Map]] and this note first (see `CLAUDE.md` in this folder).
- Candidates to turn into project skills (`.claude/skills/<name>/SKILL.md`): *validate-and-export catalog*,
  *run retrieval benchmark*, *deploy checklist*.

## Links
[[Home]] · [[Me]] · [[Vault Map]]
