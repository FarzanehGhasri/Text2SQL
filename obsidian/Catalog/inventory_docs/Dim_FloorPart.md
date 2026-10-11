---
type: table
domain: inventory_docs
source: "[NTSW].[Dim_FloorPart]"
synonyms:
  - "طبقه کالا"
tags: [catalog, domain/inventory_docs]
---
> طبقات کالا

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RecId` | int | شناسه رکورد | hidden |
| `Title` | nvarchar | عنوان | yes |
| `InsertedDate` | datetime | تاریخ درج در ورهاوس | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
