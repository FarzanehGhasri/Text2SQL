---
type: table
domain: treasury
source: "[TRE].[Dim_Group]"
synonyms:
  - "گروه حساب"
tags: [catalog, domain/treasury]
---
> گروه حساب‌ها

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Group_Key` | udt_surrogate_key | کلید گروه حساب‌ها | yes |
| `GroupID` | bigint | شناسه گروه | hidden |
| `GroupCode` | nvarchar | کد گروه | yes |
| `GroupTitle` | nvarchar | عنوان گروه | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
