---
type: table
domain: procurement
source: "[PRC].[Dim_PaymentRefType]"
synonyms: []
tags: [catalog, domain/procurement]
---
> انواع مرجع پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RefType_Key` | int | کلید انواع مرجع پرداخت | yes |
| `RefType_Title` | nvarchar | مرجع نوع عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
