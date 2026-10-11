---
type: table
domain: treasury
source: "[TRE].[Dim_BankAccount]"
synonyms:
  - "حساب بانکی"
  - "شماره حساب"
tags: [catalog, domain/treasury]
---
> حساب‌های بانکی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `BankAccount_Key` | udt_surrogate_key | کلید حساب‌های بانکی | yes |
| `BankAccountID` | bigint | شناسه حساب بانک | hidden |
| `BankAccountNumber` | nvarchar | شماره حساب بانکی | yes |
| `BankBranchID` | bigint | شناسه شعبه بانک | hidden |
| `BankBranchCode` | nvarchar | کد بانک شعبه | yes |
| `BankBranchName` | nvarchar | نام شعبه بانک | yes |
| `BankID` | bigint | شناسه بانک | hidden |
| `BankCode` | nvarchar | کد بانک | yes |
| `BankName` | nvarchar | نام بانک | yes |
| `StartDate` | datetime | تاریخ شروع | yes |
| `EndDate` | datetime | تاریخ پایان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
