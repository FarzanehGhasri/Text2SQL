---
type: table
domain: procurement
source: "[PRC].[Fact_PurchaseRequest_2]"
synonyms:
  - "درخواست خرید"
  - "درخواست"
tags: [catalog, domain/procurement]
---
> اقلام درخواست خرید

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PurchaseRequestItemID` | bigint | شناسه قلم درخواست خرید | hidden |
| `PurchaseRequestRef` | bigint | مرجع درخواست خرید | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Unit_Key` | udt_surrogate_key | کلید اتصال به واحدهای اندازه‌گیری | yes |
| `DemandDate` | datetime | تاریخ نیاز | yes |
| `InquiryDeadlineDate` | datetime | مهلت استعلام | yes |
| `Number_PR` | nvarchar | شماره درخواست خرید | yes |
| `FiscalYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های مالی | yes |
| `Part_Key` | udt_surrogate_key | کلید اتصال به کالاها، قطعات و مواد | yes |
| `PurchasingAgent_Key` | udt_surrogate_key | کلید اتصال به کارشناسان خرید | yes |
| `PurchaseType` | int | نوع خرید | yes |
| `State_PR` | int | کد وضعیت درخواست خرید: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |
| `RequestDate` | datetime | تاریخ درخواست | yes |
| `CounterpartType_Key` | udt_surrogate_key | کلید اتصال به انواع طرف مقابل | yes |
| `PurchaseRequestType_Key` | udt_surrogate_key | کلید اتصال به انواع درخواست خرید | yes |
| `PurchasingDepartment_Key` | udt_surrogate_key | کلید اتصال به واحدهای خرید | yes |
| `UserPurchaseType_Key` | udt_surrogate_key | کلید اتصال به انواع خرید کاربر | yes |
| `ItemState` | int | کد وضعیت قلم: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Unit_Key` → [[Dim_Unit]] `Unit_key` (inferred)
- `FiscalYear_Key` → [[Sales_Dim_FiscalYear]] `FiscalYear_Key` (inferred)
- `Part_Key` → [[Dim_Part]] `Part_Key` (inferred)
- `PurchasingAgent_Key` → [[Dim_PurchasingAgent]] `PurchasingAgent_Key` (inferred)
- `CounterpartType_Key` → [[Dim_CounterpartType]] `CounterpartType_Key` (inferred)
- `PurchaseRequestType_Key` → [[Procurement_Dim_PurchaseRequestType]] `PurchaseRequestType_Key` (inferred)
- `PurchasingDepartment_Key` → [[Procurement_Dim_PurchasingDepartment]] `PurchasingDepartment_Key` (inferred)
- `UserPurchaseType_Key` → [[Procurement_Dim_UserPurchaseType]] `UserPurchaseType_Key` (inferred)
