---
type: table
domain: treasury
source: "[TRE].[Dim_Payment]"
synonyms:
  - "پرداخت"
tags: [catalog, domain/treasury]
---
> پرداخت‌ها (سرآیند)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Payment_Key` | udt_surrogate_key | کلید پرداخت‌ها | yes |
| `PaymentID` | bigint | شناسه پرداخت | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `Descreption` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
