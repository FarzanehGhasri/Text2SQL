---
type: table
domain: treasury
source: "[TRE].[Dim_Supplier]"
synonyms:
  - "تامین کننده"
tags: [catalog, domain/treasury]
---
> تامین‌کنندگان از دید خزانه

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Supplier_Key` | udt_surrogate_key | کلید تامین‌کنندگان | yes |
| `SupplierID` | bigint | شناسه تامین‌کننده | hidden |
| `Type` | int | نوع | yes |
| `Number` | nvarchar | شماره سند | yes |
| `IsActive` | bit | فعال | yes |
| `StartDate` | datetime | تاریخ شروع | yes |
| `EndDate` | datetime | تاریخ پایان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
