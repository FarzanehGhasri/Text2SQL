---
type: table
domain: treasury
source: "[TRE].[Fact_ReceivedPaymentInformation]"
synonyms:
  - "پرداخت دریافت شده"
tags: [catalog, domain/treasury]
---
> اطلاعات پرداخت‌های دریافت‌شده

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventId` | int | شناسه رویداد | hidden |
| `PaymentInformaion_Key` | bigint | کلید اتصال به اطلاعات پرداخت | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `Branch_Key` | bigint | کلید اتصال به شعب / دفاتر | yes |
| `Party_Key` | bigint | کلید اتصال به اشخاص / طرف حساب‌ها | yes |
| `PaymentInformationDate` | datetime | تاریخ اطلاعات پرداخت | yes |
| `ReceivedTotalAmount` | numeric | جمع مبلغ دریافتی | yes |
| `PaymentTotalAmount` | numeric | جمع مبلغ پرداختی | yes |
| `InvoiceID` | bigint | شناسه فاکتور | yes |
| `InvoiceNumber` | nvarchar | شماره فاکتور | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `PaymentInformaion_Key` → [[Dim_PaymentInformation]] `PaymentInformaion_Key` (inferred)
- `Currency_Key` → [[Treasury_Dim_Currency]] `Currency_Key` (inferred)
- `Branch_Key` → [[Dim_Branch]] `Branch_Key` (inferred)
- `Party_Key` → [[Dim_Party]] `Party_Key` (inferred)
