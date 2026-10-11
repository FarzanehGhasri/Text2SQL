---
type: table
domain: procurement
source: "[PRC].[Fact_InventoryVoucher]"
synonyms:
  - "رسید انبار"
  - "رسید"
tags: [catalog, domain/procurement]
---
> اقلام رسید انبار خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `InventoryVoucherItemID` | bigint | شناسه قلم سند موجودی | hidden |
| `InventoryVoucherRef` | bigint | مرجع سند موجودی | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=تایید شده، 3=در حال تایید، 4=باطل شده | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `Store_Key` | udt_surrogate_key | کلید اتصال به انبارها | yes |
| `Date` | datetime | تاریخ | yes |
| `Number` | nvarchar | شماره سند | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 2=تایید شده، 3=در حال تایید، 4=باطل شده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Store_Key` → [[Dim_Store]] `Store_key` (inferred)
