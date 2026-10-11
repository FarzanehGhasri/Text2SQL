---
type: table
domain: procurement
source: "[RPT].[Fact_PurchaseRequestReport]"
synonyms:
  - "گزارش درخواست خرید"
tags: [catalog, domain/procurement]
---
> گزارش اقلام درخواست خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseRequestItemID` | bigint | شناسه قلم درخواست خرید | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `RequestDate` | datetime | تاریخ درخواست | yes |
| `PurchaseItemRef` | bigint | مرجع کالای خرید | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `PurchaseItemCode` | nvarchar | کد کالای خرید | yes |
| `DemandDate` | datetime | تاریخ نیاز | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `PurchaseRequestRef` | bigint | مرجع درخواست خرید | yes |
| `PurchaseType` | int | نوع خرید | yes |
| `ContractNumber` | nvarchar | شماره قرارداد | yes |
| `CounterpartRef` | bigint | مرجع طرف مقابل | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
