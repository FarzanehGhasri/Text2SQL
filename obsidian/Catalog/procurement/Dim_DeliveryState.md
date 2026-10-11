---
type: table
domain: procurement
source: "[PRC].[Dim_DeliveryState]"
synonyms:
  - "وضعیت تحویل"
tags: [catalog, domain/procurement]
---
> وضعیت‌های تحویل

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DeliveryState_Key` | udt_surrogate_key | کلید وضعیت‌های تحویل | yes |
| `DeliveryStateID` | bigint | شناسه وضعیت تحویل | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
