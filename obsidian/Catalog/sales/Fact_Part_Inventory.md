---
type: table
domain: sales
source: "[dbo].[Fact_Part_Inventory]"
synonyms:
  - "موجودی کالا"
  - "موجودی قطعه"
  - "موجودی مواد"
tags: [catalog, domain/sales]
---
> موجودی فعلی کالاها (قطعات و مواد) در انبارها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `Store_Key` | udt_surrogate_key | کلید اتصال به انبارها | yes |
| `RemainInventory` | decimal | موجودی قابل استفاده | yes |
| `TempInventory` | decimal | موجودی موقت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `Store_Key` → [[Dim_Store]] `Store_key` (inferred)
