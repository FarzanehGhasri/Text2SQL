---
type: table
domain: procurement
source: "[PRC].[Dim_User]"
synonyms:
  - "کاربر"
tags: [catalog, domain/procurement]
---
> کاربران سیستم خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `UserID` | bigint | شناسه کاربر | yes |
| `Name` | nvarchar | نام | yes |
| `PartyRef` | bigint | مرجع طرف حساب | yes |
| `Creator_Key` | udt_surrogate_key | ایجادکننده | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
