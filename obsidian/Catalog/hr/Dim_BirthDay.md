---
type: table
domain: hr
source: "[HR].[Dim_BirthDay]"
synonyms:
  - "تولد"
  - "سن"
tags: [catalog, domain/hr]
---
> تاریخ تولد کارمندان

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Birth_Key` | udt_surrogate_key | کلید تاریخ تولد کارمندان | yes |
| `personelyCode` | int | کد پرسنلی | yes |
| `BirthDate` | datetime | تاریخ تولد | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
