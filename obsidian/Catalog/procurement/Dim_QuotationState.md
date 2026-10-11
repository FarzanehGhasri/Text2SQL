---
type: table
domain: procurement
source: "[PRC].[Dim_QuotationState]"
synonyms:
  - "وضعیت پیش فاکتور"
tags: [catalog, domain/procurement]
---
> وضعیت‌های پیش‌فاکتور

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `QuotationState_Key` | udt_surrogate_key | کلید وضعیت‌های پیش‌فاکتور | yes |
| `QuotationStateID` | bigint | شناسه وضعیت پیش‌فاکتور | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
