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
| Benchmarks | `benchmark/02/questions.json` (44), `benchmark/02/paraphrase_questions.json` (20) |
| Server schema | `sql/SA_DataWarehouse_schema.sql`; access check `sql/verify_catalog_access.sql`; audit table `sql/NLSQL_AuditLog.sql` |
| Tests | `tests/*.test.js` - `npm test` |

## Branches
| Branch | What it holds |
|---|---|
| `rhk_branch_04` | Validator, `common.json`, domain routing + prompt budget, indexer, switch to the new server |
| `rhk_branch_05` | Benchmarks + eval mode, SOLID refactor of BuildPrompt and Security, security fixes, embedding units (table cards, distinctive columns, top-3 mean), this vault |

## Status
Open items - tick them off here and link the ADR or commit that closes each one.

- [ ] Deploy `rhk_branch_05` to the new server - [[Deploy to SA_DataWarehouse]]
- [ ] Webhook authentication: the email in the request body is trusted today -> add Header Auth on the webhook
- [ ] Set `DEBUG=false` in the ErrorFormat node for production
- [ ] DBA: create `NLSQL_AuditLog` and a login with INSERT only on it
- [ ] Resolve the 21 validator warnings (review flags, missing synonyms) with the domain experts
- [ ] Move the Persian calendar `Dim_Date` into `common.json`
- [ ] Paraphrase retrieval is 12/20 with embeddings - try per-question score normalisation (keep `lowConfidence` on raw similarity)
- [ ] Column pruning for very wide tables (prompt size)
- [ ] Vector store instead of sidecar files - only if the catalog grows a lot

## Decisions
- [[ADR-001 Shared dimensions in common.json]]
- [[ADR-002 Domain routing in BuildPrompt]]
- [[ADR-003 Qualified names resolve to entity CTEs]]
- [[ADR-004 Embedding units are table cards and distinctive columns]]

## Benchmark history
See `Benchmarks/`. Last known results (offline retrieval):
- `questions.json`: 36/36 keyword-only
- `paraphrase_questions.json`: 7/20 keyword-only, 12/20 with multilingual-e5 embeddings
