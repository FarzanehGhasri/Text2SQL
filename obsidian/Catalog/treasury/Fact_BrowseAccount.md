---
type: table
domain: treasury
source: "[TRE].[Fact_BrowseAccount]"
synonyms:
  - "گردش حساب"
  - "مانده حساب"
  - "تراز"
tags: [catalog, domain/treasury]
---
> گردش و مانده حساب‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `EventID` | int | شناسه رویداد | hidden |
| `SL_Key` | bigint | کلید اتصال به حساب‌های معین | yes |
| `VoucherItem_Key` | bigint | کلید اتصال به اقلام سند | yes |
| `DL_Key` | bigint | کلید اتصال به حساب‌های تفصیلی | yes |
| `Debit` | numeric | بدهکار | yes |
| `Credit` | numeric | بستانکار | yes |
| `DebitBalance` | numeric | مانده بدهکار | yes |
| `CreditBalance` | numeric | مانده بستانکار | yes |
| `CurrencyDebit` | numeric | بدهکار ارز | yes |
| `CurrencyCredit` | numeric | بستانکار ارز | yes |
| `CurrencyDebitBalance` | numeric | مانده بدهکار ارز | yes |
| `CurrencyCreditBalance` | numeric | مانده بستانکار ارز | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `SL_Key` → [[Dim_SL]] `SL_Key` (inferred)
- `VoucherItem_Key` → [[Dim_VoucherItem]] `VoucherItem_Key` (inferred)
- `DL_Key` → [[Treasury_Dim_DL]] `DL_Key` (inferred)
