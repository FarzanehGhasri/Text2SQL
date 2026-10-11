---
type: table
domain: sales
source: "[dbo].[Fact_Delivery]"
synonyms:
  - "تحویل"
  - "حواله"
  - "ارسال"
tags: [catalog, domain/sales]
---
> اقلام تحویل کالا به مشتری (حواله انبار) مرتبط با اقلام سفارش

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `OrderItemNumber` | bigint | شماره قلم سفارش | yes |
| `Store_key` | udt_surrogate_key | کلید اتصال به انبارها | yes |
| `VoucherItemNumber` | bigint | شماره قلم سند | yes |
| `VoucherRef` | bigint | مرجع سند | yes |
| `VoucherDate` | datetime | تاریخ سند حسابداری | yes |
| `VoucherQuantity` | decimal | مقدار سند | yes |
| `VoucherItemState` | int | کد وضعیت قلم حواله: 1=ثبت شده، 2=تایید شده، 3=در حال استفاده، 4=بسته شده، 5=معلق، 6=باطل شده، 7=مسدود | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Store_key` → [[Dim_Store]] `Store_key` (inferred)
