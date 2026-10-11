---
type: table
domain: sales
source: "[dbo].[Dim_CustomerSalesOffice]"
synonyms:
  - "مشتری دفتر فروش"
tags: [catalog, domain/sales]
---
> ارتباط مشتری با دفتر فروش

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `CustomerSalesOffice_key` | udt_surrogate_key | کلید ارتباط مشتری با دفتر فروش | yes |
| `Customer_key` | udt_surrogate_key | کلید اتصال به مشتریان | yes |
| `SalesOffice_key` | udt_surrogate_key | کلید اتصال به دفاتر فروش | yes |
| `CustomerSalesOfficeID` | bigint | شناسه دفتر فروش مشتری | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Customer_key` → [[Dim_Customer]] `Customer_key` (inferred)
- `SalesOffice_key` → [[Dim_SalesOffice]] `SalesOffice_key` (inferred)
