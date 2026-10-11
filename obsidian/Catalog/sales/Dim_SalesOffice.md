---
type: table
domain: sales
source: "[dbo].[Dim_SalesOffice]"
synonyms:
  - "دفتر فروش"
  - "شعبه فروش"
  - "نمایندگی"
tags: [catalog, domain/sales]
---
> دفاتر فروش

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `SalesOffice_key` | udt_surrogate_key | کلید دفاتر فروش | yes |
| `SalesOfficeID` | bigint | شناسه دفتر فروش | hidden |
| `Name` | nvarchar | نام | yes |
| `SalesOfficeCode` | nvarchar | کد دفتر فروش | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
