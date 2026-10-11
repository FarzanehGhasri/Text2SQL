---
type: table
domain: common
source: "[dbo].[Dim_Part_2]"
synonyms:
  - "کالا"
  - "قطعه"
  - "ماده"
tags: [catalog, domain/common]
---
> کالاها، قطعات و مواد

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Part_Key` | udt_surrogate_key | کلید کالاها، قطعات و مواد | yes |
| `PartID` | bigint | شناسه کالا | hidden |
| `PartCode` | nvarchar | کد کالا | yes |
| `PartName` | nvarchar | نام کالا | yes |
| `PartNature` | int | ماهیت کالا | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
