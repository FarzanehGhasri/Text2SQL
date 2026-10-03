---
type: meta
updated: 2026-10-03
tags: [meta]
---
# Vault Map

> Where everything lives in this vault, what each folder is for, and the rules for adding notes.
> Read this before creating or moving a note. The vault is the `obsidian/` folder of the
> Text2SQL repo, so it is versioned with the code on every `rhk_branch_NN`.

## Folders

| Folder | What goes there | Who writes it |
|---|---|---|
| `/` (root) | [[Home]], [[Me]], [[Vault Map]], [[Skill Map]], `CLAUDE.md` | me |
| `Projects/Text2SQL/` | Project overview, status, architecture, open items | me |
| `Decisions/` | Architecture decision records: `ADR-NNN <title>.md` | me (template: `Templates/ADR`) |
| `Runbooks/` | Step-by-step procedures: deploy, benchmark, integrations | me |
| `Catalog/<domain>/` | **Generated** - one note per table + one per domain, from `catalog/*.json` | `scripts/export-catalog-to-obsidian.js` |
| `Catalog Notes/` | My own notes about tables/columns: business meaning, expert answers, ideas | me |
| `Benchmarks/` | One note per benchmark run (template: `Templates/Benchmark Run`) | me, or n8n |
| `Inbox/` | Unsorted notes; notes written automatically by n8n (failed questions, run summaries) | me, n8n |
| `Daily/` | Daily notes `YYYY-MM-DD` (template: `Templates/Daily`) | me |
| `Templates/` | Note templates (core Templates plugin) | me |
| `Attachments/` | Images, screenshots, exported files | Obsidian |

## Rules
1. **Never edit `Catalog/`** - it is overwritten on export. Change `catalog/*.json`, run the
   exporter, and write commentary in `Catalog Notes/` linking to the table, e.g. `[[Fact_Invoice]]`.
2. **Link, don't copy.** Table names are note names: `[[Fact_Sales]]`, domains: `[[procurement]]`.
3. **Inbox is temporary.** Each week, move notes out of `Inbox/` (to a project, decision, catalog
   note) or delete them.
4. **One decision = one ADR.** If a choice affects code or data and could be questioned later, write it down.
5. **Language:** Persian for explanations and domain meaning, English for identifiers, SQL and commands.
   Turn on right-to-left in *Settings → Editor* for Persian notes if needed.
6. **No secrets** (passwords, connection strings, API keys, real users' personal data) - the vault is in git.

## Properties (frontmatter) used

| Property | Values | Used in |
|---|---|---|
| `type` | `table`, `domain`, `adr`, `runbook`, `benchmark`, `failed-question`, `daily`, `meta`, `profile`, `project` | every note |
| `status` | `open`, `done`, `proposed`, `accepted`, `superseded` | ADRs, failed questions, open items |
| `domain` | `sales`, `procurement`, `treasury`, `hr`, `bom`, `inventory_docs`, `common` | table / domain / failed-question notes |
| `branch` | `rhk_branch_NN` | ADRs, benchmark runs |
| `tags` | `catalog`, `domain/<x>`, `core`, `needs-review`, `meta` | anywhere |

## Generated vs hand-written
- Generated: `Catalog/**` (by the exporter) and anything n8n writes into `Inbox/`.
- Everything else is hand-written.

## Links
[[Home]] · [[Me]] · [[Skill Map]]
