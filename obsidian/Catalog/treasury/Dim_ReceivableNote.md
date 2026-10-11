---
type: table
domain: treasury
source: "[TRE].[Dim_ReceivableNote]"
synonyms:
  - "چک دریافتنی"
  - "سند دریافتنی"
tags: [catalog, domain/treasury]
---
> اسناد دریافتنی (چک)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `ReceivableNote_Key` | udt_surrogate_key | کلید اسناد دریافتنی | yes |
| `ReceivableNoteID` | bigint | شناسه سند دریافتنی | hidden |
| `SerialNumber` | nvarchar | شماره سریال | yes |
| `State` | int | کد وضعیت چک: 1=نزد صندوق، 2=نزد بانک، 3=وصول شده، 4=واخواست شده، 6=واگذار شده به غیر، 10=دریافتی مسترد شده، 11=پرداخت شده، 15=پرداختی مسترد شده، -21=در انتظار پرداخت انتقالی، -11=در انتظار پرداخت، -10=دریافتی در انتظار استرداد، -5=در انتظار واخواست بدون اقدام، -4=در انتظار واخواست، -3=در انتظار وصول، -2=در انتظار واگذار به بانک، -1=در انتظار دریافت | yes |
| `NoteType` | int | نوع سند (چک/سفته) | yes |
| `DueDate` | datetime | تاریخ سررسید | yes |
| `AgreementDate` | datetime | تاریخ توافق | yes |
| `AccountNumber` | nvarchar | شماره حساب | yes |
| `BankBranchName` | nvarchar | نام شعبه بانک | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
