---
type: table
domain: procurement
source: "[PRC].[Dim_TransportType]"
synonyms:
  - "نوع حمل"
  - "روش حمل"
tags: [catalog, domain/procurement]
---
> انواع حمل

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `TransportType_Key` | udt_surrogate_key | کلید انواع حمل | yes |
| `TransportTypeName` | nvarchar | نوع نام حمل | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
