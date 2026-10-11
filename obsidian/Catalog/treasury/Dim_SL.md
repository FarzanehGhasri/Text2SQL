---
type: table
domain: treasury
source: "[TRE].[Dim_SL]"
synonyms:
  - "معین"
  - "حساب معین"
tags: [catalog, domain/treasury]
---
> حساب‌های معین

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `SL_Key` | udt_surrogate_key | کلید حساب‌های معین | yes |
| `SLID` | nvarchar | شناسه معین | hidden |
| `Code` | nvarchar | کد | yes |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
