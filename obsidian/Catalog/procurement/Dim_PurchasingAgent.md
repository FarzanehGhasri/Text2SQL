---
type: table
domain: procurement
source: "[PRC].[Dim_PurchasingAgent_2]"
synonyms:
  - "کارشناس خرید"
  - "مسئول خرید"
  - "خریدار"
tags: [catalog, domain/procurement]
---
> کارشناسان خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchasingAgent_Key` | udt_surrogate_key | کلید کارشناسان خرید | yes |
| `PurchasingAgentID` | bigint | شناسه کارشناس خرید | hidden |
| `PartyRef` | bigint | مرجع طرف حساب | yes |
| `FirstName` | nvarchar | نام | yes |
| `FullName` | nvarchar | نام کامل | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
