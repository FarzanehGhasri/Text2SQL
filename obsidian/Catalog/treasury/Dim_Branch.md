---
type: table
domain: treasury
source: "[TRE].[Dim_Branch]"
synonyms:
  - "شعبه"
  - "دفتر"
tags: [catalog, domain/treasury]
---
> شعب / دفاتر

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Branch_Key` | udt_surrogate_key | کلید شعب / دفاتر | yes |
| `BranchID` | bigint | شناسه شعبه | hidden |
| `Code` | nvarchar | کد | yes |
| `Title` | nvarchar | عنوان | yes |
| `Title_En` | nvarchar | عنوان انگلیسی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
