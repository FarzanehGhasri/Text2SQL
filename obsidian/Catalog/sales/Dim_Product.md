---
type: table
domain: sales
source: "[dbo].[Dim_Product_2]"
synonyms:
  - "محصول"
  - "کالای فروش"
tags: [catalog, domain/sales]
---
> محصولات قابل فروش با دسته‌بندی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Product_key` | udt_surrogate_key | کلید محصولات قابل فروش با دسته‌بندی | yes |
| `ProductID` | bigint | شناسه محصول | hidden |
| `ProductCode` | nvarchar | کد محصول | yes |
| `ProductName` | nvarchar | نام محصول | yes |
| `PrdCategory_Key` | udt_surrogate_key | کلید اتصال به دسته‌بندی محصولات | yes |
| `ProductCategoryName` | nvarchar | نام دسته محصول | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `PrdCategory_Key` → [[Dim_ProductCategory]] `PrdCategory_Key` (inferred)
