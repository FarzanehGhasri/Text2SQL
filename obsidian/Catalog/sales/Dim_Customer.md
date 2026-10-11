---
type: table
domain: sales
source: "[dbo].[Dim_Customer]"
synonyms:
  - "مشتری"
  - "خریدار"
  - "طرف حساب"
tags: [catalog, domain/sales, needs-review]
---
> مشتریان

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Customer_key` | udt_surrogate_key | کلید مشتریان | yes |
| `CustomerID` | bigint | شناسه مشتری | hidden |
| `CustomerNumber` | nvarchar | شماره مشتری | yes |
| `CustomerName` | nvarchar | نام مشتری | yes |
| `CustomerrType` | int | نوع مشتری | yes |
| `CustomerState` | int | کد وضعیت مشتری: 1=ثبت شده، 2=تایید شده، 3=در حال استفاده، 4=بسته شده، 5=معلق، 6=باطل شده، 7=مسدود | review |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
