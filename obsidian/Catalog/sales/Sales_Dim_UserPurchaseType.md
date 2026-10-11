---
type: table
domain: sales
source: "[dbo].[Dim_UserPurchaseType]"
synonyms:
  - "نوع خرید"
tags: [catalog, domain/sales]
---
> انواع خرید کاربر

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `UserPurchaseType_Key` | udt_surrogate_key | کلید انواع خرید کاربر | yes |
| `UserPurchaseTypeID` | bigint | شناسه نوع خرید کاربر | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Title` | nvarchar | عنوان | yes |
| `PurchaseType` | int | نوع خرید | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
