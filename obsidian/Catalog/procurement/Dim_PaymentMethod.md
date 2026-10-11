---
type: table
domain: procurement
source: "[PRC].[Dim_PaymentMethod]"
synonyms:
  - "روش پرداخت"
  - "نحوه پرداخت"
tags: [catalog, domain/procurement]
---
> روش‌های پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentMethod_Key` | udt_surrogate_key | کلید روش‌های پرداخت | yes |
| `PaymentMethodName` | nvarchar | نام پرداخت روش | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
