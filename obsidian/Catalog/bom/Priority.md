---
type: table
domain: bom
source: "[BOM].[Priority_2]"
synonyms:
  - "اولویت تولید"
  - "برنامه تولید"
  - "MPS"
tags: [catalog, domain/bom, needs-review]
---
> اولویت تولید محصولات و فرمول‌ها به تفکیک ماه

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PriorityID` | int | شناسه اولویت | yes |
| `ProductCode` | float | کد محصول | yes |
| `ProductName` | nvarchar | نام محصول | yes |
| `ProductGroup` | nvarchar | گروه محصول | yes |
| `BOMCode` | float | کد فرمول ساخت | yes |
| `BOMName` | nvarchar | نام فرمول ساخت | yes |
| `Priority_Product` | int | اولویت محصول | yes |
| `Priority_BOM` | int | اولویت فرمول | yes |
| `M` | int | نامشخص — ستون M در جدول Priority چیست؟ | review |
| `Year` | int | سال | yes |
| `Month` | int | ماه | yes |
| `MPS` | int | برنامه تولید اصلی | yes |
| `ActivePurchaseBOM` | int | فرمول خرید فعال؟ (تأیید شود) | review |
| `InsertedDate` | datetime | تاریخ درج در ورهاوس | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
