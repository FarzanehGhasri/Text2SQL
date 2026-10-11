---
type: table
domain: treasury
source: "[TRE].[Fact_SearchItem]"
synonyms:
  - "واریزی"
  - "جستجوی واریز"
tags: [catalog, domain/treasury]
---
> اقلام جست‌وجوی واریزی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventId` | int | شناسه رویداد | hidden |
| `vmSearchDeposit_Key` | bigint | کلید اتصال به واریزی‌های قابل جست‌وجو | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `BankAccount_Key` | bigint | کلید اتصال به حساب‌های بانکی | yes |
| `Branch_Key` | bigint | کلید اتصال به شعب / دفاتر | yes |
| `DocumentNumber` | nvarchar | شماره سند | yes |
| `DocumentDate` | datetime | تاریخ سند | yes |
| `ItemDate` | datetime | تاریخ قلم | yes |
| `ItemNumber` | nvarchar | شماره قلم | yes |
| `ItemAmount` | numeric | مبلغ قلم | yes |
| `ItemOperationalCurrencyAmount` | numeric | مبلغ ارز عملیاتی قلم | yes |
| `DLTitle` | nvarchar | عنوان تفصیلی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `vmSearchDeposit_Key` → [[Dim_vmSearchDeposit]] `vmSearchDeposit_Key` (inferred)
- `Currency_Key` → [[Treasury_Dim_Currency]] `Currency_Key` (inferred)
- `BankAccount_Key` → [[Dim_BankAccount]] `BankAccount_Key` (inferred)
- `Branch_Key` → [[Dim_Branch]] `Branch_Key` (inferred)
