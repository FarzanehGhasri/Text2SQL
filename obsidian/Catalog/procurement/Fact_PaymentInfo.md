---
type: table
domain: procurement
source: "[PRC].[Fact_PaymentInfo_2]"
synonyms:
  - "اطلاعات پرداخت"
tags: [catalog, domain/procurement]
---
> اقلام اطلاعات پرداخت خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PayInfoItemID` | bigint | شناسه قلم اطلاعات پرداخت | hidden |
| `ReferenceNumber` | nvarchar | مرجع شماره | yes |
| `ReferenceType` | int | مرجع نوع | yes |
| `PaymentAmountInReferenceCurrency` | decimal | مبلغ مرجع ارز به پرداخت | yes |
| `PaymentAmount` | decimal | مبلغ پرداخت | yes |
| `ReferenceCurrencyRef` | bigint | مرجع مرجع ارز | yes |
| `Number` | nvarchar | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `FiscalYear_Key` | bigint | کلید اتصال به سال‌های مالی | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 3=تایید شده | yes |
| `Creator_Key` | bigint | ایجادکننده | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
