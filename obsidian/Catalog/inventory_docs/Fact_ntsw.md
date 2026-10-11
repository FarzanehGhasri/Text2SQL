---
type: table
domain: inventory_docs
source: "[NTSW].[Fact_ntsw]"
core: true
synonyms:
  - "سند انبار"
  - "اسناد انبار"
  - "رسید"
  - "حواله"
  - "گردش انبار"
tags: [catalog, domain/inventory_docs, core]
---
> اقلام اسناد انبار: رسید و حواله

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RecId` | int | شناسه رکورد | hidden |
| `VoucherName` | nvarchar | نام سند | yes |
| `InventoryVoucherCategory` | nvarchar | دسته سند انبار | yes |
| `Number` | bigint | شماره سند | yes |
| `VoucherCode` | nvarchar | کد سند | yes |
| `Date` | datetime | تاریخ | yes |
| `BranchName` | nvarchar | نام شعبه | yes |
| `PartCode` | nvarchar | کد کالا | yes |
| `PartName` | nvarchar | نام کالا | yes |
| `TechnicalSpecification` | nvarchar | مشخصات فنی | yes |
| `StoreRef` | int | مرجع انبار | yes |
| `PartRef` | int | مرجع کالا | yes |
| `PartNature` | nvarchar | ماهیت کالا | yes |
| `UnitName` | nvarchar | نام واحد | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `MajorUnitQuantity` | decimal | مقدار به واحد اصلی | yes |
| `State` | nvarchar | کد وضعیت سند | yes |
| `CounterpartEntityText` | nvarchar | طرف مقابل | yes |
| `CounterpartTypeTitle` | nvarchar | نوع طرف مقابل | yes |
| `DelivererOrReceiverPartyFullName` | nvarchar | نام تحویل‌دهنده / گیرنده | yes |
| `PersianDateStr` | nvarchar | تاریخ شمسی (متن) | yes |
| `PersianDateInt` | int | تاریخ شمسی (عدد) | yes |
| `InsertDate` | datetime | تاریخ درج در ورهاوس | hidden |
| `Remaining` | decimal | مانده | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
