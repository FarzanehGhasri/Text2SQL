---
type: table
domain: treasury
source: "[TRE].[Fact_PaymentNotice]"
synonyms:
  - "اعلامیه پرداخت"
tags: [catalog, domain/treasury]
---
> اعلامیه‌های پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventId` | int | شناسه رویداد | hidden |
| `Payment_Key` | bigint | کلید اتصال به پرداخت‌ها | yes |
| `DL_Key` | bigint | کلید اتصال به حساب‌های تفصیلی | yes |
| `PaymentDeposit_Key` | bigint | کلید اتصال به واریزهای پرداخت | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `PaymentDate` | datetime | تاریخ پرداخت | yes |
| `PaymentDepositDate` | datetime | تاریخ واریز پرداخت | yes |
| `Amount` | numeric | مبلغ | yes |
| `CurrencyAmount` | numeric | مبلغ ارزی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Payment_Key` → [[Dim_Payment]] `Payment_Key` (inferred)
- `DL_Key` → [[Treasury_Dim_DL]] `DL_Key` (inferred)
- `PaymentDeposit_Key` → [[Dim_PaymentDeposit]] `PaymentDeposit_Key` (inferred)
- `Currency_Key` → [[Treasury_Dim_Currency]] `Currency_Key` (inferred)
