---
type: table
domain: treasury
source: "[TRE].[Fact_ReceivedDocumentDetail_2]"
synonyms:
  - "چک دریافتنی"
  - "اسناد دریافتنی"
tags: [catalog, domain/treasury]
---
> جزئیات اسناد دریافتنی (چک)، تخت‌شده با نام بانک و حساب معین

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RecId` | int | شناسه رکورد | hidden |
| `ID` | bigint | شناسه | hidden |
| `NoteType` | int | نوع سند (چک/سفته) | yes |
| `NormalOrGuarantee` | int | عادی یا ضمانت | yes |
| `SerialNumber` | nvarchar | شماره سریال | yes |
| `DueDate` | datetime | تاریخ سررسید | yes |
| `AgreementDate` | datetime | تاریخ توافق | yes |
| `DLCode` | nvarchar | کد تفصیلی | yes |
| `DLTitle` | nvarchar | عنوان تفصیلی | yes |
| `Amount` | decimal | مبلغ | yes |
| `OperationalCurrencyAmount` | decimal | مبلغ به ریال | yes |
| `AccountNumber` | nvarchar | شماره حساب | yes |
| `BankBranchName` | nvarchar | نام شعبه بانک | yes |
| `BankName` | nvarchar | نام بانک | yes |
| `LastApprovedStateInReportDate` | int | وضعیت تاریخ گزارش به تأییدشده آخرین | yes |
| `LastState` | int | کد وضعیت چک: 1=نزد صندوق، 2=نزد بانک، 3=وصول شده، 4=واخواست شده، 6=واگذار شده به غیر، 10=دریافتی مسترد شده، 11=پرداخت شده، 15=پرداختی مسترد شده، -21=در انتظار پرداخت انتقالی، -11=در انتظار پرداخت، -10=دریافتی در انتظار استرداد، -5=در انتظار واخواست بدون اقدام، -4=در انتظار واخواست، -3=در انتظار وصول، -2=در انتظار واگذار به بانک، -1=در انتظار دریافت | yes |
| `DocumentNumber` | nvarchar | شماره سند | yes |
| `DocumentDate` | datetime | تاریخ سند | yes |
| `ReceiptDate` | datetime | تاریخ دریافت | yes |
| `AccountingOperationCode` | bigint | کد حسابداری عملیات | yes |
| `AccountingOperationName` | nvarchar | نام حسابداری عملیات | yes |
| `SLCode` | nvarchar | کد معین | yes |
| `SLTitle` | nvarchar | عنوان معین | yes |
| `InsertedDate` | datetime | تاریخ درج در ورهاوس | hidden |
| `ReceivableNote_Key` | bigint | کلید اتصال به اسناد دریافتنی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `ReceivableNote_Key` → [[Dim_ReceivableNote]] `ReceivableNote_Key` (inferred)
