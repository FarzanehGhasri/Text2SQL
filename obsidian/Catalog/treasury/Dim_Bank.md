---
type: table
domain: treasury
source: "[TRE].[Dim_Bank]"
synonyms:
  - "بانک"
tags: [catalog, domain/treasury]
---
> بانک‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Bank_Key` | udt_surrogate_key | کلید بانک‌ها | yes |
| `BankID` | bigint | شناسه بانک | hidden |
| `BankName` | nvarchar | نام بانک | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
