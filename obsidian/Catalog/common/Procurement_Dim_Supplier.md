---
type: table
domain: common
source: "[PRC].[Dim_Supplier_2]"
synonyms:
  - "تامین کننده"
  - "فروشنده"
  - "تأمین‌کننده"
tags: [catalog, domain/common]
---
> تامین‌کنندگان

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Supplier_Key` | udt_surrogate_key | کلید تامین‌کنندگان | yes |
| `SupplierID` | bigint | شناسه تامین‌کننده | hidden |
| `PartyRef` | bigint | مرجع طرف حساب | yes |
| `FirstName` | nvarchar | نام | yes |
| `LastName` | nvarchar | نام خانوادگی | yes |
| `FullName` | nvarchar | نام کامل | yes |
| `SupplierNumber` | nvarchar | شماره تامین‌کننده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
