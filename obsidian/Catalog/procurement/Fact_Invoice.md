---
type: table
domain: procurement
source: "[PRC].[Fact_Invoice_2]"
synonyms:
  - "فاکتور خرید"
  - "فاکتور تامین کننده"
tags: [catalog, domain/procurement]
---
> اقلام فاکتور خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InvoiceItemID` | bigint | شناسه قلم فاکتور | hidden |
| `InvoiceRef` | bigint | مرجع فاکتور | yes |
| `Number` | nvarchar | شماره سند | yes |
| `Price` | decimal | مبلغ (مقدار × نرخ) | yes |
| `InvoiceDate` | datetime | تاریخ فاکتور | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `Additions` | decimal | اضافات | yes |
| `Deductions` | decimal | کسورات | yes |
| `NetPrice` | decimal | مبلغ خالص پس از اضافات و کسورات | yes |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
