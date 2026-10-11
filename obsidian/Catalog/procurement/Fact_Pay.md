---
type: table
domain: procurement
source: "[PRC].[Fact_Pay]"
synonyms:
  - "پرداخت"
tags: [catalog, domain/procurement, needs-review]
---
> پرداخت‌های انجام‌شده خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentID` | bigint | شناسه پرداخت | yes |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `CounterPart_Key` | udt_surrogate_key | کلید طرف مقابل (تامین‌کننده یا شخص؟) | review |
| `ApproveDate` | datetime | تاریخ تأیید | yes |
| `ApproveState` | int | کد وضعیت تأیید: 1=ثبت شده، 2=تایید شده، 3=سند صادر شده، 4=باطل شده | yes |
| `FiscalYear_Key` | bigint | کلید اتصال به سال‌های مالی | yes |
| `Creator_Key` | bigint | ایجادکننده | hidden |
| `TotalOperationalCurrencyAmount` | decimal | جمع مبلغ به ریال | yes |
| `Report_Pay_Date` | datetime |  | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
