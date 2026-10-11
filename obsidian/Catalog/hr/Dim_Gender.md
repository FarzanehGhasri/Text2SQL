---
type: table
domain: hr
source: "[HR].[Dim_Gender]"
synonyms:
  - "جنسیت"
  - "زن"
  - "مرد"
tags: [catalog, domain/hr]
---
> جنسیت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Gender_Key` | udt_surrogate_key | کلید جنسیت | yes |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
