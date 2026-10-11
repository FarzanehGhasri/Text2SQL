---
type: table
domain: treasury
source: "[TRE].[Dim_vmSearchDeposit]"
synonyms:
  - "واریزی"
tags: [catalog, domain/treasury]
---
> واریزی‌های قابل جست‌وجو

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `vmSearchDeposit_Key` | udt_surrogate_key | کلید واریزی‌های قابل جست‌وجو | yes |
| `ID` | bigint | شناسه | hidden |
| `EntityType` | int | نوع موجودیت | yes |
| `EntityRef` | bigint | مرجع موجودیت | yes |
| `DocumentRef` | bigint | مرجع سند | yes |
| `DocumentNumber` | nvarchar | شماره سند | yes |
| `DocumentDate` | datetime | تاریخ سند | yes |
| `ApproveState` | int | وضعیت تأیید | yes |
| `Date` | datetime | تاریخ | yes |
| `Number` | nvarchar | شماره سند | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
