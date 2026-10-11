---
type: table
domain: treasury
source: "[TRE].[Fact_Voucher]"
synonyms:
  - "سند حسابداری"
  - "آرتیکل"
  - "سند"
tags: [catalog, domain/treasury]
---
> اقلام اسناد حسابداری

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Voucher_Key` | bigint | کلید اقلام اسناد حسابداری | yes |
| `VoucherID` | bigint | شناسه سند | hidden |
| `Number` | int | شماره سند | yes |
| `Date` | datetime | تاریخ | yes |
| `State` | int | کد وضعیت سند | yes |
| `VoucherItemID` | bigint | شناسه قلم سند | hidden |
| `Debit` | decimal | بدهکار | yes |
| `Credit` | decimal | بستانکار | yes |
| `Description` | nvarchar | شرح | yes |
| `SLTitle` | nvarchar | عنوان معین | yes |
| `GLTitle` | nvarchar | عنوان حساب کل | yes |
| `AccountGroupTitle` | nvarchar | عنوان گروه حساب | yes |
| `DLLevel4Title` | nvarchar | تفصیلی سطح ۴ | yes |
| `DLLevel5Title` | nvarchar | تفصیلی سطح ۵ | yes |
| `DLLevel6Title` | nvarchar | تفصیلی سطح ۶ | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
