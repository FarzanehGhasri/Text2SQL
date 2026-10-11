---
type: table
domain: treasury
source: "[TRE].[Dim_PaymentDeposit]"
synonyms:
  - "واریز پرداخت"
tags: [catalog, domain/treasury]
---
> واریزهای پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentDeposit_Key` | udt_surrogate_key | کلید واریزهای پرداخت | yes |
| `PaymentDepositID` | bigint | شناسه واریز پرداخت | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
