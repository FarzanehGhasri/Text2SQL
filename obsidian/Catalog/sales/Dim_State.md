---
type: table
domain: sales
source: "[dbo].[Dim_State]"
synonyms:
  - "وضعیت سفارش"
tags: [catalog, domain/sales]
---
> وضعیت‌های اقلام سفارش

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `State_Key` | udt_surrogate_key | کلید وضعیت‌های اقلام سفارش | yes |
| `StateCode` | int | وضعیت کد | yes |
| `StateName` | nvarchar | وضعیت نام | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
