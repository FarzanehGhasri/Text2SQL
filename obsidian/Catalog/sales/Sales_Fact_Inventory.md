---
type: table
domain: sales
source: "[dbo].[Fact_Inventory_2]"
synonyms:
  - "موجودی"
  - "موجودی محصول"
  - "انبار"
tags: [catalog, domain/sales]
---
> موجودی فعلی محصولات در انبارها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Product_Key` | udt_surrogate_key | کلید اتصال به محصولات قابل فروش با دسته‌بندی | yes |
| `ProductCode` | nvarchar | کد محصول | yes |
| `Store_Key` | udt_surrogate_key | کلید اتصال به انبارها | yes |
| `RemainInventory` | decimal | موجودی قابل استفاده | yes |
| `TempInventory` | decimal | موجودی موقت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Product_Key` → [[Dim_Product]] `Product_key` (inferred)
- `Store_Key` → [[Dim_Store]] `Store_key` (inferred)
