---
type: table
domain: sales
source: "[dbo].[Dim_SeasonDiscount]"
synonyms:
  - "تخفیف فصلی"
  - "تخفیف"
tags: [catalog, domain/sales]
---
> تخفیف‌های فصلی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Season_Key` | udt_surrogate_key | کلید تخفیف‌های فصلی | yes |
| `FromDate` | date | از تاریخ | yes |
| `ToDate` | date | تا تاریخ | yes |
| `DiscountRate` | decimal | درصد تخفیف | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
