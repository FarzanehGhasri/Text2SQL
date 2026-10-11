---
type: table
domain: treasury
source: "[TRE].[Fact_DraftVoucher]"
synonyms:
  - "پیش نویس سند"
tags: [catalog, domain/treasury]
---
> اقلام پیش‌نویس سند حسابداری

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DraftVoucher_Key` | bigint | کلید اقلام پیش‌نویس سند حسابداری | yes |
| `DraftVoucherID` | int | شناسه سند پیش‌نویس | hidden |
| `VoucherRef` | int | مرجع سند | yes |
| `Date` | datetime | تاریخ | yes |
| `DocumentRef` | int | مرجع سند | yes |
| `DocumentNumber` | nvarchar | شماره سند | yes |
| `DraftVoucherNumber` | int | شماره سند پیش‌نویس | yes |
| `ItemNumber` | nvarchar | شماره قلم | yes |
| `Debit` | decimal | بدهکار | yes |
| `Credit` | decimal | بستانکار | yes |
| `Description` | nvarchar | شرح | yes |
| `SLTitle` | nvarchar | عنوان معین | yes |
| `GLTitle` | nvarchar | عنوان حساب کل | yes |
| `AccountGroupTitle` | nvarchar | عنوان گروه حساب | yes |
| `DLLevel4Title` | nvarchar | تفصیلی سطح ۴ | yes |
| `DLLevel5Title` | nvarchar | تفصیلی سطح ۵ | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
