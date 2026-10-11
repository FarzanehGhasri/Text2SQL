---
type: table
domain: treasury
source: "[TRE].[Fact_PurchaseInvoice]"
synonyms:
  - "فاکتور خرید خزانه"
tags: [catalog, domain/treasury]
---
> فاکتورهای خرید از دید خزانه

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventId` | int | شناسه رویداد | hidden |
| `Invoice_Key` | bigint | کلید اتصال به فاکتورها | yes |
| `Supplier_Key` | bigint | کلید اتصال به تامین‌کنندگان | yes |
| `FiscalYear_Key` | bigint | کلید اتصال به سال‌های مالی | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `User_Key` | bigint | کلید اتصال به کاربران سیستم خرید | yes |
| `Branch_Key` | bigint | کلید اتصال به شعب / دفاتر | yes |
| `Party_Key_Creator` | bigint |  | hidden |
| `PurchasingDepartment_Key` | bigint | کلید اتصال به واحدهای خرید | yes |
| `InvoiceDate` | datetime | تاریخ فاکتور | yes |
| `IssuanceDate` | datetime | تاریخ صدور | yes |
| `CreationDate` | datetime | تاریخ ایجاد | yes |
| `LastModificationDate` | datetime | تاریخ آخرین ویرایش | hidden |
| `Price` | numeric | مبلغ (مقدار × نرخ) | yes |
| `Additions` | numeric | اضافات | yes |
| `Deductions` | numeric | کسورات | yes |
| `NetPrice` | numeric | مبلغ خالص پس از اضافات و کسورات | yes |
| `VoucherRef` | bigint | مرجع سند | yes |
| `RefundableAdditions` | numeric | اضافات قابل استرداد | yes |
| `DraftVoucherRef` | bigint | مرجع سند پیش‌نویس | yes |
| `HasVoucher` | int | سند حسابداری دارد | yes |
| `HasDraftVoucher` | int | پیش‌نویس سند دارد | yes |
| `TotalNetPrice` | numeric | جمع مبلغ خالص | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Invoice_Key` → [[Dim_Invoice]] `Invoice_Key` (inferred)
- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Currency_Key` → [[Treasury_Dim_Currency]] `Currency_Key` (inferred)
- `User_Key` → [[Treasury_Dim_User]] `User_Key` (inferred)
- `Branch_Key` → [[Dim_Branch]] `Branch_Key` (inferred)
- `PurchasingDepartment_Key` → [[Treasury_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
