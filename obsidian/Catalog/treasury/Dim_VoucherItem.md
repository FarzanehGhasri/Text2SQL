---
type: table
domain: treasury
source: "[TRE].[Dim_VoucherItem]"
synonyms: []
tags: [catalog, domain/treasury]
---
> اقلام سند

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `VoucherItem_Key` | udt_surrogate_key | کلید اقلام سند | yes |
| `VoucherItemID` | bigint | شناسه قلم سند | hidden |
| `DLLevel4` | nvarchar | تفصیلی سطح ۴ | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
