---
type: table
domain: procurement
source: "[PRC].[Dim_InvoiceState]"
synonyms:
  - "وضعیت فاکتور"
tags: [catalog, domain/procurement]
---
> وضعیت‌های فاکتور

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InvoiceState_Key` | udt_surrogate_key | کلید وضعیت‌های فاکتور | yes |
| `InvoiceStateID` | bigint | شناسه وضعیت فاکتور | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
