---
type: table
domain: procurement
source: "[PRC].[Fact_PaymentReq]"
synonyms:
  - "درخواست پرداخت"
tags: [catalog, domain/procurement, needs-review]
---
> اقلام درخواست پرداخت خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentReqItemID` | bigint | شناسه پرداخت درخواست قلم | hidden |
| `PaymentReqRef` | bigint | مرجع پرداخت درخواست | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `Amount` | decimal | مبلغ | yes |
| `PaymentDate` | datetime | تاریخ پرداخت | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت موقت، 2=تایید شده، 3=خاتمه یافته، 4=در حال استفاده، 5=بسته شده، 6=باطل شده | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `CounterPart_Key` | bigint | کلید طرف مقابل (تامین‌کننده یا شخص؟) | review |
| `Number` | nvarchar | شماره سند | yes |
| `Creator_Key` | bigint | ایجادکننده | hidden |
| `State` | int | کد وضعیت سند: 1=ثبت موقت، 2=تایید شده، 3=خاتمه یافته، 4=در حال استفاده، 5=بسته شده، 6=باطل شده | yes |
| `ReferenceAmount` | decimal | مبلغ مرجع | yes |
| `FiscalYear_Key` | bigint | کلید اتصال به سال‌های مالی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
