---
type: table
domain: procurement
source: "[PRC].[Fact_Purchase_2]"
core: true
synonyms:
  - "خرید"
  - "زنجیره خرید"
  - "فرایند خرید"
tags: [catalog, domain/procurement, core, needs-review]
---
> زنجیره خرید: درخواست، دستور خرید و سفارش هر قلم در یک ردیف

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseRequestItemRef` | bigint | مرجع قلم درخواست خرید | yes |
| `PurchaseRequestRef` | bigint | مرجع درخواست خرید | yes |
| `PurchaseOrderItemID` | bigint | شناسه قلم سفارش خرید | hidden |
| `PurchaseOrderRef` | bigint | مرجع سفارش خرید | yes |
| `Number_PO` | nvarchar | شماره دستور خرید | yes |
| `Number_PR` | nvarchar | شماره درخواست خرید | yes |
| `OrderItemID` | bigint | شناسه قلم سفارش | hidden |
| `OrderRef` | bigint | مرجع سفارش (برای شمارش سفارش‌ها) | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `Supplier_Key_O` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `OrderDate` | datetime | تاریخ سفارش | yes |
| `RequestDate` | datetime | تاریخ درخواست | yes |
| `DemandDate` | datetime | تاریخ نیاز | yes |
| `RequestingCenter_Key` | udt_surrogate_key | کلید مرکز درخواست‌کننده (کدام جدول بعد؟) | review |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `Quantity_PR` | decimal | مقدار درخواست خرید | yes |
| `Quantity_PO` | decimal | مقدار دستور خرید | yes |
| `Fee_PO` | decimal | دستور خرید نرخ واحد | yes |
| `Price_PO` | decimal | مبلغ دستور خرید | yes |
| `Additions_PO` | decimal | دستور خرید اضافات | yes |
| `Deductions_PO` | decimal | دستور خرید کسورات | yes |
| `NetPrice_PO` | decimal | مبلغ دستور خرید خالص | yes |
| `Quantity_O` | decimal | مقدار سفارش | yes |
| `Fee_O` | decimal | سفارش نرخ واحد | yes |
| `Price_O` | decimal | مبلغ سفارش | yes |
| `Additions_O` | decimal | سفارش اضافات | yes |
| `Deductions_O` | decimal | سفارش کسورات | yes |
| `NetPrice_O` | decimal | مبلغ سفارش خالص | yes |
| `State_PO` | int | کد وضعیت دستور خرید: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `State_O` | int | کد وضعیت سفارش: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `State_PR` | int | کد وضعیت درخواست خرید: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `PurchaseType_Key` | udt_surrogate_key | کلید اتصال به انواع خرید | yes |
| `CounterpartType_Key` | udt_surrogate_key | کلید اتصال به انواع طرف مقابل | yes |
| `UserPurchasetype_Key` | udt_surrogate_key | کلید اتصال به انواع خرید کاربر | yes |
| `PurchaseRequestType_Key` | udt_surrogate_key | کلید اتصال به انواع درخواست خرید | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Supplier_Key_O` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
- `PurchaseType_Key` → [[Dim_PurchaseType]] `PurchaseType_Key` (inferred)
- `CounterpartType_Key` → [[Dim_CounterpartType]] `CounterpartType_Key` (inferred)
- `UserPurchasetype_Key` → [[Procurement_Dim_UserPurchaseType]] `UserPurchaseType_Key` (inferred)
- `PurchaseRequestType_Key` → [[Procurement_Dim_PurchaseRequestType]] `PurchaseRequestType_Key` (inferred)
