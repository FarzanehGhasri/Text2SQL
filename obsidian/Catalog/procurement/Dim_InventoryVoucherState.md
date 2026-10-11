---
type: table
domain: procurement
source: "[PRC].[Dim_InventoryVoucherState]"
synonyms:
  - "وضعیت رسید"
tags: [catalog, domain/procurement]
---
> وضعیت‌های رسید انبار

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InventoryVoucherState_Key` | udt_surrogate_key | کلید وضعیت‌های رسید انبار | yes |
| `ID` | bigint | شناسه | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
