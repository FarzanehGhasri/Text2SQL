---
type: table
domain: procurement
source: "[PRC].[Fact_Inquiry_2]"
synonyms:
  - "استعلام"
  - "استعلام بها"
tags: [catalog, domain/procurement, needs-review]
---
> اقلام استعلام بها از تامین‌کنندگان

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InquiryItemID` | bigint | شناسه قلم استعلام | hidden |
| `InquiryRef` | bigint | مرجع استعلام | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Number` | nvarchar | شماره سند | yes |
| `InquiryDate` | datetime | تاریخ استعلام | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده، 8=دستور شده | review |
| `PurchasingDepartment_key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده، 8=دستور شده | review |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `PurchasingDepartment_key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
