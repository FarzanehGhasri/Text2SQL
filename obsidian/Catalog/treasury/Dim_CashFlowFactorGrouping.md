---
type: table
domain: treasury
source: "[TRE].[Dim_CashFlowFactorGrouping]"
synonyms:
  - "گروه جریان نقدی"
tags: [catalog, domain/treasury]
---
> گروه‌بندی عوامل جریان نقدی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `CashFlowFactorGrouping_Key` | udt_surrogate_key | کلید گروه‌بندی عوامل جریان نقدی | yes |
| `CashFlowFactorGroupingID` | bigint | شناسه نقد جریان فاکتور گروه‌بندی | hidden |
| `Code` | nvarchar | کد | yes |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
