---
type: project
status: active
branch: rhk_branch_05
updated: 2026-10-03
tags: [project]
---
# Text2SQL

Persian natural-language questions -> read-only T-SQL on `SA_DataWarehouse`, answered in Open WebUI.
How it works end to end: [[Architecture]].

## Pieces
| Piece | Where |
|---|---|
| Main workflow | `n8n_workflows/final_improving security.json` (webhook `/webhook/text2sql`) |
| Code nodes (source of truth) | `n8n_workflows/code/*.js` -> synced into the workflow by `scripts/sync-workflow-code.js` |
| Catalogs | `catalog/*.json` - 6 domains + `common.json`; readable view in `Catalog/` of this vault |
| Embeddings | `catalog/*.embeddings.json`, built by the `indexer` / `indexer-watch` containers (TEI `bge-m3`) |
| Query bank (few-shot) | `catalog/query_bank.json` (50, draft) -> checked with `sql/check_query_bank.sql`; vectors in `query_bank.embeddings.json` |
| Value index | `catalog/values.json` (not in git) from `sql/extract_values.sql` + `scripts/build-value-index.js` - [[Accuracy data]] |
| Metrics | `metrics` in each `catalog/<domain>.json` (35); listed in each domain note of `Catalog/` |
| Benchmarks | `benchmark/02/questions.json` (44), `benchmark/02/paraphrase_questions.json` (20), `benchmark/02/join_path_questions.json` (14); candidates from the audit log: `scripts/audit-to-benchmark.js` |
| LLM | Qwen 32B behind `/combine` - settings in [[LLM settings]] |
| Server schema | `sql/SA_DataWarehouse_schema.sql`; access check `sql/verify_catalog_access.sql`; audit table `sql/NLSQL_AuditLog.sql` |
| Tests | `tests/*.test.js` - `npm test` |

## Branches
| Branch | What it holds |
|---|---|
| `rhk_branch_04` | Validator, `common.json`, domain routing + prompt budget, indexer, switch to the new server |
| `rhk_branch_05` | Benchmarks + eval mode, SOLID refactor of BuildPrompt and Security, security fixes, embedding units (table cards, distinctive columns, top-3 mean), join-path completion, this vault; accuracy plan steps 0-6: failure taxonomy, Qwen settings, query bank, value retrieval, metrics + shared Persian calendar, PLAN before SQL |

## Status
Open items - tick them off here and note the commit that closes each one.

- [ ] Deploy `rhk_branch_05` to the new server - [[Deploy to SA_DataWarehouse]]
- [ ] Webhook authentication: the email in the request body is trusted today -> add Header Auth on the webhook
- [ ] Set `DEBUG=false` in the ErrorFormat node for production
- [ ] DBA: create `NLSQL_AuditLog` and a login with INSERT only on it
- [ ] Resolve the 21 validator warnings (review flags, missing synonyms) with the domain experts
- [ ] Move the Persian calendar `Dim_Date` into `common.json`
- [ ] Paraphrase retrieval is 12/20 with embeddings - try per-question score normalisation (keep `lowConfidence` on raw similarity)
- [ ] Column pruning for very wide tables (prompt size)
- [ ] Vector store instead of sidecar files - only if the catalog grows a lot
- [ ] Confirm which Qwen 32B runs behind `/combine` and set its temperature / context length - [[LLM settings]]
- [ ] Run `sql/check_query_bank.sql`, fix failing examples, mark good ones `verified` - [[Accuracy data]]
- [ ] Build `catalog/values.json` on the server (`sql/extract_values.sql`) - [[Accuracy data]]
- [ ] Confirm the `Dim_Date` join: `TRY_CAST([FullDateAlternateKey] AS date)` returns dates (the 4 `date_b*` examples in the bank check it)
- [ ] Re-measure retrieval with the real `bge-m3` (`--embed-url`): example ranking and example-linked tables were only tested with fake vectors
- [ ] End-to-end benchmark with Qwen 32B before/after rhk_branch_05's accuracy steps; record `byFailureType`
- [ ] Grow the benchmark to 150-300 real questions from the audit log - [[Accuracy data]] §3
- [ ] Next (plan step 7-8): move the engine to a Python service, then several candidates + selection and execution-guided repair

Why things are built the way they are: [[Architecture#Why it works this way]].

## Results
Add one row per benchmark run ([[Run the benchmark]]).

| Date | Branch | Set | Keyword only | With embeddings | Note |
|---|---|---|---|---|---|
| 2026-10 | rhk_branch_05 | questions.json (36 retrieval) | 36/36 | 36/36 | catalog wording |
| 2026-10 | rhk_branch_05 | paraphrase_questions.json | 7/20 | 12/20 | multilingual-e5 as stand-in for bge-m3 |
| 2026-10 | rhk_branch_05 | join_path_questions.json | 9/14 -> 12/14 | - | before -> after join-path completion |
