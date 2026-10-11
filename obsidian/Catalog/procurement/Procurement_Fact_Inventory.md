---
type: table
domain: procurement
source: "[PRC].[Fact_Inventory_2]"
synonyms:
  - "رسید و فاکتور"
  - "تطبیق خرید"
tags: [catalog, domain/procurement]
---
> پیوند رسید انبار، تحویل، سفارش و فاکتور خرید هر قلم

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InventoryVoucherItemID` | bigint | شناسه قلم سند موجودی | hidden |
| `InventoryVoucherRef` | bigint | مرجع سند موجودی | yes |
| `InventoryVoucherNumber` | nvarchar | شماره سند موجودی | yes |
| `DeliveryItemID` | bigint | شناسه قلم تحویل | hidden |
| `DeliveryRef` | bigint | مرجع تحویل | yes |
| `DeliveryDate` | datetime | تاریخ تحویل | yes |
| `OrderItemID` | bigint | شناسه قلم سفارش | hidden |
| `OrderRef` | bigint | مرجع سفارش (برای شمارش سفارش‌ها) | yes |
| `ApprovedDeliveryDate` | datetime | تاریخ تحویل تأییدشده | yes |
| `ReferenceDelivery` | bigint | مرجع تحویل | yes |
| `StateVoucher_Key` | udt_surrogate_key | کلید اتصال به وضعیت‌های رسید انبار | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `QuantityVoucher` | decimal | مقدار سند | yes |
| `Store_Key` | udt_surrogate_key | کلید اتصال به انبارها | yes |
| `InventoryVoucherDate` | datetime | تاریخ سند موجودی | yes |
| `QuantityDelivery` | decimal | مقدار تحویل | yes |
| `StateDelivery_Key` | udt_surrogate_key | کلید اتصال به وضعیت‌های تحویل | yes |
| `InvoiceItemID` | bigint | شناسه قلم فاکتور | hidden |
| `InvoiceRef` | bigint | مرجع فاکتور | yes |
| `PriceInvoice` | decimal | مبلغ فاکتور | yes |
| `FeeInvoice` | decimal | فاکتور نرخ واحد | yes |
| `QuantityInvoice` | decimal | مقدار فاکتور | yes |
| `StateInvoice_Key` | udt_surrogate_key | کلید اتصال به وضعیت‌های فاکتور | yes |
| `SupplierInvoice_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `AdditionSInvoice` | decimal | اضافات فاکتور | yes |
| `DeductionsInvoice` | decimal | فاکتور کسورات | yes |
| `NetPriceInvoice` | decimal | مبلغ فاکتور خالص | yes |
| `NumberInvoice` | nvarchar | شماره فاکتور | yes |
| `InvoiceDate` | datetime | تاریخ فاکتور | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `StateVoucher_Key` → [[Dim_InventoryVoucherState]] `InventoryVoucherState_Key` (inferred)
- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Store_Key` → [[Dim_Store]] `Store_key` (inferred)
- `StateDelivery_Key` → [[Dim_DeliveryState]] `DeliveryState_Key` (inferred)
- `StateInvoice_Key` → [[Dim_InvoiceState]] `InvoiceState_Key` (inferred)
- `SupplierInvoice_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
