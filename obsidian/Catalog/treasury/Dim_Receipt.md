---
type: table
domain: treasury
source: "[TRE].[Dim_Receipt]"
synonyms:
  - "دریافت"
  - "رسید دریافت"
tags: [catalog, domain/treasury]
---
> دریافت‌ها (سرآیند)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Receipt_Key` | udt_surrogate_key | کلید دریافت‌ها | yes |
| `ReceiptID` | bigint | شناسه دریافت | hidden |
| `Date` | datetime | تاریخ | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
