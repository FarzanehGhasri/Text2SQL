---
type: table
domain: procurement
source: "[PRC].[Dim_PayState]"
synonyms:
  - "وضعیت پرداخت"
tags: [catalog, domain/procurement]
---
> وضعیت‌های پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PayState_Key` | int | کلید وضعیت‌های پرداخت | yes |
| `PayState_Title` | nvarchar | وضعیت عنوان پرداخت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
