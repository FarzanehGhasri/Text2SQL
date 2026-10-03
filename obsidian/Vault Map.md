---
type: meta
updated: 2026-10-03
tags: [meta]
---
# Vault Map

> Where everything lives in this vault. The vault is the `obsidian/` folder of the Text2SQL repo,
> so it is versioned with the code.

## Folders

| Folder | What goes there | Who writes it |
|---|---|---|
| `/` (root) | [[Home]], [[Me]], [[Vault Map]], [[Skill Map]], `CLAUDE.md` | me |
| `Projects/Text2SQL/` | [[Text2SQL]] (status, open items, results) and [[Architecture]] (how it works and why) | me |
| `Runbooks/` | Step-by-step procedures: deploy, benchmark, n8n integration | me |
| `Catalog/<domain>/` | **Generated** - one note per table + one per domain, from `catalog/*.json` | `scripts/export-catalog-to-obsidian.js` |
| `Catalog Notes/` | My own notes about tables/columns: business meaning, answers from domain experts | me |
| `Inbox/` | Quick notes to sort later. `Inbox/n8n/` = failed questions written by n8n (not in git) | me, n8n |
| `Daily/` | Daily notes `YYYY-MM-DD` (optional) | me |

## Rules
1. **Never edit `Catalog/`** - it is overwritten on export. Change `catalog/*.json`, run the
   exporter, and write commentary in `Catalog Notes/` linking to the table, e.g. `[[Fact_Invoice]]`.
2. **Link, don't copy.** Table names are note names: `[[Fact_Sales]]`, domains: `[[procurement]]`.
3. **Inbox is temporary.** Each week, move notes out of `Inbox/` or delete them.
4. **Language:** Persian for explanations and domain meaning, English for identifiers, SQL and commands.
5. **No secrets** (passwords, connection strings, API keys, real users' personal data) - the vault is in git.

## Properties (frontmatter)

| Property | Values |
|---|---|
| `type` | `table`, `domain`, `runbook`, `failed-question`, `meta`, `profile`, `project` |
| `status` | `open`, `done` |
| `domain` | `sales`, `procurement`, `treasury`, `hr`, `bom`, `inventory_docs`, `common` |
| `tags` | `catalog`, `domain/<x>`, `core`, `needs-review`, `meta` |

## Links
[[Home]] · [[Me]] · [[Skill Map]]
