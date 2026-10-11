---
type: table
domain: procurement
source: "[RPT].[Fact_InquiryReport]"
synonyms:
  - "گزارش استعلام"
tags: [catalog, domain/procurement]
---
> گزارش اقلام استعلام

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InquiryItemID` | bigint | شناسه قلم استعلام | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `InquiryDate` | datetime | تاریخ استعلام | yes |
| `PurchaseItemRef` | bigint | مرجع کالای خرید | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `PurchaseItemCode` | nvarchar | کد کالای خرید | yes |
| `EntityUnitRef` | bigint | مرجع واحد سازمانی | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `QuotationItemCount` | int | تعداد پیش‌فاکتور دریافتی | yes |
| `InquiryDeadLineDate` | datetime | مهلت استعلام | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
