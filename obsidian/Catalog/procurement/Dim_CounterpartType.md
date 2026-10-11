---
type: table
domain: procurement
source: "[PRC].[Dim_CounterpartType]"
synonyms:
  - "نوع طرف مقابل"
tags: [catalog, domain/procurement]
---
> انواع طرف مقابل

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `CounterpartType_Key` | udt_surrogate_key | کلید انواع طرف مقابل | yes |
| `CounterpartID` | int | شناسه طرف مقابل | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
