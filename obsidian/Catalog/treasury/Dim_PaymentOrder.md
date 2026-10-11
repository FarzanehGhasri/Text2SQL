---
type: table
domain: treasury
source: "[TRE].[Dim_PaymentOrder]"
synonyms:
  - "دستور پرداخت"
tags: [catalog, domain/treasury]
---
> دستورهای پرداخت (سرآیند)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentOrder_Key` | udt_surrogate_key | کلید دستورهای پرداخت | yes |
| `PaymentOrderID` | bigint | شناسه سفارش پرداخت | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `State` | int | کد وضعیت سند: 1=ثبت موقت، 2=تایید شده، 3=در انتظار پرداخت، 4=پرداخت شده، 5=ابطال شده | yes |
| `ApproveDate` | datetime | تاریخ تأیید | yes |
| `CreationDate` | datetime | تاریخ ایجاد | yes |
| `BasedOnList` | int | لیست مبتنی | yes |
| `TotalOperationalCurrencyAmount` | numeric | جمع مبلغ به ریال | yes |
| `StartDate` | datetime | تاریخ شروع | yes |
| `EndDate` | datetime | تاریخ پایان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
