---
type: profile
updated: 2026-10-03
tags: [meta]
---
# Me

> Who I am and how I work - read by me, and by Claude (or any assistant) before it helps me,
> so answers fit my role, my environment and the way I like to work.
> Keep it short and current; edit it whenever something below stops being true.

## Who I am
- **Name:** _<your name>_
- **Role:** _<your title / team>_ - I build and run the NL-to-SQL assistant ([[Text2SQL]]) for our data warehouse.
- **Organisation context:** _<company / department; who the users of Text2SQL are>_

## What I'm working on now
- Text2SQL: Persian questions -> T-SQL on `SA_DataWarehouse`, through n8n, Open WebUI and a local LLM.
- Current branch: `rhk_branch_05` - see [[Text2SQL#Status]] for what is open.
- _<this month's goal, e.g. "deploy rhk_branch_05 and get the benchmark above 80%">_

## My environment
- Windows, Docker Desktop, `docker compose` (n8n, open-webui, TEI embeddings `bge-m3`, quickchart, indexer).
- SQL Server + SSMS; the n8n login on the warehouse is **read-only**.
- Access is by AD groups (`NLSQL-<domain>`, `NLSQL-Full`, `IT - Data`).
- Local LLM endpoint behind the n8n "request to LLM" node.

## How I like to work
- Explanations in **Persian**, step by step and detailed; code, commands, identifiers and commit messages in **English**.
- Every change: say **what** changed, **why**, and **how it was verified**.
- Follow **SOLID**; small single-purpose pieces; no behaviour change without tests.
- One git branch per change set (`rhk_branch_NN`); older branches stay frozen.
- Measure before deciding (benchmarks over opinions).

## What I don't want
- Changes I didn't ask for slipped in with others.
- Credentials, personal data or real user identities in the repo.
- _<add your own>_

## People and contacts
- DBA (audit table, logins): _<name>_
- AD / IT groups: _<name>_
- Domain experts who answer catalog review questions: _<names per domain>_

## Links
[[Vault Map]] · [[Skill Map]] · [[Home]]
