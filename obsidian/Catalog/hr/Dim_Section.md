---
type: table
domain: hr
source: "[HR].[Dim_Section]"
synonyms:
  - "قسمت"
tags: [catalog, domain/hr]
---
> قسمت‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Section_Key` | udt_surrogate_key | کلید قسمت‌ها | yes |
| `tp_ID` | int |  | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
