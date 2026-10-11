---
type: table
domain: sales
source: "[dbo].[Dim_PurchaseRequestType]"
synonyms:
  - "نوع درخواست خرید"
tags: [catalog, domain/sales]
---
> انواع درخواست خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseRequestType_Key` | udt_surrogate_key | کلید انواع درخواست خرید | yes |
| `PurchaseRequestTypeId` | bigint | شناسه نوع درخواست خرید | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
