---
type: table
domain: treasury
source: "[TRE].[Fact_PaymentDocumentDetail_2]"
synonyms:
  - "چک پرداختنی"
  - "اسناد پرداختنی"
  - "سفته"
tags: [catalog, domain/treasury]
---
> جزئیات اسناد پرداختنی (چک و سفته)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PaymentDocumentsDetail_key` | int | کلید جزئیات اسناد پرداختنی | yes |
| `ID` | int | شناسه | hidden |
| `CurrencyRef` | int | مرجع ارز | yes |
| `NoteType` | int | نوع سند (چک/سفته) | yes |
| `NormalOrGuarantee` | int | عادی یا ضمانت | yes |
| `DurationType` | nvarchar | نوع مدت | yes |
| `SerialNumber` | nvarchar | شماره سریال | yes |
| `SayadNumber` | nvarchar | شماره صیاد | yes |
| `DueDate` | datetime | تاریخ سررسید | yes |
| `AgreementDate` | datetime | تاریخ توافق | yes |
| `CounterPartName` | nvarchar | نام طرف مقابل | yes |
| `Amount` | decimal | مبلغ | yes |
| `OperationalCurrencyAmount` | decimal | مبلغ به ریال | yes |
| `BankAccountNumber` | nvarchar | شماره حساب بانکی | yes |
| `BankName` | nvarchar | نام بانک | yes |
| `BankBranchName` | nvarchar | نام شعبه بانک | yes |
| `LastApprovedStateInReportDate` | int | وضعیت تاریخ گزارش به تأییدشده آخرین | yes |
| `LastState` | int | کد وضعیت چک: 1=نزد صندوق، 2=نزد بانک، 3=وصول شده، 4=واخواست شده، 6=واگذار شده به غیر، 10=دریافتی مسترد شده، 11=پرداخت شده، 15=پرداختی مسترد شده، -21=در انتظار پرداخت انتقالی، -11=در انتظار پرداخت، -10=دریافتی در انتظار استرداد، -5=در انتظار واخواست بدون اقدام، -4=در انتظار واخواست، -3=در انتظار وصول، -2=در انتظار واگذار به بانک، -1=در انتظار دریافت | yes |
| `DocumentNumber` | nvarchar | شماره سند | yes |
| `DocumentDate` | datetime | تاریخ سند | yes |
| `PaymentDescription` | nvarchar | شرح پرداخت | yes |
| `PaymentDescriptionEn` | nvarchar | شرح انگلیسی پرداخت | yes |
| `RelatedDocumentID` | int | شناسه سند مرتبط | yes |
| `PaymentDate` | datetime | تاریخ پرداخت | yes |
| `PaymentNumber` | nvarchar | شماره پرداخت | yes |
| `AccountingOperationCode` | nvarchar | کد حسابداری عملیات | yes |
| `AccountingOperationName` | nvarchar | نام حسابداری عملیات | yes |
| `SLCode` | nvarchar | کد معین | yes |
| `SLTitle` | nvarchar | عنوان معین | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
