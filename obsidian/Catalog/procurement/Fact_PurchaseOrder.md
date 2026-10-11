---
type: table
domain: procurement
source: "[PRC].[Fact_PurchaseOrder_2]"
synonyms:
  - "دستور خرید"
tags: [catalog, domain/procurement]
---
> اقلام دستور خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseOrderItemID` | bigint | شناسه قلم سفارش خرید | hidden |
| `PurchaseOrderRef` | bigint | مرجع سفارش خرید | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `Price` | decimal | مبلغ (مقدار × نرخ) | yes |
| `Additions` | decimal | اضافات | yes |
| `Deductions` | decimal | کسورات | yes |
| `NetPrice` | decimal | مبلغ خالص پس از اضافات و کسورات | yes |
| `Number` | nvarchar | شماره سند | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `PurchaseOrderDate` | datetime | تاریخ دستور خرید | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
