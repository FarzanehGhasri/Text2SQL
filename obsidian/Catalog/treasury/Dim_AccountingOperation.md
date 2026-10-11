---
type: table
domain: treasury
source: "[TRE].[Dim_AccountingOperation]"
synonyms:
  - "عملیات حسابداری"
tags: [catalog, domain/treasury]
---
> عملیات حسابداری

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `AccountingOperation_Key` | udt_surrogate_key | کلید عملیات حسابداری | yes |
| `AccountingOperationID` | bigint | شناسه عملیات حسابداری | hidden |
| `Number` | bigint | شماره سند | yes |
| `Name` | nvarchar | نام | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
