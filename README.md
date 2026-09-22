# Text2SQL — branch notes

This repo is developed as a sequence of checkpoint branches: `rhk_branch_01`,
`rhk_branch_02`, `rhk_branch_03`, ... Each branch is a frozen snapshot of the
whole project at some point in time. **Branches are never rewritten or force
pushed** — once `rhk_branch_NN` is pushed, it stays exactly as it is. Any new
change starts from the tip of the latest branch and lands on a fresh
`rhk_branch_(NN+1)`. This means you can always check out an older branch to
get back the exact files/workflow/scripts as they were before a given change,
without hunting through commit history.

If you're picking a branch to actually run, use the **highest-numbered
one** — see "Branch history" below for what each branch added.

## What's in this repo

- `n8n_workflows/final_improving security.json` — the n8n workflow: webhook
  → LDAP auth → catalog read → prompt building (`BuildPrompt`) → LLM call →
  SQL safety layer (`Security`) → query execution → response formatting,
  plus a one-shot SQL repair retry path.
- `catalog/*.json` — the entity/column catalog `BuildPrompt` uses to build
  the LLM prompt and to validate which tables/columns a query is allowed to
  touch. Editing these is how you teach the system about new tables or
  schema changes.
- `scripts/index-catalog-embeddings.js` — builds `catalog/<name>.embeddings.json`
  sidecar files (one embedding vector per entity/column) that `BuildPrompt`
  uses for semantic (not just keyword) retrieval scoring.
- `docker-compose.yml` — `n8n`, `open-webui`, `embeddings` (TEI service),
  `quickchart`, plus two indexer services (see below).

## Running the catalog embedding indexer

- **One-off / immediate rebuild:**
  `docker compose run --rm indexer`
  Append `--force` (e.g.
  `docker compose run --rm indexer node scripts/index-catalog-embeddings.js --embed-url http://embeddings:80/embed --force`)
  to rebuild even if nothing changed (e.g. after switching embedding models).
- **Automatic, always-on:** the `indexer-watch` service (no profile, so it
  starts with a plain `docker compose up`) reruns the indexer every 60s.
  Each catalog file's sidecar stores a content hash, so an unchanged file is
  a complete no-op — the embedding service is only actually called after a
  real edit to `catalog/*.json` (new table, new column, changed description
  or synonyms, etc.). This is fully decoupled from the n8n workflow: it
  never runs per question, only on catalog content changes.

## Branch history

- **`rhk_branch_01`** *(current)*
  - Fixed `BuildPrompt`'s question-embedding retrieval always reporting
    `semanticUsed: false`. Root cause: the `Embed Question` node was wired
    as an unconnected sibling branch off `Webhook` with no outgoing
    connections, so `BuildPrompt`'s `$('Embed Question')` reference was
    racing an HTTP call that hadn't necessarily finished yet. Fixed by
    adding a `Merge Catalog+Embedding` node that waits on both `ParseCatalog`
    and `Embed Question` (success and error paths) before `BuildPrompt` runs.
  - Fixed the semantic score (`sem`) always being `0` even after the above
    fix. Root cause: `catalog/*.json` had no `.embeddings.json` sidecar
    files, so `BuildPrompt` had nothing to compare the question's embedding
    against. Added `scripts/index-catalog-embeddings.js` (via
    `docker compose run --rm indexer`) to generate them.
  - Added automatic, ongoing re-indexing so newly generated sidecars don't
    go stale after a catalog edit: content-hash gating in
    `index-catalog-embeddings.js` (skip files that haven't changed) plus the
    always-on `indexer-watch` docker-compose service that polls every 60s.
  - This branch is the checkpoint at which `semanticUsed: true` and `sem`
    became non-zero in practice, confirmed against the live n8n instance.
