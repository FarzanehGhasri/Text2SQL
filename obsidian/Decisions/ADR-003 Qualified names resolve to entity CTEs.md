---
type: adr
status: accepted
branch: rhk_branch_05
date: 2026-10
tags: [adr, security]
---
# ADR-003 Qualified names resolve to entity CTEs

## Context
Security wrapped allowed tables in CTEs, but a qualified name such as `[dbo].[Fact_Sales]` bypassed the CTE and
reached the physical table: an HR-only user could read sales data, and 19 entity names collide with older
physical tables on the new server.

## Decision
Every table reference, qualified (`dbo.X`, `[dbo].[X]`, `db.dbo.X`) or not, is rewritten to the user's entity CTE.
References to tables that are not allowed entities are rejected, and a model CTE named like a catalog
entity (which could shadow it) is rejected too.

## Consequences
- The only data a query can reach is what the CTEs expose (allowed entities, exposed columns).
- Covered by tests in `tests/security.test.js`; the DB login stays read-only as a second line of defence.
