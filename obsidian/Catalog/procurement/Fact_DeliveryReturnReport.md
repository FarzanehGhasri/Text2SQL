---
type: table
domain: procurement
source: "[RPT].[Fact_DeliveryReturnReport]"
synonyms:
  - "برگشت خرید"
  - "برگشت به تامین کننده"
tags: [catalog, domain/procurement]
---
> گزارش برگشت از تحویل خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DeliveryReturnItemID` | bigint | شناسه قلم برگشت تحویل | hidden |
| `Number` | nvarchar | شماره سند | yes |
| `DeliveryReturnDate` | datetime | تاریخ برگشت تحویل | yes |
| `DeliveryRef` | bigint | مرجع تحویل | yes |
| `State` | int | کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `PurchasingDepartmentRef` | bigint | مرجع واحد خرید | yes |
| `SettlementType` | int | نوع تسویه | yes |
| `ResupplyType` | int | نوع تأمین مجدد | yes |
| `PurchaseItemRef` | bigint | مرجع کالای خرید | yes |
| `PurchaseItemCode` | nvarchar | کد کالای خرید | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `DiscrepancyType` | int | نوع مغایرت | yes |
| `Supplier_Key` | udt_surrogate_key | کلید اتصال به تامین‌کنندگان | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `ContractNumber` | nvarchar | شماره قرارداد | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `Supplier_Key` → [[Procurement_Dim_Supplier]] `Supplier_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
