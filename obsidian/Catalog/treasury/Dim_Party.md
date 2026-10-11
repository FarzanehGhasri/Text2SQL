---
type: table
domain: treasury
source: "[TRE].[Dim_Party]"
synonyms:
  - "شخص"
  - "طرف حساب"
tags: [catalog, domain/treasury]
---
> اشخاص / طرف حساب‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Party_Key` | udt_surrogate_key | کلید اشخاص / طرف حساب‌ها | yes |
| `PartyID` | bigint | شناسه طرف حساب | hidden |
| `FullName` | nvarchar | نام کامل | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
