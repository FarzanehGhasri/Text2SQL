---
type: table
domain: sales
source: "[dbo].[Fact_ReturnedProduct]"
synonyms:
  - "برگشت از فروش"
  - "مرجوعی"
  - "برگشتی"
tags: [catalog, domain/sales]
---
> اقلام برگشت از فروش

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `ReturnedInvoiceItemID` | bigint | شناسه قلم فاکتور برگشتی | hidden |
| `ReturnedInvoiceID` | bigint | شناسه فاکتور برگشتی | yes |
| `Date` | datetime | تاریخ | yes |
| `SalesOffice_Key` | udt_surrogate_key | کلید اتصال به دفاتر فروش | yes |
| `Product_Key` | udt_surrogate_key | کلید اتصال به محصولات قابل فروش با دسته‌بندی | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `EffectiveNetPrice` | decimal | مبلغ خالص موثر (فروش خالص) | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `SalesOffice_Key` → [[Dim_SalesOffice]] `SalesOffice_key` (inferred)
- `Product_Key` → [[Dim_Product]] `Product_key` (inferred)
