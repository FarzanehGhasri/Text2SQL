---
type: table
domain: procurement
source: "[PRC].[Fact_PaymentOrder]"
synonyms:
  - "دستور پرداخت"
tags: [catalog, domain/procurement, needs-review]
---
> دستورهای پرداخت خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentOrderID` | bigint | شناسه سفارش پرداخت | yes |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `CounterPart_Key` | bigint | کلید طرف مقابل (تامین‌کننده یا شخص؟) | review |
| `Creator_Key` | bigint | ایجادکننده | hidden |
| `State` | int | کد وضعیت سند: 1=ثبت موقت، 2=تایید شده، 3=در انتظار پرداخت، 4=پرداخت شده، 5=ابطال شده | yes |
| `FiscalYear_Key` | bigint | کلید اتصال به سال‌های مالی | yes |
| `ApproveDate` | datetime | تاریخ تأیید | yes |
| `DepositAmount` | decimal | مبلغ واریز | yes |
| `DepositCurrency_Key` | bigint | کلید اتصال به ارزها | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `DepositCurrency_Key` → [[Treasury_Dim_Currency]] `Currency_Key` (inferred)
