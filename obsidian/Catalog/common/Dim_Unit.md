---
type: table
domain: common
source: "[dbo].[Dim_Unit]"
synonyms:
  - "واحد"
  - "واحد شمارش"
tags: [catalog, domain/common]
---
> واحدهای اندازه‌گیری

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Unit_key` | udt_surrogate_key | کلید واحدهای اندازه‌گیری | yes |
| `UnitID` | bigint | شناسه واحد | hidden |
| `UnitName` | nvarchar | نام واحد | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
