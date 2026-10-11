---
type: table
domain: procurement
source: "[PRC].[Dim_PurchasingDepartment]"
synonyms:
  - "واحد خرید"
  - "دپارتمان خرید"
tags: [catalog, domain/procurement]
---
> واحدهای خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید واحدهای خرید | yes |
| `PurchasingDepartmentID` | bigint | شناسه واحد خرید | hidden |
| `Number` | int | شماره سند | yes |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
