---
type: table
domain: procurement
source: "[PRC].[Fact_Quotation_2]"
synonyms:
  - "پیش فاکتور"
  - "پیشنهاد قیمت"
tags: [catalog, domain/procurement]
---
> اقلام پیش‌فاکتور دریافتی از تامین‌کنندگان

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `QuotationItemID` | bigint | شناسه قلم پیش‌فاکتور | hidden |
| `QuotationRef` | bigint | مرجع پیش‌فاکتور | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `Price` | decimal | مبلغ (مقدار × نرخ) | yes |
| `Additions` | decimal | اضافات | yes |
| `Deductions` | decimal | کسورات | yes |
| `NetPrice` | decimal | مبلغ خالص پس از اضافات و کسورات | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده، 8=دستور شده | yes |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `QuotationDate` | datetime | تاریخ پیش‌فاکتور | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده، 8=دستور شده | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `PaymentMethod` | int | روش پرداخت | yes |
| `PurchaseMethod` | int | روش خرید | yes |
| `TransportType` | int | نوع حمل | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |
| `PurchaseRequestNumber` | nvarchar | شماره درخواست خرید | yes |
| `InquiryNumber` | nvarchar | شماره استعلام | yes |
| `EntityUnitRef` | int | مرجع واحد سازمانی | yes |
| `Number` | nvarchar | شماره سند | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
