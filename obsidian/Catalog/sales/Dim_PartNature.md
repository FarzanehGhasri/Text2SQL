---
type: table
domain: sales
source: "[dbo].[Dim_PartNature]"
synonyms:
  - "ماهیت کالا"
  - "نوع کالا"
tags: [catalog, domain/sales]
---
> ماهیت کالا (مواد اولیه، نیم‌ساخته، محصول...)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PartNatureID` | int | شناسه ماهیت کالا | yes |
| `PartNatureTitle` | nvarchar | عنوان ماهیت کالا | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
