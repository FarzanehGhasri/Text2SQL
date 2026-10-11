---
type: table
domain: treasury
source: "[TRE].[Dim_DraftVoucherItem]"
synonyms: []
tags: [catalog, domain/treasury]
---
> اقلام پیش‌نویس اسناد

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DraftVoucherItem_Key` | udt_surrogate_key | کلید اقلام پیش‌نویس اسناد | yes |
| `DraftVoucherItemID` | bigint | شناسه قلم سند پیش‌نویس | hidden |
| `ItemType` | int | نوع قلم | yes |
| `ItemRef` | bigint | مرجع قلم | yes |
| `ItemNumber` | nvarchar | شماره قلم | yes |
| `Description` | nvarchar | شرح | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
