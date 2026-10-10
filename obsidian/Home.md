---
type: project
status: active
branch: rhk_branch_05
updated: 2026-10-10
---
# Text2SQL

Persian questions in Open WebUI -> read-only T-SQL on `SA_DataWarehouse`, through n8n and Qwen 32B.

- [[How-to]] - every task, step by step (commands, deploy, benchmark, accuracy data, LLM settings, inbox notes)
- [[Architecture]] - how the workflow works, and why it is built this way
- [[Me]] - who I am and how I work
- Catalog: [[sales]] · [[procurement]] · [[treasury]] · [[hr]] · [[bom]] · [[inventory_docs]] · [[common]]
  (open the **graph view** to see every table and its joins)

## This vault
| Folder / note | What it is | Edit it? |
|---|---|---|
| `Home`, `How-to`, `Architecture`, `Me` | the project notes | yes |
| `Catalog/` | one note per table, generated from `catalog/*.json` | **no** - change the JSON and run the exporter |
| `Inbox/n8n/` | one note per failed question, written by n8n | work through them, then delete (not in git) |

Who sees what (AD groups, set in `permissions` of each `catalog/*.json`):
`IT - Data`, `IT - Security`, `NLSQL-Full` = every table; `NLSQL-<domain>` = that domain plus the shared tables
it needs. Only `IT - Data` may use the benchmark's eval mode. Group names must match AD exactly (spaces included).

Rules: link tables as `[[Fact_Sales]]`; no passwords, connection strings or users' personal data (the vault is in git).

## Open items
Tick them off and note the commit that closes each one.

- [ ] Deploy `rhk_branch_05` to the server - [[How-to#Deploy]]
- [ ] Confirm which Qwen 32B runs behind `/combine`; set temperature and context length - [[How-to#LLM settings]]
- [ ] Run `sql/check_query_bank.sql`; fix failing examples, mark good ones `verified` - [[How-to#Accuracy data]]
- [ ] Build `catalog/values.json` on the server - [[How-to#Accuracy data]]
- [ ] Confirm the `Dim_Date` join works (the 4 `date_b*` examples in the bank check it)
- [ ] End-to-end benchmark with Qwen 32B; record `byFailureType` below - [[How-to#Benchmark]]
- [ ] Re-measure retrieval with the real `bge-m3` (`--embed-url`)
- [ ] DBA: create `NLSQL_AuditLog` and an INSERT-only login
- [ ] Grow the benchmark to 150-300 real questions from the audit log - [[How-to#Accuracy data]]
- [ ] Webhook authentication: the email in the request body is trusted today -> add Header Auth
- [ ] Set `CHART_BASE_URL` at the top of the Format Answer node to the server's address (charts are loaded by the user's browser; `localhost` works only on the server itself)
- [ ] Resolve the 21 validator warnings (review flags, missing synonyms) with the domain experts
- [ ] Later: column pruning for very wide tables; several SQL candidates + selection
- [x] Move the Persian calendar `Dim_Date` into `common.json` (7a1ebeb)
- [x] n8n writes a note for every failed question into `Inbox/n8n/` (42bcf5a)
- [x] Technical error details only for `IT - Data` / `IT - Security` (replaces the `DEBUG` switch)

## Results
One row per benchmark run.

| Date | Branch | Set | Keyword only | With embeddings | Note |
|---|---|---|---|---|---|
| 2026-10 | rhk_branch_05 | questions.json (36 retrieval) | 36/36 | 36/36 | catalog wording |
| 2026-10 | rhk_branch_05 | paraphrase_questions.json | 7/20 | 12/20 | multilingual-e5 as stand-in for bge-m3 |
| 2026-10 | rhk_branch_05 | join_path_questions.json | 9/14 -> 12/14 | - | before -> after join-path completion |

## Where things are in the repo
| Piece | Where |
|---|---|
| Main workflow | `n8n_workflows/final_improving security.json` (webhook `/webhook/text2sql`) |
| Code nodes | `n8n_workflows/code/*.js` -> copied into the workflow by `scripts/sync-workflow-code.js` |
| Catalogs | `catalog/*.json` - 6 domains + `common.json`, each with `metrics` |
| Query bank | `catalog/query_bank.json` (50 examples) |
| Value index | `catalog/values.json` - built on the server, not in git |
| Benchmarks | `benchmark/02/*.json` |
| Tests | `tests/*.test.js` - `npm test` |
