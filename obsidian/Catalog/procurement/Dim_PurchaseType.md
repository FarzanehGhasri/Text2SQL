---
type: table
domain: procurement
source: "[PRC].[Dim_PurchaseType]"
synonyms:
  - "نوع خرید"
tags: [catalog, domain/procurement]
---
> انواع خرید (داخلی، خارجی...)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseType_Key` | udt_surrogate_key | کلید انواع خرید | yes |
| `PurchaseTypeID` | int | شناسه نوع خرید | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
