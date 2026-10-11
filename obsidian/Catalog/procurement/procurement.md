---
type: domain
domain: procurement
tags: [catalog, domain]
---
> خرید و تدارکات

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-procurement`: *

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- مبالغ به ریال است مگر ستون ارز بگوید. [OperationalCurrencyExchangeRate] نرخ تبدیل به ریال است.
- زنجیره خرید: درخواست خرید → استعلام → پیش‌فاکتور → دستور خرید → سفارش → تحویل → رسید انبار → فاکتور.
- هر ردیف Fact_* یک قلم سند است؛ برای تعداد سند از COUNT(DISTINCT [..Ref]) استفاده کن.
- Fact_Inquiry_Process کل زنجیره خرید یک قلم را در یک ردیف دارد و برای سوال‌های پیگیری فرایند مناسب است.
- هر ستون وضعیت راهنمای کدهایش را در توضیح خودش دارد؛ کدها بین جدول‌ها یکسان نیستند. NULL یعنی قلم هنوز به آن مرحله نرسیده.
- در جدول‌های خرید (درخواست، دستور، سفارش، فاکتور): «انجام‌شده» = State IN (3,4,7)، «در انتظار تأیید» = State IN (1,2)، «متوقف/معلق» = State IN (5,6).

## Metrics
Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.

### مبلغ خالص فاکتور خرید
- Also called: مبلغ فاکتور خرید، خرید خالص
- Formula: `SUM([Fact_Invoice].[NetPrice])`
- Note: به ارز همان فاکتور؛ برای ریال: SUM([Fact_Invoice].[NetPrice] * ISNULL([Fact_Invoice].[OperationalCurrencyExchangeRate], 1)).

### مبلغ ریالی فاکتور خرید
- Also called: فاکتور خرید به ریال
- Formula: `SUM([Fact_Invoice].[NetPrice] * ISNULL([Fact_Invoice].[OperationalCurrencyExchangeRate], 1))`

### تعداد فاکتور خرید
- Formula: `COUNT(DISTINCT [Fact_Invoice].[InvoiceRef])`

### مبلغ خالص سفارش خرید
- Also called: مبلغ سفارش خرید
- Formula: `SUM([Fact_Order].[NetPrice])`

### تعداد سفارش خرید
- Formula: `COUNT(DISTINCT [Fact_Order].[OrderRef])`

### مبلغ خالص دستور خرید
- Also called: مبلغ دستور خرید
- Formula: `SUM([Fact_PurchaseOrder].[NetPrice])`

### تعداد دستور خرید
- Formula: `COUNT(DISTINCT [Fact_PurchaseOrder].[PurchaseOrderRef])`

### تعداد درخواست خرید
- Formula: `COUNT(DISTINCT [Fact_PurchaseRequest].[PurchaseRequestRef])`

### مقدار رسید انبار
- Also called: مقدار رسیده به انبار، مقدار دریافت شده
- Formula: `SUM([Fact_InventoryVoucher].[Quantity])`
- Always filter: `[Fact_InventoryVoucher].[State] <> 4`
- Note: State 4 = باطل شده.

### میانگین نرخ خرید
- Also called: میانگین قیمت خرید، متوسط نرخ خرید
- Formula: `SUM([Fact_Invoice].[Price]) / NULLIF(SUM([Fact_Invoice].[Quantity]), 0)`
- Note: میانگین وزنی؛ AVG([Fee]) قلم‌های کوچک و بزرگ را هم‌وزن می‌کند.

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

### مجموع مبلغ فاکتورهای خرید هر تامین‌کننده
```sql
SELECT TOP 50 [Procurement_Dim_Supplier].[FullName], SUM([Fact_Invoice].[NetPrice]) AS [Total] FROM [Fact_Invoice] INNER JOIN [Procurement_Dim_Supplier] ON [Fact_Invoice].[Supplier_Key] = [Procurement_Dim_Supplier].[Supplier_Key] GROUP BY [Procurement_Dim_Supplier].[FullName] ORDER BY [Total] DESC
```

### تعداد درخواست خرید هر کارشناس خرید در سال جاری
```sql
SELECT [Dim_PurchasingAgent].[FullName], COUNT(DISTINCT [Fact_PurchaseRequest].[PurchaseRequestRef]) AS [Requests] FROM [Fact_PurchaseRequest] INNER JOIN [Dim_PurchasingAgent] ON [Fact_PurchaseRequest].[PurchasingAgent_Key] = [Dim_PurchasingAgent].[PurchasingAgent_Key] WHERE YEAR([Fact_PurchaseRequest].[RequestDate]) = YEAR(GETDATE()) GROUP BY [Dim_PurchasingAgent].[FullName] ORDER BY [Requests] DESC
```

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[Fact_Purchase]]
- [[Dim_CounterpartType]]
- [[Dim_DeliveryState]]
- [[Dim_InventoryVoucherState]]
- [[Dim_InvoiceState]]
- [[Dim_PayInfoState]]
- [[Dim_PaymentMethod]]
- [[Dim_PaymentRefType]]
- [[Dim_PayOrderState]]
- [[Dim_PayReqState]]
- [[Dim_PayState]]
- [[Dim_PurchaseMethod]]
- [[Dim_PurchaseState]]
- [[Dim_PurchaseType]]
- [[Dim_PurchasingAgent]]
- [[Dim_QuotationState]]
- [[Dim_TransportType]]
- [[Fact_CashFlowFactorGrouping]]
- [[Fact_DeliveryReturnReport]]
- [[Fact_Inquiry]]
- [[Fact_Inquiry_Process]]
- [[Fact_InquiryReport]]
- [[Fact_InventoryVoucher]]
- [[Fact_Invoice]]
- [[Fact_Order]]
- [[Fact_OrderReport]]
- [[Fact_Pay]]
- [[Fact_Payment]]
- [[Fact_PaymentInfo]]
- [[Fact_PaymentReq]]
- [[Fact_PurchaseOrder]]
- [[Fact_PurchaseOrderReport]]
- [[Fact_PurchaseRequest]]
- [[Fact_PurchaseRequestReport]]
- [[Fact_Quotation]]
- [[Fact_UnionReport]]
- [[PaymentReceiveInfo]]
- [[Procurement_Dim_PurchaseRequestType]]
- [[Procurement_Dim_PurchasingDepartment]]
- [[Procurement_Dim_User]]
- [[Procurement_Dim_UserPurchaseType]]
- [[Procurement_Fact_Delivery]]
- [[Procurement_Fact_Inventory]]
- [[Procurement_Fact_PaymentOrder]]
