---
type: table
domain: hr
source: "[HR].[Dim_TimePeriod]"
synonyms:
  - "دوره"
  - "ماه کارکرد"
tags: [catalog, domain/hr]
---
> دوره‌های کارکرد

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Period_Key` | udt_surrogate_key | کلید دوره‌های زمانی | yes |
| `PeriodId` | bigint | شناسه دوره | hidden |
| `PeriodName` | nvarchar | نام دوره | yes |
| `WorkingYearId` | bigint | شناسه سال کاری | yes |
| `StartDate` | datetime | تاریخ شروع | yes |
| `EndDate` | datetime | تاریخ پایان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
