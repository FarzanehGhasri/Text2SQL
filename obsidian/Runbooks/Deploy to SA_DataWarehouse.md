---
type: runbook
updated: 2026-10-03
tags: [runbook, deploy]
---
# Deploy to SA_DataWarehouse

Source: README, section *Switching n8n to the new server*. Run on the machine with `docker-compose.yml`.

## Steps
1. **Code + catalogs:** check out the branch (`rhk_branch_05`) into the deploy folder, or copy
   `catalog/*.json` (including `common.json`) and `n8n_workflows/`.
2. **Validate:** `docker compose run --rm indexer node scripts/validate-catalogs.js --schema sql/SA_DataWarehouse_schema.sql` -> `0 errors`.
3. **Credential:** n8n → *Credentials* → "Microsoft SQL account": new host, database `SA_DataWarehouse`,
   the **read-only** user.
4. **Access check:** in SSMS, logged in as that read-only user, run `sql/verify_catalog_access.sql` -> **no rows**.
5. **Workflow:** import `n8n_workflows/final_improving security.json` (deactivate the old one first; same webhook path).
   Set `DEBUG = false` in ErrorFormat for production.
6. **Embeddings:** `indexer-watch` rebuilds the sidecars within a minute (format 3 forces one full rebuild).
   Check `docker compose logs indexer-watch` for `wrote … embeddings.json` and no `INVALID` / `FAILED`.
7. **Smoke test:** ask 3 questions in Open WebUI (one sales, one procurement, one that should be `NOT_SUPPORTED`).
8. **Benchmark:** [[Run the benchmark]]; add the result to *Results* in [[Text2SQL]].

## Audit log
The read-only login cannot write. Until a DBA runs `sql/NLSQL_AuditLog.sql` and a separate INSERT-only credential
is set on the "Microsoft SQL" node, auditing fails harmlessly. **Never** give the query login write access.

## Rollback
Re-activate the previous workflow and point the credential back; catalogs from the previous branch
(`git checkout rhk_branch_04 -- catalog/`) and let `indexer-watch` rebuild.

Back: [[Skill Map]] · [[Text2SQL]]
