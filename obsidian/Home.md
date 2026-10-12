---
type: project
status: active
branch: obsidian_03
updated: 2026-10-13
---
# Text2SQL

Persian questions in Open WebUI -> read-only T-SQL on `SA_DataWarehouse`, through n8n and Qwen 32B.
Questions about the project and the catalog -> the model **Obsidian notes** answers from these notes ([[How-to#Obsidian notes model]]).
Everything the model knows is written here, in Obsidian; n8n only asks catalog-service ([[Architecture#catalog-service]]).

- [[How-to]] - every task, step by step (commands, deploy, benchmark, accuracy data, LLM settings, inbox notes)
- [[Architecture]] - how the workflow works, and why it is built this way
- [[Me]] - who I am and how I work
- [[Schema]] - every table by domain on one page (generated)
- Catalog: [[sales]] · [[procurement]] · [[treasury]] · [[hr]] · [[bom]] · [[inventory_docs]] · [[common]]
  (open the **graph view** to see every table and its joins)

## This vault
| Folder / note | What it is | Edit it? |
|---|---|---|
| `Home`, `How-to`, `Architecture`, `Me` | the project notes | yes |
| `Schema` | every table by domain, written from the catalog every minute | no - edit `Catalog/` |
| `Catalog/` | **the catalog the model uses**: one note per domain (access, rules, metrics, examples, tables), one per table (synonyms, columns, links), `Rules for every question` | **yes** - the model gets your edit within a minute ([[How-to#Edit the catalog]]) |
| `Inbox/n8n/` | answered questions to tick ✅/❌ and failed questions, written by n8n | [[How-to#Review answers]] (not in git) |
| `Inbox/System check.md` | the system testing itself, refreshed automatically | read it; fix what it lists (not in git) |

Who sees what (AD groups, set under *Who may see it* in each domain note, e.g. [[sales]]):
`IT - Data`, `IT - Security`, `NLSQL-Full` = every table; `NLSQL-<domain>` = that domain plus the shared tables
it needs. Only `IT - Data` may use the benchmark's eval mode. Group names must match AD exactly (spaces included).

Rules: link tables as `[[Fact_Sales]]`; no passwords, connection strings or users' personal data (the vault is in git).
The notes model reads every note except `Inbox/` and `CLAUDE.md`: write notes so that a sentence still makes sense on its own.

## Open items
Tick them off and note the commit that closes each one.

- [ ] Deploy `obsidian_03` to the server - [[How-to#Deploy]]; then check `/health` lists `lexical+semantic` - [[How-to#Table-choice model]]
- [ ] After pulling obsidian_04: rebuild the vectors once with Ollama's bge-m3 (`--force`) - [[How-to#Deploy]] step 5
- [ ] Measure the table-choice model with the real bge-m3 (`--report`) and write the result below - [[How-to#Table-choice model]]
- [ ] Try the reranker: `--report` with and without it; keep it only if it is better - [[How-to#Table-choice model]]
- [ ] End-to-end benchmark (Qwen + SQL) with `--beta 4` and `--beta 2`: which prompt size gives better SQL? - [[How-to#Benchmark]]
- [ ] Open WebUI: add `openwebui/text2sql.py`, disable the old function, test both models - [[How-to#Obsidian notes model]]
- [ ] Confirm which Qwen 32B runs behind `/combine`; set temperature and context length - [[How-to#LLM settings]]
- [ ] Re-import the main workflow after pulling (19 nodes since obsidian_02; delete an imported `Obsidian assistant` workflow) - [[How-to#Deploy]] step 6
- [ ] Every week: tick ✅/❌ on answered-question notes, run `learn-from-inbox.js` - [[How-to#Review answers]]
- [ ] Read `Inbox/System check.md` once embeddings run; record "with embeddings" below - [[How-to#System check]]
- [ ] Run `sql/check_query_bank.sql`; fix failing examples, mark good ones `verified` - [[How-to#Accuracy data]]
- [ ] Build `catalog/values.json` on the server - [[How-to#Accuracy data]]
- [ ] Confirm the `Dim_Date` join works (the 4 `date_b*` examples in the bank check it)
- [ ] End-to-end benchmark with Qwen 32B; record `byFailureType` below - [[How-to#Benchmark]]
- [ ] Re-measure retrieval with the real `bge-m3` (`--embed-url`)
- [ ] DBA: create `NLSQL_AuditLog` and an INSERT-only login
- [ ] Grow the benchmark to 150-300 real questions - mostly by ticking ✅ ([[How-to#Review answers]])
- [ ] Webhook authentication: the email in the request body is trusted today -> add Header Auth
- [ ] Set `CHART_BASE_URL` at the top of the Format Answer node to the server's address (charts are loaded by the user's browser; `localhost` works only on the server itself)
- [ ] Resolve the 21 validator warnings (review flags, missing synonyms) with the domain experts
- [ ] Later: column pruning for very wide tables; several SQL candidates + selection
- [x] Move the Persian calendar `Dim_Date` into `common.json` (7a1ebeb)
- [x] n8n writes a note for every failed question into `Inbox/n8n/` (42bcf5a)
- [x] Technical error details only for `IT - Data` / `IT - Security` (replaces the `DEBUG` switch)
- [x] Meaning score relative to the question - no numbers to tune; plain reasons per table (8ce2fbf)
- [x] Review loop: ✅/❌ in Obsidian instead of writing gold SQL (034b34a)
- [x] Automatic system check written to `Inbox/System check.md`
- [x] All Code nodes in one SOLID shape; rights decided only in AuthCheck; canvas in labelled sections 1-6
- [x] The catalog lives in Obsidian: notes -> `catalog/*.json` -> the model, every minute; `Rules for every question`
- [x] Obsidian notes model: Qwen answers from the notes the user may see, in Open WebUI (obsidian_01)
- [x] The search left n8n: catalog-service; one workflow and two models; whole tables with their joins in the notes search; answers name their notes (obsidian_02)
- [x] Table choice learned from data: BM25F keywords, a logistic model, learned thresholds, rules for metrics/values/patterns, optional reranker (obsidian_03)
- [x] One node per job: duplicate retry LLM / query / respond nodes and the old Benchmark-01 runner removed (obsidian_01)
- [x] [[Schema]]: all tables on one page, generated from the catalog (obsidian_01)

## Results
One row per benchmark run.

| Date | Branch | Set | Keyword only | With embeddings | Note |
|---|---|---|---|---|---|
| 2026-10 | rhk_branch_05 | questions.json (36 retrieval) | 36/36 | 36/36 | catalog wording |
| 2026-10 | rhk_branch_05 | paraphrase_questions.json | 7/20 | 12/20 | multilingual-e5 as stand-in for bge-m3 |
| 2026-10 | rhk_branch_05 | join_path_questions.json | 9/14 -> 12/14 | - | before -> after join-path completion |
| 2026-10-11 | rhk_branch_05 | all three | 36/36, 7/20, 12/14 | not measured yet | relative meaning score; "with embeddings" comes from `Inbox/System check.md` |
| 2026-10-13 | obsidian_03 | all three, **cross-validated** | 33/35, 13/14, 9/20 (old points: 35/35, 12/14, 7/20) | to measure on the server | learned model; 11.4 tables per prompt instead of 15.9; "35/35" counts labelled questions (36 incl. the access check) |

## Where things are in the repo
| Piece | Where |
|---|---|
| Main workflow | `n8n_workflows/final_improving security.json` (webhook `/webhook/text2sql`) |
| Search service | `catalog-service/` (Find Tables, notes search; container `catalog-service`) |
| Table-choice model | `catalog/retrieval-model.json` (server, not in git), baseline `catalog-service/text2sql/baseline-model.json`; `scripts/train-retrieval.js` |
| Open WebUI function | `openwebui/text2sql.py` (models Text2SQL and Obsidian notes) |
| Code nodes | `n8n_workflows/code/*.js` -> copied into the workflow by `scripts/sync-workflow-code.js` |
| Vault index | `vault-index/vault.embeddings.json` - built by `scripts/index-vault-embeddings.js`, not in git |
| Catalogs | `obsidian/Catalog/` (source) -> `catalog/*.json` (generated by `scripts/obsidian-to-catalog.js`, read by n8n) |
| Query bank | `catalog/query_bank.json` (50 examples) |
| Value index | `catalog/values.json` - built on the server, not in git |
| Benchmarks | `benchmark/02/*.json` (`confirmed.json` = answers approved in Obsidian) |
| Review loop / self-check | `scripts/learn-from-inbox.js`, `scripts/system-check.js` |
| Tests | `tests/*.test.js` - `npm test` |
