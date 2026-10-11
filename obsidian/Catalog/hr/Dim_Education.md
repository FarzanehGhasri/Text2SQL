---
type: table
domain: hr
source: "[HR].[Dim_Education]"
synonyms:
  - "تحصیلات"
  - "مدرک"
tags: [catalog, domain/hr]
---
> مدارک تحصیلی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Education_Key` | udt_surrogate_key | کلید مدارک تحصیلی | yes |
| `tp_ID` | int |  | hidden |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
