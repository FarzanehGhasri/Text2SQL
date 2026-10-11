---
type: table
domain: treasury
source: "[TRE].[Dim_PaymentInformation]"
synonyms:
  - "اطلاعات پرداخت"
tags: [catalog, domain/treasury]
---
> اطلاعات پرداخت (سرآیند)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentInformaion_Key` | udt_surrogate_key | کلید اطلاعات پرداخت | yes |
| `PaymentInformationID` | bigint | شناسه اطلاعات پرداخت | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `PaymentInformationDate` | datetime | تاریخ اطلاعات پرداخت | yes |
| `PaymentType` | int | نوع پرداخت | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 3=تایید شده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
