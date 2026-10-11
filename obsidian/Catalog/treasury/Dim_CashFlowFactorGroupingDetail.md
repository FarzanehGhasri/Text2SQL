---
type: table
domain: treasury
source: "[TRE].[Dim_CashFlowFactorGroupingDetail]"
synonyms: []
tags: [catalog, domain/treasury]
---
> جزئیات گروه‌بندی عوامل جریان نقدی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `CashFlowFactorGroupingDetail_Key` | udt_surrogate_key | کلید جزئیات گروه‌بندی عوامل جریان نقدی | yes |
| `CashFlowFactorGroupingDetailID` | bigint | شناسه نقد جریان فاکتور گروه‌بندی جزئیات | hidden |
| `Code` | nvarchar | کد | yes |
| `Title` | nvarchar | عنوان | yes |
| `ParentRef` | bigint |  | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
