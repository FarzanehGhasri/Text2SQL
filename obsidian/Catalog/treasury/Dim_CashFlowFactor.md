---
type: table
domain: treasury
source: "[TRE].[Dim_CashFlowFactor]"
synonyms:
  - "عامل جریان نقدی"
tags: [catalog, domain/treasury]
---
> عوامل جریان نقدی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `CashFlowFactor_Key` | udt_surrogate_key | کلید عوامل جریان نقدی | yes |
| `CashFlowFactorID` | bigint | شناسه نقد جریان فاکتور | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Name` | nvarchar | نام | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
