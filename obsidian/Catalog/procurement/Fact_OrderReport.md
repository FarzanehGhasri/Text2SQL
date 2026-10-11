---
type: table
domain: procurement
source: "[RPT].[Fact_OrderReport]"
synonyms:
  - "گزارش سفارش"
tags: [catalog, domain/procurement]
---
> گزارش اقلام سفارش خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `OrderItemID` | bigint | شناسه قلم سفارش | hidden |
| `OrderRef` | bigint | مرجع سفارش (برای شمارش سفارش‌ها) | yes |
| `Number` | nvarchar | شماره سند | yes |
| `OrderDate` | datetime | تاریخ سفارش | yes |
| `PurchaseItemRef` | bigint | مرجع کالای خرید | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `PurchaseItemCode` | nvarchar | کد کالای خرید | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `Price` | decimal | مبلغ (مقدار × نرخ) | yes |
| `PriceInOperationalCurrency` | decimal | مبلغ به ریال | yes |
| `Tolerance` | decimal | تلورانس مجاز | yes |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
