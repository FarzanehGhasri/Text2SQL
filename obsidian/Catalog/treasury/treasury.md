---
type: domain
domain: treasury
tags: [catalog, domain]
---
> خزانه‌داری

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-treasury`: *

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- مبالغ به ریال است مگر ستون ارز بگوید.
- در Fact_CashFlow ستون [Receipt] دریافت و [Payment] پرداخت است؛ [Remaining] مانده. نام بانک و حساب داخل خودش است و به join نیاز ندارد.
- Debit بدهکار و Credit بستانکار است.
- وضعیت چک‌ها: کد منفی یعنی «در انتظار» یک اقدام، کد مثبت یعنی اقدام انجام شده. 3=وصول شده، 11=پرداخت شده، 4=واخواست شده، 10 و 15=مسترد شده. راهنمای کامل در توضیح ستون.

## Metrics
Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.

### مانده نقدی
- Also called: مانده خالص، خالص دریافت و پرداخت، خالص جریان نقدی
- Formula: `SUM([Fact_CashFlow].[Receipt]) - SUM([Fact_CashFlow].[Payment])`

### جمع دریافت
- Also called: مبلغ دریافت، دریافت‌ها
- Formula: `SUM([Fact_CashFlow].[Receipt])`

### جمع پرداخت
- Also called: مبلغ پرداخت، پرداخت‌ها
- Formula: `SUM([Fact_CashFlow].[Payment])`

### گردش بدهکار
- Also called: جمع بدهکار
- Formula: `SUM([Fact_BrowseAccount].[Debit])`

### گردش بستانکار
- Also called: جمع بستانکار
- Formula: `SUM([Fact_BrowseAccount].[Credit])`

### مبلغ اعلامیه پرداخت
- Formula: `SUM([Fact_PaymentNotice].[Amount])`

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

### جمع دریافت و پرداخت هر بانک
```sql
SELECT [Fact_CashFlow].[BankName], SUM([Fact_CashFlow].[Receipt]) AS [TotalReceipt], SUM([Fact_CashFlow].[Payment]) AS [TotalPayment] FROM [Fact_CashFlow] GROUP BY [Fact_CashFlow].[BankName] ORDER BY [TotalReceipt] DESC
```

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[Fact_CashFlow]]
- [[Dim_AccountingOperation]]
- [[Dim_Bank]]
- [[Dim_BankAccount]]
- [[Dim_Branch]]
- [[Dim_CashFlowFactor]]
- [[Dim_CashFlowFactorGrouping]]
- [[Dim_CashFlowFactorGroupingDetail]]
- [[Dim_DraftVoucher]]
- [[Dim_DraftVoucherItem]]
- [[Dim_Group]]
- [[Dim_Invoice]]
- [[Dim_Ledger]]
- [[Dim_Party]]
- [[Dim_PayableNote]]
- [[Dim_Payment]]
- [[Dim_PaymentDeposit]]
- [[Dim_PaymentInformation]]
- [[Dim_PaymentOrder]]
- [[Dim_PaymentRequest]]
- [[Dim_Receipt]]
- [[Dim_ReceiptDeposit]]
- [[Dim_ReceivableNote]]
- [[Dim_ReceivableNoteTransaction]]
- [[Dim_SL]]
- [[Dim_vmSearchDeposit]]
- [[Dim_VoucherItem]]
- [[Fact_BrowseAccount]]
- [[Fact_CashFlow_Moein]]
- [[Fact_CashFlow_Payment]]
- [[Fact_CashFlow_Receipt]]
- [[Fact_CashFlow_Sanadhesabdari]]
- [[Fact_CashFlow_TaghirModat]]
- [[Fact_CashFlow_Transfer]]
- [[Fact_DraftVoucher]]
- [[Fact_PaymentDocumentDetail]]
- [[Fact_PaymentNotice]]
- [[Fact_PaymentRequest]]
- [[Fact_PurchaseInvoice]]
- [[Fact_ReceivedDocumentDetail]]
- [[Fact_ReceivedPaymentInformation]]
- [[Fact_SearchItem]]
- [[Fact_Voucher]]
- [[Treasury_Dim_DL]]
- [[Treasury_Dim_FiscalYear]]
- [[Treasury_Dim_PurchasingDepartment]]
- [[Treasury_Dim_Supplier]]
- [[Treasury_Dim_User]]
- [[Treasury_Fact_PaymentOrder]]
