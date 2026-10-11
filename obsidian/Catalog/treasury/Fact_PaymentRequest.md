---
type: table
domain: treasury
source: "[TRE].[Fact_PaymentRequest]"
synonyms:
  - "درخواست پرداخت"
tags: [catalog, domain/treasury]
---
> درخواست‌های پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventId` | int | شناسه رویداد | hidden |
| `PaymentRequest_Key` | bigint | کلید اتصال به درخواست‌های پرداخت | yes |
| `Branch_Key` | bigint | کلید اتصال به شعب / دفاتر | yes |
| `Currency_Key` | bigint | کلید اتصال به ارزها | yes |
| `Party_Key_lastModifier` | bigint |  | hidden |
| `Party_Key_CreatorName` | bigint |  | hidden |
| `Party_Key_ApproverName` | bigint |  | hidden |
| `DL_Key` | bigint | کلید اتصال به حساب‌های تفصیلی | yes |
| `Date` | datetime | تاریخ | yes |
| `PaymentRequestSum` | numeric | جمع درخواست پرداخت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `PaymentRequest_Key` → [[Dim_PaymentRequest]] `PaymentRequest_Key` (inferred)
- `Branch_Key` → [[Dim_Branch]] `Branch_Key` (inferred)
- `Currency_Key` → [[Treasury_Dim_Currency]] `Currency_Key` (inferred)
- `DL_Key` → [[Treasury_Dim_DL]] `DL_Key` (inferred)
