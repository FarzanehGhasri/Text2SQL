---
type: table
domain: procurement
source: "[RPT].[Fact_PurchaseOrderReport]"
synonyms:
  - "گزارش دستور خرید"
tags: [catalog, domain/procurement]
---
> گزارش اقلام دستور خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseOrderItemID` | bigint | شناسه قلم سفارش خرید | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `PurchaseItemRef` | bigint | مرجع کالای خرید | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `PurchaseItemCode` | nvarchar | کد کالای خرید | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Tolerance` | decimal | تلورانس مجاز | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `QuotationNumber` | nvarchar | شماره پیش‌فاکتور | yes |
| `QuotationDate` | datetime | تاریخ پیش‌فاکتور | yes |
| `Price` | decimal | مبلغ (مقدار × نرخ) | yes |
| `Additions` | decimal | اضافات | yes |
| `Deductions` | decimal | کسورات | yes |
| `NetPrice` | decimal | مبلغ خالص پس از اضافات و کسورات | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `PurchaseOrderDate` | datetime | تاریخ دستور خرید | yes |
| `PriceInOperationalCurrency` | decimal | مبلغ به ریال | yes |
| `OrderDate` | datetime | تاریخ سفارش | yes |
| `ContractNumber` | nvarchar | شماره قرارداد | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
