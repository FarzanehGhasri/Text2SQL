---
type: table
domain: procurement
source: "[PRC].[Dim_PayOrderState]"
synonyms: []
tags: [catalog, domain/procurement]
---
> وضعیت‌های دستور پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PayOrderState_Key` | int | کلید وضعیت‌های دستور پرداخت | yes |
| `PayOrderState_Title` | nvarchar | وضعیت عنوان سفارش پرداخت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
