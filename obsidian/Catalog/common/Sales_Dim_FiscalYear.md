---
type: table
domain: common
source: "[dbo].[Dim_FiscalYear]"
synonyms:
  - "سال مالی"
tags: [catalog, domain/common]
---
> سال‌های مالی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `FiscalYear_Key` | udt_surrogate_key | کلید سال‌های مالی | yes |
| `FiscalYearID` | bigint | شناسه سال مالی | hidden |
| `Title` | int | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
