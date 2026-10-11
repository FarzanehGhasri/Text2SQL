---
type: table
domain: hr
source: "[HR].[Dim_ServiceArea]"
synonyms:
  - "محل خدمت"
tags: [catalog, domain/hr]
---
> محل‌های خدمت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `ServiceArea_Key` | udt_surrogate_key | کلید محل‌های خدمت | yes |
| `tp_ID` | int |  | hidden |
| `Title` | nvarchar | عنوان | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
