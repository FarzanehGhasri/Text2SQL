---
type: table
domain: common
source: "[dbo].[Dim_Store_2]"
synonyms:
  - "انبار"
tags: [catalog, domain/common]
---
> انبارها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Store_key` | udt_surrogate_key | کلید انبارها | yes |
| `StoreID` | bigint | شناسه انبار | hidden |
| `StoreCode` | nvarchar | کد انبار | yes |
| `StoreName` | nvarchar | نام انبار | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
