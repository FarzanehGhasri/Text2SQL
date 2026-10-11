---
type: table
domain: procurement
source: "[PRC].[Fact_Delivery_2]"
synonyms:
  - "تحویل خرید"
  - "تحویل از تامین کننده"
tags: [catalog, domain/procurement]
---
> اقلام تحویل کالا از تامین‌کننده

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DeliveryItemID` | bigint | شناسه قلم تحویل | hidden |
| `DeliveryRef` | bigint | مرجع تحویل | yes |
| `Number` | nvarchar | شماره سند | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `DeliveryDate` | datetime | تاریخ تحویل | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
