---
type: table
domain: sales
source: "[dbo].[Fact_Vosouli]"
synonyms:
  - "وصولی"
  - "وصول"
  - "دریافت از مشتری"
  - "مطالبات"
tags: [catalog, domain/sales]
---
> وصولی‌ها: دریافت وجه از مشتریان

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Customer_Key` | bigint | کلید اتصال به مشتریان | yes |
| `Amount` | decimal | مبلغ | yes |
| `Account_Key` | udt_surrogate_key | کلید اتصال به حساب‌های دریافت وجه | yes |
| `SalesOffice_Key` | udt_surrogate_key | کلید اتصال به دفاتر فروش | yes |
| `ItemType` | int | نوع قلم | yes |
| `ItemDate` | datetime | تاریخ قلم | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Customer_Key` → [[Dim_Customer]] `Customer_key` (inferred)
- `Account_Key` → [[Dim_Account]] `Account_Key`
- `SalesOffice_Key` → [[Dim_SalesOffice]] `SalesOffice_key`
