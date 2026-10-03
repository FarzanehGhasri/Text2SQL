---
type: failed-question
status: open
date: {{date}}
domain: 
tags: [failed-question]
---
# {{title}}

**Question:** 
**Expected table(s):** [[ ]]
**Tables in the prompt:** 

## Diagnosis
- [ ] Wrong table -> add synonym to `catalog/<domain>.json`
- [ ] Right table, wrong SQL -> hint or example
- [ ] Security rejected a valid query -> test case in `tests/security.test.js`
- [ ] Really not supported -> close

## Fix
Commit / branch: 
Added to `benchmark/02/paraphrase_questions.json`: yes / no
