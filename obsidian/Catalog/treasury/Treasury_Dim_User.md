---
type: table
domain: treasury
source: "[TRE].[Dim_User]"
synonyms:
  - "کاربر"
tags: [catalog, domain/treasury, needs-review]
---
> کاربران

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `User_Key` | udt_surrogate_key | کلید کاربران سیستم خرید | yes |
| `UserID` | bigint | شناسه کاربر | hidden |
| `Name` | nvarchar | نام | yes |
| `Status` | int | کد وضعیت: 1=فعال، 2=غیرفعال | review |
| `IsAdministrator` | bit | مدیر سیستم | yes |
| `IsLocked` | bit | قفل‌شده | hidden |
| `StartDate` | datetime | تاریخ شروع | yes |
| `EndDate` | datetime | تاریخ پایان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
