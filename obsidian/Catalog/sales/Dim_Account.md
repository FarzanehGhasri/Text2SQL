---
type: table
domain: sales
source: "[dbo].[Dim_Account]"
synonyms:
  - "حساب"
tags: [catalog, domain/sales]
---
> حساب‌های دریافت وجه

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Account_Key` | udt_surrogate_key | کلید حساب‌های دریافت وجه | yes |
| `AccountID` | bigint | شناسه حساب | hidden |
| `Name` | nvarchar | نام | yes |
| `SecondTitle` | nvarchar | عنوان دوم | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
