---
type: project
updated: 2026-10-03
tags: [project, architecture]
---
# Architecture

```mermaid
flowchart LR
  U[Open WebUI user] -->|POST /webhook/text2sql| W[Webhook]
  W --> L[LDAP lookup] --> A{AuthCheck<br/>AD groups}
  A -->|no group| E[ErrorFormat]
  A --> RC[ReadCatalog<br/>catalog/*.json] --> PC[ParseCatalog]
  A --> EQ[Embed Question<br/>TEI bge-m3]
  PC --> M[Merge]
  EQ --> M
  M --> BP[BuildPrompt]
  BP --> LLM[request to LLM]
  LLM --> S[Security]
  S -->|ok| Q[(SA_DataWarehouse<br/>read-only login)]
  S -->|error, attempt < 2| BP
  Q --> F[Formatter] --> U
  Q --> AL[(NLSQL_AuditLog)]
  S -->|blocked / NOT_SUPPORTED| E --> U
```

## Nodes that matter

**BuildPrompt** (`n8n_workflows/code/BuildPrompt.js`)
1. `resolveAccess` - which catalogs/entities the user's AD groups allow.
2. `scoreEntities` - keyword score (Persian-normalised synonyms, names, columns) + semantic score
   (question vector vs table card and distinctive column vectors, top-3 column mean).
3. `selectDomains` - at most 3 domains, each within 60% of the best one.
4. `selectEntities` - top tables + join closure (`from -> to`).
   `completeJoinPaths` - connects matched tables that are not joined directly through link tables (log `JOIN PATH`).
5. `renderPrompt` / `packPrompt` - DDL, hints, examples within a 17 000-character budget.

**Security** (`n8n_workflows/code/Security.js`)
1. Extract SQL from the model reply (ignore Persian prose, keep `[...]`, `"..."`, `'...'`).
2. `NOT_SUPPORTED` -> polite message.
3. Read-only check: blocked keywords, no comma joins, single statement.
4. Force `TOP 200`.
5. Rewrite every table reference, qualified or not, to the user's entity CTE;
   unknown tables are rejected.
6. Prepend the CTEs, which expose only the allowed columns.

## Catalog contract
`domain`, `description_fa`, `shared`, `hints_fa`, `permissions` (AD group -> `*` or entity list),
`entities[]` (`name`, `kind`, `source`, `core`, `synonyms_fa`, `columns[]` with `exposed` / `review` / `alias`),
`joins[]` (FK `from` -> PK `to`), `examples[]`. Browse it in `Catalog/`.

## Why it works this way
- **Shared dimensions in `common.json`** (rhk_branch_04): the 7 dimensions used by several domains live once
  instead of in every catalog, so a fix is made in one place and the prompt has no duplicates.
  A shared table alone never activates a domain.
- **Domain routing** (rhk_branch_04): 6 catalogs / 152 tables do not fit one prompt, and unrelated tables confuse
  the model. So at most 3 domains (each ≥ 60% of the best) and a 17 000-character budget. It was 2 domains, but
  mixed questions lost the sales domain. A missing table is usually a missing synonym - fix the catalog, not the code.
- **Qualified names go through the CTEs** (rhk_branch_05): `[dbo].[Fact_Sales]` used to bypass the CTE, so an
  HR-only user could read sales, and 19 entity names equal older physical tables. Now every reference becomes the
  entity CTE or is rejected; a model CTE named like an entity is rejected too.
- **Join paths on the catalog graph** (rhk_branch_05): the closure only follows `from -> to` one step, so a
  link table (e.g. `Procurement_Fact_Inventory` between invoice state and delivery state) reached the prompt only
  if it matched a word. Now the shortest valid path between matched tables adds it (≤ 2 per path, ≤ 3 per
  question, only readable tables). Never through a dimension both sides only reference (`A -> D <- B`, fan trap).
  The graph comes from `joins` in the catalog - the same data Obsidian draws - not from the Obsidian notes.
- **What is embedded** (rhk_branch_05): one card per table + one vector per *distinctive* column (keys and
  descriptions repeated in 3+ tables get none); a table's column score is the mean of its top 3 columns.
  Fewer, cleaner vectors: 1 470 -> 571, sidecars 13 MB -> 4.8 MB.
