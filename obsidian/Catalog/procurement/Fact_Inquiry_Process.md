---
type: table
domain: procurement
source: "[PRC].[Fact_Inquiry_Process]"
synonyms:
  - "پیگیری خرید"
  - "فرایند خرید"
  - "ردیابی سفارش"
  - "وضعیت خرید"
tags: [catalog, domain/procurement]
---
> ردیابی کامل فرایند خرید یک قلم از درخواست تا فاکتور

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Number` | int | شماره سند | yes |
| `RequestDate` | datetime | تاریخ درخواست | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `DemandDate` | datetime | تاریخ نیاز | yes |
| `FullName` | nvarchar | نام کامل | yes |
| `UnitName` | nvarchar | نام واحد | yes |
| `NameGhalam` | nvarchar | نام قلم | yes |
| `CodeGhalam` | nvarchar | کد قلم | yes |
| `NoeiGhalamKharidani` | nvarchar | نوع قلم خریدنی | yes |
| `VaziatGhalamDarkhast` | nvarchar | وضعیت قلم درخواست | yes |
| `RavieKharid` | nvarchar | رویه خرید | yes |
| `TarafMoghabel` | nvarchar | طرف مقابل | yes |
| `NoeiTarafMoghabel` | nvarchar | نوع طرف مقابل | yes |
| `VahedTamin` | nvarchar | واحد تأمین | yes |
| `ShomareEstelamBaha` | int | شماره استعلام بها | yes |
| `TarikhestelamBaha` | datetime | تاریخ استعلام بها | yes |
| `MohlatEstelam` | datetime | مهلت استعلام | yes |
| `VaziatGhalamestelam` | nvarchar | وضعیت قلم استعلام | yes |
| `ShomarePishFactor` | nvarchar | شماره پیش فاکتور | yes |
| `TarikhPishFactor` | datetime | تاریخ پیش فاکتور | yes |
| `VaziatGhalamPishFactor` | nvarchar | وضعیت قلم پیش فاکتور | yes |
| `TaminKonande` | nvarchar | تأمین کننده | yes |
| `ShomareDastorKharid` | int | شماره دستور خرید | yes |
| `TarikhDastorKharid` | datetime | تاریخ دستور خرید | yes |
| `MeghdarDastorShode` | decimal | مقدار دستور شده | yes |
| `VaziatGhalamDastor` | nvarchar | وضعیت قلم دستور | yes |
| `ShomareSefaresh` | int | شماره سفارش | yes |
| `TarikhSefaresh` | datetime | تاریخ سفارش | yes |
| `MeghdarSefareshShode` | decimal | مقدار سفارش شده | yes |
| `VaziatGhalamSefaresh` | nvarchar | وضعیت قلم سفارش | yes |
| `ShomareTahvil` | int | شماره تحویل | yes |
| `TarikhTahvil` | datetime | تاریخ تحویل | yes |
| `MeghdarTahvilShode` | decimal | مقدار تحویل شده | yes |
| `VaziatGhalamTahvil` | nvarchar | وضعیت قلم تحویل | yes |
| `ShomareResid` | int | شماره رسید | yes |
| `MeghdarResid` | decimal | مقدار رسید | yes |
| `TarikhResid` | datetime | تاریخ رسید | yes |
| `ShomareFactor` | nvarchar | شماره فاکتور | yes |
| `TarikhFactor` | datetime | تاریخ فاکتور | yes |
| `MeghdarFactorShode` | decimal | مقدار فاکتور شده | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `MablaghNakhalesFactor` | decimal | مبلغ ناخالص فاکتور | yes |
| `MablaghKhalesFactor` | decimal | مبلغ خالص فاکتور | yes |
| `Ezafat` | decimal | اضافات | yes |
| `Kosorat` | decimal | کسورات | yes |
| `Arz` | nvarchar | ارز | yes |
| `HazineTakmili` | nvarchar | هزینه تکمیلی | yes |
| `MablaghKhalesHazineTakmili` | decimal | مبلغ خالص هزینه تکمیلی | yes |
| `VaziatGhalamFactor` | nvarchar | وضعیت قلم فاکتور | yes |
| `TarikhTaeidTahvil` | datetime | تاریخ تأیید تحویل | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
