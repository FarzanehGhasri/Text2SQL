---
type: table
domain: hr
source: "[HR].[Dim_Vacation]"
synonyms:
  - "نوع مرخصی"
tags: [catalog, domain/hr]
---
> انواع مرخصی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Vacation_Key` | udt_surrogate_key | کلید انواع مرخصی | yes |
| `Id` | bigint | شناسه | hidden |
| `Name` | nvarchar | نام | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
