---
type: table
domain: treasury
source: "[TRE].[Dim_Ledger]"
synonyms:
  - "دفتر"
  - "دفتر حسابداری"
tags: [catalog, domain/treasury]
---
> دفاتر حسابداری

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Ledger_Key` | udt_surrogate_key | کلید دفاتر حسابداری | yes |
| `LedgerID` | bigint | شناسه دفتر | hidden |
| `Code` | int | کد | yes |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
