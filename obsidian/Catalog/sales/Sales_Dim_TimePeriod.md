---
type: table
domain: sales
source: "[dbo].[Dim_TimePeriod]"
synonyms:
  - "دوره"
  - "دوره زمانی"
tags: [catalog, domain/sales]
---
> دوره‌های زمانی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Period_Key` | udt_surrogate_key | کلید دوره‌های زمانی | yes |
| `PeriodId` | bigint | شناسه دوره | hidden |
| `PeriodName` | nvarchar | نام دوره | yes |
| `WorkingYearId` | int | شناسه سال کاری | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
