---
type: table
domain: bom
source: "[BOM].[BOMDetails]"
core: true
synonyms:
  - "فرمول ساخت"
  - "بی او ام"
  - "مواد مصرفی"
  - "درخت محصول"
tags: [catalog, domain/bom, core]
---
> فرمول ساخت (BOM): مواد مصرفی هر محصول

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `BOMID` | int | شناسه فرمول ساخت | yes |
| `ProductCode` | nvarchar | کد محصول | yes |
| `ProductName` | nvarchar | نام محصول | yes |
| `BOMCode` | nvarchar | کد فرمول ساخت | yes |
| `BOMTitle` | nvarchar | عنوان فرمول ساخت | yes |
| `ConsumptionCode` | nvarchar | کد ماده مصرفی | yes |
| `ConsumptionName` | nvarchar | نام ماده مصرفی | yes |
| `StandardConsumption` | decimal | مصرف استاندارد به ازای یک واحد محصول | yes |
| `UnitName` | nvarchar | نام واحد | yes |
| `AlterGroup` | nvarchar | گروه جایگزین | yes |
| `AlterPriority` | int | اولویت جایگزینی | yes |
| `BOMState` | int | وضعیت فرمول | yes |
| `PartNature` | int | ماهیت کالا | yes |
| `InsertDate` | datetime | تاریخ درج در ورهاوس | hidden |
| `Current` | int | رکورد جاری | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
