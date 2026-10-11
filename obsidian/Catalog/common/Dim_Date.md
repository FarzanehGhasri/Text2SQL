---
type: table
domain: common
source: "[TRE].[Dim_Date_2]"
synonyms:
  - "تقویم"
  - "تاریخ شمسی"
  - "شمسی"
  - "سال شمسی"
  - "ماه شمسی"
patterns:
  - "(^|\\s)1[34]\\d\\d(\\s|/|$)"
  - "(^|\\s)(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(\\s|$)"
  - "(^|\\s)(امسال|پارسال)(\\s|$)"
  - "(^|\\s)(سال|ماه|فصل) (جاری|گذشته|قبل|پیش|اخیر)(\\s|$)"
tags: [catalog, domain/common]
---
> تقویم میلادی و شمسی؛ برای تبدیل تاریخ به سال و ماه شمسی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Date_Key` | int | کلید تقویم میلادی و شمسی | yes |
| `FullDateAlternateKey` | nvarchar | تاریخ میلادی کامل | yes |
| `CalendarYear` | int | سال میلادی | yes |
| `MonthNumberOfYear` | int | شماره ماه میلادی | yes |
| `MonthName` | nvarchar | نام ماه میلادی | yes |
| `DayOfWeek` | int | هفته روز | yes |
| `DayOfWeekName` | nvarchar | نام روز هفته | yes |
| `CalendarSeason` | int | فصل تقویم | yes |
| `SeasonName` | varchar | نام فصل | yes |
| `PersianFullDateAlternateKey` | varchar | تاریخ شمسی کامل | yes |
| `PersianDateKey` | int | کلید تاریخ شمسی | yes |
| `PersianCalendarYear` | int | سال شمسی | yes |
| `PersianMonthNumberOfYear` | int | شماره ماه شمسی | yes |
| `PersianMonthName` | nvarchar | نام ماه شمسی | yes |
| `PersianDayOfWeek` | int | شماره روز هفته شمسی | yes |
| `PersianDayOfWeekName` | nvarchar | نام روز هفته شمسی | yes |
| `PersianCalendarSeason` | int | شماره فصل شمسی | yes |
| `PersianSeasonName` | nvarchar | نام فصل شمسی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
