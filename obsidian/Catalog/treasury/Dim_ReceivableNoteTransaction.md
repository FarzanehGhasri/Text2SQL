---
type: table
domain: treasury
source: "[TRE].[Dim_ReceivableNoteTransaction]"
synonyms:
  - "گردش چک"
tags: [catalog, domain/treasury]
---
> گردش اسناد دریافتنی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `ReceivableNoteTransaction_Key` | udt_surrogate_key | کلید گردش اسناد دریافتنی | yes |
| `ReceivableNoteTransactionID` | bigint | شناسه گردش سند دریافتنی | hidden |
| `NormalORGuarantee` | int | عادی یا ضمانت | yes |
| `State` | int | کد وضعیت چک: 1=نزد صندوق، 2=نزد بانک، 3=وصول شده، 4=واخواست شده، 6=واگذار شده به غیر، 10=دریافتی مسترد شده، 11=پرداخت شده، 15=پرداختی مسترد شده، -21=در انتظار پرداخت انتقالی، -11=در انتظار پرداخت، -10=دریافتی در انتظار استرداد، -5=در انتظار واخواست بدون اقدام، -4=در انتظار واخواست، -3=در انتظار وصول، -2=در انتظار واگذار به بانک، -1=در انتظار دریافت | yes |
| `DocumentNumber` | nvarchar | شماره سند | yes |
| `DocumentDate` | datetime | تاریخ سند | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
