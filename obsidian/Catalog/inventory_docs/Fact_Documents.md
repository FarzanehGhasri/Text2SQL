---
type: table
domain: inventory_docs
source: "[NTSW].[Fact_Documents]"
synonyms:
  - "سند"
  - "فاکتور"
tags: [catalog, domain/inventory_docs]
---
> اسناد خرید/فروش با قیمت و مالیات

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RecId` | int | شناسه رکورد | hidden |
| `RowNum` | bigint | شماره ردیف | hidden |
| `DocNumber` | bigint | شماره سند | yes |
| `InvoiceSerial` | nvarchar | سریال فاکتور | yes |
| `DocDate` | nvarchar | تاریخ سند | yes |
| `DocSaveDate` | nvarchar | تاریخ ثبت سند | yes |
| `DateApprove` | nvarchar | تاریخ تأیید | yes |
| `DocType` | nvarchar | نوع سند | yes |
| `Seller` | nvarchar | فروشنده | yes |
| `SellerState` | nvarchar | وضعیت فروشنده (متن) | yes |
| `ActivityType` | nvarchar | نوع فعالیت | yes |
| `Source` | nvarchar | مبدأ | yes |
| `Destination` | nvarchar | مقصد | yes |
| `BillOfLadingNumber` | nvarchar | شماره بارنامه | yes |
| `DocDescription` | nvarchar | شرح سند | yes |
| `Status` | nvarchar | وضعیت | yes |
| `GroupPart` | nvarchar | گروه کالا | yes |
| `FloorPart` | nvarchar | طبقه کالا | yes |
| `PartCode` | nvarchar | کد کالا | yes |
| `PartDescription` | nvarchar | شرح کالا | yes |
| `Unit` | nvarchar | واحد | yes |
| `Amount` | decimal | مبلغ | yes |
| `PriceUnit` | decimal | قیمت واحد | yes |
| `PriceDiscount` | decimal | تخفیف | yes |
| `PriceOther` | decimal | سایر هزینه‌ها | yes |
| `PriceTax` | decimal | مالیات | yes |
| `PriceFinal` | decimal | مبلغ نهایی | yes |
| `Decription` | nvarchar | شرح | yes |
| `InsertedDate` | datetime | تاریخ درج در ورهاوس | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
