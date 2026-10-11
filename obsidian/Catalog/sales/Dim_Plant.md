---
type: table
domain: sales
source: "[dbo].[Dim_Plant]"
synonyms:
  - "کارخانه"
  - "سایت"
  - "پلنت"
tags: [catalog, domain/sales]
---
> کارخانه‌ها / سایت‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Plant_Key` | udt_surrogate_key | کلید کارخانه‌ها / سایت‌ها | yes |
| `PlantID` | bigint | شناسه کارخانه | hidden |
| `Name` | nvarchar | نام | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
