---
type: project
status: active
branch: rhk_branch_05
updated: 2026-10-11
---
# Text2SQL

Persian questions in Open WebUI -> read-only T-SQL on `SA_DataWarehouse`, with Qwen 32B.
**This vault is the system's knowledge**: the `text2sql` service (Python) reads the catalog, the rules and the
settings straight from these notes; a saved edit is used from the next question on.

- [[How-to]] - every task, step by step (edit the catalog, deploy, review answers, benchmark, LLM settings)
- [[Architecture]] - how it works, and why it is built this way
- [[Settings]] - model, prompt size, embeddings, chart address, who may do what
- [[Me]] - who I am and how I work
- Catalog: [[sales]] · [[procurement]] · [[treasury]] · [[hr]] · [[bom]] · [[inventory_docs]] · [[common]] ·
  [[Rules for every question]] · [[Query bank]] (open the **graph view** to see every table and its links)

## This vault
| Folder / note | What it is | Edit it? |
|---|---|---|
| `Home`, `How-to`, `Architecture`, `Me` | the project notes | yes |
| `Settings` | how the service talks to the model, embeddings and users | yes - used from the next question |
| `Catalog/` | **the catalog**: a note per domain (access, rules, metrics, examples, tables) and per table (synonyms, columns, links), the rules for every question, the query bank | yes - used from the next question ([[How-to#Edit the catalog]]) |
| `Inbox/Review/` | answered questions to tick ✅/❌ and failed questions, written by the service | [[How-to#Review answers]] (not in git) |
| `Inbox/System check.md`, `Inbox/Benchmark.md` | the system testing itself; the last benchmark | read; fix what they list (not in git) |

Who sees what: tables per AD group under *Who may see it* in each domain note (e.g. [[sales]]);
`IT - Data`, `IT - Security`, `NLSQL-Full` = every table, `NLSQL-<domain>` = that domain plus the shared tables it
needs. Other rights (error details, review notes, benchmark data) in [[Settings]]. Group names exactly as in AD.

Rules: link tables as `[[Fact_Sales]]`; no passwords, connection strings or users' personal data (the vault is in git).

## Open items
Tick them off and note the commit that closes each one.

- [ ] Deploy the `text2sql` service - [[How-to#Deploy]] (`.env`, `db verify`, `values refresh`, Open WebUI connection)
- [ ] Deploy the guard fix to the old n8n workflow too while it still serves users (4d24559): re-import it
- [ ] Confirm which Qwen 32B runs behind `/combine`; set temperature and context length - [[How-to#LLM settings]]
- [ ] Read `Inbox/System check.md` with embeddings on; record "with embeddings" below
- [ ] `tx db examples`: fix failing examples in [[Query bank]], mark good ones `verified`
- [ ] Confirm the `Dim_Date` join works (the 4 `date_b*` examples in the bank check it)
- [ ] End-to-end benchmark with Qwen 32B (`tx benchmark e2e`); record `byFailureType` below
- [ ] DBA: create `NLSQL_AuditLog` and an INSERT-only login; set `TEXT2SQL_AUDIT_DB`
- [ ] Every week: tick ✅/❌, `tx learn` - [[How-to#Review answers]]; grow the benchmark to 150-300 real questions
- [ ] Resolve the 21 catalog warnings (review flags, missing synonyms) with the domain experts (`tx validate`)
- [ ] After a week on `text2sql`: remove the legacy n8n stack (`n8n_workflows/`, `scripts/`, `catalog/`, `tests/*.js`,
      `package.json`, the `legacy` services in `docker-compose.yml`)
- [ ] Later: conversation history; column pruning for very wide tables; several SQL candidates + selection
- [x] The service reads Obsidian directly - Python, SOLID, same answers as the n8n workflow (2 000+ golden cases)
- [x] Webhook authentication: API key (`TEXT2SQL_API_KEY`); identity from Open WebUI's forwarded e-mail
- [x] Value index read from the database by the service (no more SSMS + CSV); `db verify` / `db examples` as commands
- [x] Three ways to read tables outside the prompt closed in the SQL guard (4d24559)
- [x] Review loop: ✅/❌ in Obsidian instead of writing gold SQL (034b34a)
- [x] Meaning score relative to the question - no numbers to tune; plain reasons per table (8ce2fbf)
- [x] Persian calendar `Dim_Date` shared by every domain (7a1ebeb)

## Results
One row per benchmark run.

| Date | Set | Keyword only | With embeddings | Note |
|---|---|---|---|---|
| 2026-10 | questions.json (36 retrieval) | 36/36 | 36/36 | catalog wording |
| 2026-10 | paraphrase_questions.json | 7/20 | 12/20 | multilingual-e5 as stand-in for bge-m3 |
| 2026-10 | join_path_questions.json | 9/14 -> 12/14 | - | before -> after join-path completion |
| 2026-10-11 | all three, Python service | 36/36, 7/20, 12/14 | not measured yet | same as n8n; "with embeddings" from `Inbox/System check.md` |

## Where things are in the repo
| Piece | Where |
|---|---|
| The service | `text2sql/` (Python) - `python -m text2sql serve`, Docker service `text2sql` |
| Knowledge | `obsidian/Catalog/`, `obsidian/Settings.md` |
| Secrets | `.env` on the server only (`.env.example` shows what) |
| Caches | `data/` - embeddings and the value index (real data), not in git |
| Benchmarks | `benchmark/02/*.json` (`confirmed.json` = answers approved in Obsidian) |
| Tests | `tests/py/` - `python -m pytest` |
| Legacy (until removed) | `n8n_workflows/`, `scripts/`, `catalog/*.json`, `tests/*.test.js` |
