---
type: table
domain: treasury
source: "[TRE].[Dim_PaymentRequest]"
synonyms:
  - "درخواست پرداخت"
tags: [catalog, domain/treasury]
---
> درخواست‌های پرداخت (سرآیند)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentRequest_Key` | udt_surrogate_key | کلید درخواست‌های پرداخت | yes |
| `PaymentRequestID` | bigint | شناسه درخواست پرداخت | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `State` | int | کد وضعیت سند: 1=ثبت موقت، 2=تایید شده، 3=خاتمه یافته، 4=در حال استفاده، 5=بسته شده، 6=باطل شده | yes |
| `ReferenceCode` | nvarchar | مرجع کد | yes |
| `PaymentType` | int | نوع پرداخت | yes |
| `ReferenceType` | int | مرجع نوع | yes |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
