---
type: table
domain: treasury
source: "[TRE].[Dim_DraftVoucher]"
synonyms:
  - "پیش نویس"
tags: [catalog, domain/treasury]
---
> پیش‌نویس اسناد

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `DraftVoucher_Key` | udt_surrogate_key | کلید پیش‌نویس اسناد | yes |
| `DraftVoucherID` | bigint | شناسه سند پیش‌نویس | hidden |
| `VoucherRef` | bigint | مرجع سند | yes |
| `VoucherDate` | datetime | تاریخ سند حسابداری | yes |
| `VoucherSequence` | int | شماره سند حسابداری | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
