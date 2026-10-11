---
type: table
domain: treasury
source: "[TRE].[Fact_PaymentOrder]"
synonyms:
  - "دستور پرداخت"
tags: [catalog, domain/treasury]
---
> دستورهای پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventId` | int | شناسه رویداد | hidden |
| `PaymentOrder_Key` | bigint | کلید اتصال به دستورهای پرداخت | yes |
| `PaymentRequest_Key` | bigint | کلید اتصال به درخواست‌های پرداخت | yes |
| `Branch_Key` | bigint | کلید اتصال به شعب / دفاتر | yes |
| `DL_Key` | bigint | کلید اتصال به حساب‌های تفصیلی | yes |
| `Party_Key_LastModifier` | bigint |  | hidden |
| `Party_Key_Createor` | bigint |  | hidden |
| `Party_Key_Approver` | bigint |  | hidden |
| `Date` | datetime | تاریخ | yes |
| `ApproveDate` | datetime | تاریخ تأیید | yes |
| `CreationDate` | datetime | تاریخ ایجاد | yes |
| `TotalOperationalCurrencyAmount` | numeric | جمع مبلغ به ریال | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `PaymentOrder_Key` → [[Dim_PaymentOrder]] `PaymentOrder_Key` (inferred)
- `PaymentRequest_Key` → [[Dim_PaymentRequest]] `PaymentRequest_Key` (inferred)
- `Branch_Key` → [[Dim_Branch]] `Branch_Key` (inferred)
- `DL_Key` → [[Treasury_Dim_DL]] `DL_Key` (inferred)
