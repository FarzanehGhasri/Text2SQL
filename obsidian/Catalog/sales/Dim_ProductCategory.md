---
type: table
domain: sales
source: "[dbo].[Dim_ProductCategory_2]"
synonyms:
  - "دسته محصول"
  - "گروه محصول"
  - "دسته بندی"
tags: [catalog, domain/sales]
---
> دسته‌بندی محصولات

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PrdCategory_Key` | udt_surrogate_key | کلید دسته‌بندی محصولات | yes |
| `PrdCategoryID` | bigint | شناسه دسته محصول | hidden |
| `CategoryName` | nvarchar | نام دسته | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
