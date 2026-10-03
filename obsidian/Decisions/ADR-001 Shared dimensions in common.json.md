---
type: adr
status: accepted
branch: rhk_branch_04
date: 2026-09
tags: [adr]
---
# ADR-001 Shared dimensions in common.json

## Context
Several domain catalogs each carried their own copy of the same dimensions (customer, product, person, …).
Copies drifted, the prompt contained duplicates, and a fix had to be made in several files.

## Decision
The 7 dimensions used by more than one domain live once in `catalog/common.json` (`shared: true`),
granted to the sales, procurement, treasury, Full and IT groups. Domain catalogs reference them by name in `joins`.

## Consequences
- One place to change a shared table; the validator checks cross-catalog joins.
- A shared dimension alone must not activate a domain in routing (score must come from the domain's own tables).
- See [[common]] for the tables.
