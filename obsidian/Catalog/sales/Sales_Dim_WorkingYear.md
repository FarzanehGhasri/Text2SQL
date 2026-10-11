---
type: table
domain: sales
source: "[dbo].[Dim_WorkingYear]"
synonyms:
  - "سال کاری"
tags: [catalog, domain/sales]
---
> سال‌های کاری

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `WorkingYear_Key` | udt_surrogate_key | کلید سال‌های کاری | yes |
| `id` | bigint | شناسه | yes |
| `Name` | nvarchar | نام | yes |
| `StartDate` | datetime | تاریخ شروع | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
