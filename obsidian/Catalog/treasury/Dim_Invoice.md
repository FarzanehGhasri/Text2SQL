---
type: table
domain: treasury
source: "[TRE].[Dim_Invoice]"
synonyms:
  - "فاکتور"
tags: [catalog, domain/treasury, needs-review]
---
> فاکتورها (سرآیند)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Invoice_Key` | udt_surrogate_key | کلید فاکتورها | yes |
| `InvoiceID` | bigint | شناسه فاکتور | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `InvoiceDate` | datetime | تاریخ فاکتور | yes |
| `IssuanceDate` | datetime | تاریخ صدور | yes |
| `CreationDate` | datetime | تاریخ ایجاد | yes |
| `LastModificationDate` | datetime | تاریخ آخرین ویرایش | hidden |
| `LastModifier` | bigint | آخرین ویرایشگر | hidden |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | review |
| `Price` | numeric | مبلغ (مقدار × نرخ) | yes |
| `Version` | binary | نسخه | hidden |
| `Additions` | numeric | اضافات | yes |
| `Deductions` | numeric | کسورات | yes |
| `NetPrice` | numeric | مبلغ خالص پس از اضافات و کسورات | yes |
| `Type` | int | نوع | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
