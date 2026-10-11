---
type: table
domain: treasury
source: "[TRE].[Fact_CashFlow_Transfer]"
synonyms:
  - "انتقال"
  - "انتقال بین حساب"
tags: [catalog, domain/treasury]
---
> جریان نقدی — انتقال بین حساب‌ها (تخت‌شده)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RecId` | int | شناسه رکورد | hidden |
| `Ledger` | nvarchar | دفتر | yes |
| `OfficeBranch` | nvarchar | دفتر / شعبه | yes |
| `CashFlowGroupCode` | nvarchar | کد گروه جریان نقدی | yes |
| `Code` | nvarchar | کد | yes |
| `Title` | nvarchar | عنوان | yes |
| `GroupCode` | nvarchar | کد گروه | yes |
| `GroupTitle` | nvarchar | عنوان گروه | yes |
| `CashFlowFactorCode` | nvarchar | کد عامل جریان نقدی | yes |
| `CashFlowFactorTitle` | nvarchar | عنوان عامل جریان نقدی | yes |
| `BankName` | nvarchar | نام بانک | yes |
| `BankBranchName` | nvarchar | نام شعبه بانک | yes |
| `BankAccountNumber` | nvarchar | شماره حساب بانکی | yes |
| `Remaining` | decimal | مانده | yes |
| `CurrencyReceipt` | decimal | مبلغ دریافت ارزی | yes |
| `Receipt` | decimal | مبلغ دریافت | yes |
| `Payment` | decimal | مبلغ پرداخت | yes |
| `ItemType2` | int | نوع قلم | yes |
| `ItemDate` | datetime | تاریخ قلم | yes |
| `ItemDescription` | nvarchar | شرح قلم | yes |
| `BaseDocumentID` | bigint | شناسه سند مبنا | yes |
| `CurrencyTitle` | nvarchar | عنوان ارز | yes |
| `BaseDocumentDate` | datetime | تاریخ سند مبنا | yes |
| `ItemNumber` | nvarchar | شماره قلم | yes |
| `VoucherSequence` | int | شماره سند حسابداری | yes |
| `VoucherDate` | datetime | تاریخ سند حسابداری | yes |
| `DLCode` | nvarchar | کد تفصیلی | yes |
| `DLTitle` | nvarchar | عنوان تفصیلی | yes |
| `InsertedDate` | datetime | تاریخ درج در ورهاوس | hidden |
| `DocumentDate` | datetime | تاریخ سند | yes |
| `BankName_Dest` | nvarchar | نام بانک مقصد | yes |
| `BankBranchName_Dest` | nvarchar | نام بانک شعبه مقصد | yes |
| `BankAccountNumber_Dest` | nvarchar | شماره مقصد حساب بانک | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
