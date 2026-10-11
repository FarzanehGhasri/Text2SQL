---
type: table
domain: procurement
source: "[PRC].[Dim_PurchaseMethod]"
synonyms:
  - "روش خرید"
  - "رویه خرید"
tags: [catalog, domain/procurement]
---
> روش‌های خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseMethod_Key` | udt_surrogate_key | کلید روش‌های خرید | yes |
| `PurchaseMethodName` | nvarchar | نام خرید روش | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
