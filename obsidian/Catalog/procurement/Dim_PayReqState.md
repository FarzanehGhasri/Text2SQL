---
type: table
domain: procurement
source: "[PRC].[Dim_PayReqState]"
synonyms: []
tags: [catalog, domain/procurement]
---
> وضعیت‌های درخواست پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PayReqState_Key` | int | کلید وضعیت‌های درخواست پرداخت | yes |
| `PayReqState_Title` | nvarchar | عنوان وضعیت درخواست پرداخت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
