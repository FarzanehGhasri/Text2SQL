---
type: table
domain: procurement
source: "[RPT].[Fact_UnionReport]"
synonyms:
  - "گزارش ترکیبی"
tags: [catalog, domain/procurement]
---
> گزارش ترکیبی اسناد خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `ID` | bigint | شناسه | yes |
| `EntityRef` | bigint | مرجع موجودیت | yes |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `SupplierRef` | bigint | مرجع تامین‌کننده | yes |
| `PurchaseItemCode` | nvarchar | کد کالای خرید | yes |
| `PurchasingAgentRef` | bigint | مرجع کارشناس خرید | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `UnitRef` | bigint | مرجع واحد | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
