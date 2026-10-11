---
type: table
domain: hr
source: "[HR].[Dim_WorkingYear]"
synonyms:
  - "سال کاری"
tags: [catalog, domain/hr]
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
| `PersistOn` | datetime |  | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
