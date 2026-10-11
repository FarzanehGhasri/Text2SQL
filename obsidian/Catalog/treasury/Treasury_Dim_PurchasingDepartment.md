---
type: table
domain: treasury
source: "[TRE].[Dim_PurchasingDepartment]"
synonyms:
  - "واحد خرید"
tags: [catalog, domain/treasury]
---
> واحدهای خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید واحدهای خرید | yes |
| `PurchasingDepartmentID` | bigint | شناسه واحد خرید | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `Title` | nvarchar | عنوان | yes |
| `ManagerRef` | bigint | مرجع مدیر | yes |
| `SupervisorRef` | bigint | مرجع سرپرست | yes |
| `Description` | nvarchar | شرح | yes |
| `State` | int | کد وضعیت سند | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
