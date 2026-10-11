---
type: table
domain: hr
source: "[HR].[Dim_Job]"
synonyms:
  - "شغل"
tags: [catalog, domain/hr]
---
> شغل‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Job_Key` | udt_surrogate_key | کلید شغل‌ها | yes |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
