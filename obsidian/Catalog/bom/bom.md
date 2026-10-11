---
type: domain
domain: bom
tags: [catalog, domain]
---
> فرمول ساخت

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-bom`: *

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- هر ردیف BOMDetails یک ماده مصرفی در فرمول ساخت یک محصول است.
- [StandardConsumption] مقدار مصرف استاندارد به ازای یک واحد محصول است.

## Metrics
Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.

### مصرف استاندارد
- Also called: مقدار مصرف
- Formula: `SUM([BOMDetails].[StandardConsumption])`
- Note: به ازای یک واحد محصول.

### تعداد ماده مصرفی
- Also called: تعداد مواد مصرفی
- Formula: `COUNT(DISTINCT [BOMDetails].[ConsumptionCode])`

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

_none yet_

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[BOMDetails]]
- [[Priority]]
- [[StockParts]]
