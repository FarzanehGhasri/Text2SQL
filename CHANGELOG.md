# Changelog — branch history

Each `rhk_branch_NN` / `obsidian_NN` branch is a frozen snapshot; a new change starts from the tip of the
latest branch. What each branch added:


- **`rhk_branch_01`**
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

- **`rhk_branch_02`**
  - No functional changes to the workflow, catalog, or scripts. Branched
    from `rhk_branch_01` to start the per-change branching workflow
    described at the top of this file (every future change lands on its
    own new `rhk_branch_NN`, and older branches are kept as-is so you can
    always go back to exactly this point) and added this README.

- **`rhk_branch_03`**
  - Removed the `Retry: Security` node, which was a hand-copied duplicate
    of `Security` (SQL extraction + the SQL-injection/allowlist safety
    checks) for the one-retry-after-a-failed-query path. The two copies had
    already drifted: `Retry: Security` was missing four security fixes that
    only ever got added to `Security` — no `DBCC`/`APPLY`/`OPENXML` block,
    no detection of implicit comma-joins (`FROM a, b`), no quoted-identifier
    (`"name"`) handling, and no check for a CTE shadowing a real catalog
    entity name. In practice this meant a query that intentionally fails
    once (e.g. references a slightly-wrong column) would retry through the
    *weaker* validation, an exploitable gap in the SQL safety layer.
  - Both the first attempt and the retry now run through the single
    `Security` node. It detects which attempt it is the same way the rest
    of the workflow already detects retry-vs-first-run (probing whether an
    retry-only node, `Build Fix Prompt`, has executed yet) and returns
    `attempt` in its output instead of leaving that to be re-derived
    downstream. A new `Route by Attempt` node reads that field to send the
    validated SQL to `execute query` (attempt 1) or `Retry: execute query`
    (attempt 2), since a single node can only have one wired successor.
  - `Code in JavaScript` (result formatting) and `Code in JavaScript1`
    (audit log) no longer each carry their own copy of the
    which-Security-node-ran detection logic; they read `$('Security')`
    directly. One security-critical implementation, one place to update it.

- **`rhk_branch_04`** — move to the new `SA_DataWarehouse`
  server and make the catalogs/workflow hold up with all six domains.
  - Baseline is the workflow actually running in n8n
    (`final_improving security_05`, webhook path `text2sql`); its pinned test
    data (a real user's identity) was removed.
  - All 152 catalog entities and every column were checked against the new
    server's schema (`sql/SA_DataWarehouse_schema.sql`): all exist with
    matching types, and all 159 joins point at a primary key.
  - Catalog validator added; it found one real bug, fixed: a procurement
    example joined `[Dim_Supplier]`, which does not exist
    (`Procurement_Dim_Supplier`), so the model learned SQL that `Security`
    rejected.
  - Seven dimensions that other domains join to moved to `common.json`
    (shared). Before, e.g. a procurement-only user silently lost every join
    to part, unit, fiscal year and currency.
  - `BuildPrompt` picks the relevant domains first and sends only their core
    table, hints and examples (it used to send every allowed domain's core
    table and hints for every question); join closure goes from a table to the
    dimensions it references only; `MAX_PROMPT_CHARS` bounds the whole prompt;
    hints can be scoped to entities. Output fields are unchanged.
  - `Security` reports the model's `NOT_SUPPORTED` answer as "not answerable"
    with its reason, instead of a misleading "references no valid entity".
  - Indexer: validation gate, batched embedding calls, per-text reuse, ~3x
    smaller sidecars, cleanup of orphaned sidecars.
  - Audit-log node no longer fails the execution when the insert fails.

## Switching n8n to the new server (rhk_branch_04)

1. In n8n, edit the credential **"Microsoft SQL account"** (used by
   `execute query` and `Retry: execute query`): new host, database
   `SA_DataWarehouse`, the read-only user. Catalog sources are
   `[schema].[table]`, so the credential's database must be `SA_DataWarehouse`.
2. In SSMS, connected as that read-only user, run
   `sql/verify_catalog_access.sql`. It must return no rows.
3. Import `n8n_workflows/final_improving security.json` (or paste the two
   files in `n8n_workflows/code/` into the `BuildPrompt` and `Security`
   nodes and set the "Microsoft SQL" node's *On Error* to *Continue*).
4. Deploy `catalog/*.json` (including the new `common.json`). `indexer-watch`
   rebuilds the sidecars within a minute; check its log for
   `wrote ... embeddings.json` and no `INVALID`/`FAILED` lines.
5. Audit log: the read-only user cannot write and the new server has no
   `NLSQL_AuditLog` table, so the "Microsoft SQL" node fails harmlessly on
   every run and nothing is audited until a DBA runs `sql/NLSQL_AuditLog.sql`
   and you select a separate write-only credential on that node. Do **not**
   give the query login write access to make the audit work.

- **`rhk_branch_05`** — benchmark.
  - 44-question benchmark (`benchmark/02/questions.json`); every gold query
    was parsed as T-SQL and each table/column resolved against the warehouse
    schema.
  - Offline retrieval benchmark (`scripts/benchmark-retrieval.js`). It found
    that Persian plurals («فاکتورهای خرید») never matched singular synonyms
    («فاکتور خرید»), so `Fact_Invoice` was missing from supplier-invoice
    prompts; keyword matching now drops «ها/های». Keyword-only retrieval went
    from 32/36 to 36/36.
  - Sales examples now apply the real-sales state filter from the sales
    hint; the "year 1403" example that had no year filter was reworded.
  - Eval mode in the main workflow (header `x-eval-mode: true` from an
    `IT - Data` member only): the response also carries `rows`, `sql`,
    `modelSql`, `understood`, `retried`, and errors carry `error`. Normal
    requests (OpenWebUI) still get only `{ answer }`.
  - New runner `Text-to-SQL Benchmark-02`: `/webhook/text2sql`, questions
    generated from the JSON file, request body built as an object (quotes in
    a question no longer break it), manual trigger instead of hourly, and
    scoring by values instead of column names (the model picks its own
    aliases), with `not_supported` scored as its own category.

  - SOLID pass over `BuildPrompt` and `Security` against the catalog content:
    both are now an n8n adapter + single-purpose functions + a settings/policy
    table (behaviour verified byte-identical on 316 / 740 recorded cases before
    any fix). Two content-driven `Security` fixes on top:
    - Lines holding Persian column names (`PaymentReceiveInfo` has 37) or
      Persian aliases (`AS [جمع مبلغ]`) were dropped as "Persian prose",
      silently losing columns or breaking the query; only Persian text outside
      `[...]`, `"..."` and `'...'` now counts as prose.
    - Schema/database-qualified names: 19 entity names equal an older physical
      table in the same schema (`Fact_Invoice` vs `[PRC].[Fact_Invoice_2]`), so
      `FROM [PRC].[Fact_Invoice]` read the old table directly; and a model CTE
      named like a physical table (`WITH [Fact_Sales] AS ... JOIN
      [dbo].[Fact_Sales]`) let an HR-only user read sales data. Qualified names
      now always resolve to the entity CTE or are rejected.

  - Embedding units (scripts/lib/catalog-texts.js): one "table card" per
    entity (name, description, synonyms and the descriptions of its
    distinctive columns) plus one vector per distinctive column carrying its
    table as context. Key columns and columns whose description is shared by
    3+ tables (68% of column texts were such repeats: «شماره سند» x42,
    «عنوان» x37 ...) get no vector. `BuildPrompt` scores columns by the mean of
    the top 3 similarities instead of the maximum. Vectors 1,470 -> 571 and
    sidecars ~13 MB -> ~4.8 MB (read by n8n on every question). Sidecars are
    format 3 and are rebuilt once by the indexer after deploying.
    Measured with multilingual-e5-large as a stand-in for bge-m3 (same
    XLM-R-large family): end-to-end retrieval unchanged (36/36; 12/20 on the
    paraphrase set, up from 7/20 keyword-only) and ranking of the main table
    slightly better on the catalog-wording questions (top-1 19 -> 24 of 35).
    Re-measure on the real service with `--embed-url`.

  - Join-path completion in `BuildPrompt` (schema linking on the catalog's
    join graph): when two tables that match the question are not joined
    directly, the shortest valid path between them is found and its link
    tables are added (at most 2 per path, 3 per question, only tables the
    user may read). A path never goes through a dimension that both sides
    only reference (`A -> D <- B`, a fan trap). Before, the closure only
    followed `from -> to` one step, so a link table reached the prompt only
    if it matched a word of the question. New retrieval set
    `benchmark/02/join_path_questions.json`: 9/14 -> 12/14; `questions.json`
    stays 36/36 and the paraphrase set 7/20 (keyword only). The path is
    logged (`JOIN PATH | ...`) and returned in `retrieval.joinPathTables`.

  - **Accuracy plan, steps 0-6** (literature review: DAIL-SQL, CHESS, CodeS,
    BIRD, DIN-SQL, CHASE-SQL). Each step is one commit:
    - *Step 0, measure:* every failed benchmark question gets a
      `failure_type` (`retrieval_miss`, `wrong_values`, `empty_result`,
      `security_rejected`, `sql_error`, ...) and *Summarize Results* counts
      them (`byFailureType`); eval responses carry `selectedEntities`.
      `scripts/audit-to-benchmark.js` mines the audit log for real questions.
    - *Step 1, Qwen 32B:* `MAX_PROMPT_CHARS` 17000 -> 24000 (~8k tokens);
      rule: Persian literals as `N'...'` (without it SQL Server turns them
      into `?` and filters match nothing); server settings in
      `obsidian/How-to.md` (*LLM settings*).
    - *Step 3, query bank:* `catalog/query_bank.json` (50 draft examples, no
      benchmark copies); examples ranked by similarity (embedding + shared
      words), only when the user may read all their tables and they are in
      the prompt; an almost identical one brings its tables. The indexer
      embeds example questions (`query_bank.embeddings.json`).
    - *Step 2, values:* `catalog/values.json` from the warehouse; exact and
      partial matches go into a *VALUES FROM THE QUESTION* section (with
      keys), boost their tables (not the confidence), and small columns
      show sample values in the DDL.
    - *Step 5, semantic layer:* `metrics` in each catalog (35 exact
      definitions with mandatory filters, sent when named); `Dim_Date` moved
      to `common.json` for every domain (HR/BOM/inventory get only it) with
      a join hint and `patterns_fa` (Persian years, month names, «ماه
      گذشته»); today's Gregorian and Persian date in the prompt.
    - *Step 6, PLAN:* the model answers UNDERSTOOD -> PLAN -> SQL; Security
      returns the plan and never reads it as SQL; `Build Fix Prompt` moved
      to `n8n_workflows/code/` and asks what caused the error.
    - Retrieval benchmarks unchanged (keyword only): 36/36, 7/20, 12/14.
      The embedding-based parts were tested with fake vectors only:
      re-measure with `--embed-url` on the real `bge-m3`.
    - Before deploying: `obsidian/How-to.md` (*Accuracy data*: build
      `values.json`, run `sql/check_query_bank.sql`) and
      *LLM settings*). The semantic-layer commit message
      says 40 metrics; there are 35.

  - **Node review:** `BuildPrompt` (1 000 lines doing search and prompt text)
    split into `Find Tables` (which tables, examples, values, metrics) and
    `BuildPrompt` (only the prompt text) - identical prompts on 160
    question/vector combinations. Generic node names renamed (`Format
    Answer`, `Audit Row`, `Write Audit Log`); `AuthCheck` and `Audit Row`
    moved to `n8n_workflows/code/`. ErrorFormat shows technical details only
    to `IT - Data` / `IT - Security` (no global `DEBUG`). Format Answer:
    `CHART_BASE_URL` setting, `|` and line breaks escaped, a note when the
    200-row cap is hit. Embed Question calls the compose service `embeddings`.

  - **Accuracy without tuning or writing SQL:**
    - *Relative meaning score* (`Find Tables`): a table gets meaning points
      only when its similarity stands out (> 2 standard deviations above the
      mean over all catalog tables for this question), so the model's
      baseline similarity no longer counts and nothing is tuned per model.
      Each chosen table carries plain reasons (`retrieval.why`, `WHY` log).
    - *Review loop:* n8n writes an "answered question" note for `IT - Data` /
      `IT - Security`; tick ✅ or ❌, run `scripts/learn-from-inbox.js`; ✅
      becomes a verified bank example and a question in
      `benchmark/02/confirmed.json` (regression check, not in accuracy %).
      *Summarize Results* adds `inPlainWords` and a meaning per failure type.
    - *System check:* `indexer-watch` runs `scripts/system-check.js` after
      every change (and daily) and writes `obsidian/Inbox/System check.md`:
      catalog errors, retrieval results with/without embeddings, and for each
      missed question the table it needed. Keyword-only results (36/36, 7/20,
      12/14) are now a test floor.

  - **Nodes in one SOLID shape:** every Code node is settings ->
    `readN8nInputs()` (the only place that reads other nodes) -> one-job
    functions. `AuthCheck` alone decides rights (`can.seeDetails`,
    `can.evalMode`, `can.reviewNotes`, table `RIGHTS`); ErrorFormat, Format
    Answer and Obsidian note no longer name AD groups. Same output as before on
    3,546 input combinations. The canvas has labelled sections 1-6; the
    Obsidian write node is `Save to Obsidian Inbox`.

  - **The catalog lives in Obsidian:** `obsidian/Catalog` notes are the
    source (domain note: access, rules, metrics, examples, table list;
    table note: synonyms, columns with Show = yes/hidden/review, links;
    `Rules for every question`). `scripts/obsidian-to-catalog.js` (run by
    `indexer-watch` every minute) writes `catalog/*.json` only when every
    note reads and validates; n8n is unchanged apart from the new
    `catalog/rules.json`. Lossless round trip; joins now stored grouped by
    table. `export-catalog-to-obsidian.js` is now a recovery tool
    (`--overwrite-notes`).

- **`obsidian_01`** — the Obsidian assistant.
  - **Ask the vault in Open WebUI:** new workflow `Obsidian assistant`
    (`/webhook/obsidian-assistant`). `scripts/index-vault-embeddings.js`
    (in `indexer-watch`) cuts every note at `##` headings into ≤ 1 800-char
    pieces and embeds them into `vault-index/vault.embeddings.json`, only
    after a note or a permission changes. `Find Notes` keeps the pieces the
    user may see (the catalog `permissions`, as in Text2SQL; project notes
    only with the new right `can.projectNotes` = `IT - Data`,
    `IT - Security`), scores meaning + IDF-weighted shared words and sends
    the best 8 (≤ 16 000 chars) to the same `/combine`. Never indexed:
    `Inbox/`, `CLAUDE.md`, `hidden` columns. Open WebUI function:
    `openwebui/obsidian_assistant.py`.
  - **One node per job:** removed `Retry: request to LLM`,
    `Retry: execute query` (copies of the first-attempt nodes) and
    `Respond to Webhook1` (a second identical respond node); `Route by
    Attempt` became `Retry once?` on the query's error output. Removed the
    old `Text-to-SQL Benchmark-01.json` (a copy of Benchmark-02 calling a
    webhook that no longer exists, with an hourly trigger).
  - **`obsidian/Schema.md`:** every table by domain on one page,
    generated from the catalog in `indexer-watch`; a test fails when the
    committed copy is stale. `Home.md` stays the vault's index.
  - `scripts/sync-workflow-code.js` copies `AuthCheck` / `ErrorFormat` into
    both workflows; `tests/obsidian-assistant.test.js` covers the chunker,
    the indexer, the three new Code nodes, the wiring and `Schema.md`.

- **`obsidian_02`** — the search leaves n8n.
  - **catalog-service** (`catalog-service/`, a Node.js container with no
    npm packages): `POST /tables` runs Find Tables (moved out of n8n
    unchanged: the prompt of all 468 benchmark question / group / embedding
    combinations is byte-for-byte the same) and `POST /notes` answers from
    the notes. It reads `catalog/*.json` and `vault-index/` and keeps them
    in memory until a file changes. No published port.
  - **One workflow, 19 nodes** (was 21 + the 12-node Obsidian assistant):
    removed ReadCatalog, ParseCatalog, Embed Question, Merge Catalog+Embedding
    and the Find Tables Code node; added `Notes or data?` (IF on `mode`),
    `Find Tables` and `Ask Notes` (HTTP to catalog-service). n8n mounts no
    catalog. BuildPrompt sends a service refusal to ErrorFormat.
  - **Open WebUI:** `openwebui/text2sql.py` shows two models, Text2SQL and
    Obsidian notes, on the same webhook (`mode`).
  - **Whole tables in the notes search:** each table is one piece built from
    the catalog (columns + joins both ways, `scripts/lib/table-pieces.js`);
    table notes are no longer cut at headings.
  - Text2SQL answers end with the Obsidian notes they came from;
    `Schema.md` shows the join columns. README rewritten (Persian); this
    history moved here.

- **`obsidian_03`** *(current)* — the table choice is learned from data.
  - **Keyword evidence as BM25F** (`catalog-service/text2sql/lexical.js`): whole
    words, longest phrase first, IDF over tables, field-length normalisation
    (k1 1.2, b 0.75), no double count of a word in a table's synonym and
    description. Fixes measured faults: «سن» inside «حسنی», «دفتر» inside
    «دفتر فروش», shared synonyms counted in full.
  - **Learned model** (`relevance.js`, `scripts/lib/logistic-regression.js`,
    `scripts/lib/retrieval-training.js`, `scripts/train-retrieval.js`):
    logistic regression over the evidence, L2 by grouped CV; every threshold
    (select, domain ratio, max domains, join path, confidence) chosen on the
    real pipeline by mean F4 (`--beta`), coordinate ascent. One model per
    signal set (keyword, + meaning, + reranker). `catalog/retrieval-model.json`;
    `indexer-watch` retrains on the server when inputs change.
  - **Rules** for what a person declared: metric tables, a whole stored
    value's table, a matched pattern (Persian year → `Dim_Date`).
  - **Optional reranker** (`BAAI/bge-reranker-v2-m3`, compose profile
    `reranker`, `RERANK_URL`): rescores the 20 likeliest tables.
  - Cross-validated, keyword-only (old points → learned): 35/35 → 33/35,
    12/14 → 13/14, 7/20 → 9/20; 15.9 → 11.4 tables per prompt. Meaning and
    reranker were not measurable here (bge-m3 not downloadable).
