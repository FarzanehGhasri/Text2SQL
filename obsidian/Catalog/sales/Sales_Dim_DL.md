---
type: table
domain: sales
source: "[dbo].[Dim_DL]"
synonyms:
  - "تفصیلی"
  - "حساب تفصیلی"
tags: [catalog, domain/sales]
---
> حساب‌های تفصیلی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DL_Key` | udt_surrogate_key | کلید حساب‌های تفصیلی | yes |
| `DLID` | bigint | شناسه تفصیلی | hidden |
| `ReferenceID` | int | شناسه مرجع | yes |
| `Code` | nvarchar | کد | yes |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
