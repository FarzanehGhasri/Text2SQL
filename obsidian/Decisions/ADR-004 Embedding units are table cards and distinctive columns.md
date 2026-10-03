---
type: adr
status: accepted
branch: rhk_branch_05
date: 2026-10
tags: [adr, retrieval]
---
# ADR-004 Embedding units are table cards and distinctive columns

## Context
Descriptions mix Persian and English. Splitting the catalog into fixed-size chunks would cut tables apart;
embedding every column produced many near-identical vectors (`Date_Key`, "کد مشتری", …) that matched any question.

## Decision
- One **table card** per entity: name, Persian description, synonyms and the descriptions of its distinctive columns.
- One vector per **distinctive column** (`column description — جدول: <table description>`).
  A column is generic if it is a key or its description appears in 3+ entities; generic columns get no vector.
- Column similarity = mean of the top 3 column similarities (`COLUMN_TOP_K`), then
  `max(table, column × discount)`.
- Sidecar format 3 with `itemsHash`; the indexer skips catalogs whose items did not change.

## Consequences
- Paraphrase benchmark: keyword-only 7/20 -> 12/20 with multilingual-e5 embeddings.
- Next step to evaluate: per-question score normalisation (reached 15/20 in an experiment, but must not break
  `lowConfidence`).
