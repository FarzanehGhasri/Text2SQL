---
type: adr
status: accepted
branch: rhk_branch_04
date: 2026-09
tags: [adr]
---
# ADR-002 Domain routing in BuildPrompt

## Context
With 6 catalogs (152 tables) the prompt no longer fits if every allowed table is sent, and unrelated tables
confuse the model.

## Decision
- Score each domain by its best entities; keep at most `MAX_DOMAINS = 3`, each with score > 0 and
  at least `DOMAIN_RATIO = 0.6` of the best domain.
- Inside the chosen domains pick the top tables, then add the join closure (`from -> to` only).
- Pack the whole prompt within `MAX_PROMPT_CHARS = 17000`.
- `MAX_DOMAINS` started at 2 and was raised to 3 because mixed questions lost the sales domain.

## Consequences
- Prompt size is bounded regardless of catalog growth.
- A table missing from the prompt is usually a synonym problem -> fix it in the catalog, not in code
  (see *Add synonyms from a failed question* in [[Skill Map]]).
