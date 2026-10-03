---
type: runbook
updated: 2026-10-03
tags: [runbook, benchmark]
---
# Run the benchmark

## 1. Retrieval, offline (no LLM, no database) - minutes
```bash
node scripts/benchmark-retrieval.js                                              # keyword scoring, 44 questions
node scripts/benchmark-retrieval.js --questions benchmark/02/paraphrase_questions.json
node scripts/benchmark-retrieval.js --questions benchmark/02/join_path_questions.json   # tables linked only through another table
# with the real embeddings, inside Docker:
docker compose run --rm indexer node scripts/benchmark-retrieval.js --embed-url http://embeddings:80/embed
```
Each `FAIL` line names the table that did not reach the prompt -> usually a missing synonym.

## 2. End to end, in n8n
1. Import `n8n_workflows/Text-to-SQL Benchmark-02.json`.
2. Set the Microsoft SQL credential on "Run Gold SQL" (same read-only login).
3. The email in "Call Webhook" must belong to an `IT - Data` member (eval mode is off for anyone else).
4. *Execute workflow*. "Summarize Results" gives accuracy per category and domain, plus failed ids with a reason.

## 3. Record it
Add a row to the *Results* table in [[Text2SQL]].

Back: [[Skill Map]]
