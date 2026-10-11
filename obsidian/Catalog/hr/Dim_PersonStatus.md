---
type: table
domain: hr
source: "[HR].[Dim_PersonStatus]"
synonyms:
  - "وضعیت پرسنل"
  - "شاغل"
tags: [catalog, domain/hr]
---
> وضعیت پرسنلی (شاغل، بازنشسته...)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PersonStatus_Key` | udt_surrogate_key | کلید وضعیت پرسنلی | yes |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
