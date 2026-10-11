---
type: table
domain: common
source: "[TRE].[Dim_Currency]"
synonyms:
  - "ارز"
  - "واحد پول"
tags: [catalog, domain/common]
---
> ارزها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Currency_Key` | udt_surrogate_key | کلید ارزها | yes |
| `CurrencyID` | bigint | شناسه ارز | hidden |
| `Title` | nvarchar | عنوان | yes |
| `Title_En` | nvarchar | عنوان انگلیسی | yes |
| `Unit` | int | واحد | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
