---
type: domain
domain: inventory_docs
tags: [catalog, domain]
---
> اسناد انبار

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-inventory_docs`: *

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- Fact_ntsw اقلام اسناد انبار (رسید و حواله) است.
- برای تاریخ شمسی از [PersianDateStr] یا [PersianDateInt] استفاده کن.

## Metrics
Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.

### مقدار اسناد انبار
- Also called: مقدار رسید و حواله، گردش انبار
- Formula: `SUM([Fact_ntsw].[Quantity])`

### مبلغ نهایی اسناد
- Also called: مبلغ نهایی
- Formula: `SUM([Fact_Documents].[PriceFinal])`

### مالیات اسناد
- Also called: مالیات
- Formula: `SUM([Fact_Documents].[PriceTax])`

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

_none yet_

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[Fact_ntsw]]
- [[Dim_DocumentType]]
- [[Dim_FloorPart]]
- [[Dim_GroupPart]]
- [[Fact_Documents]]
- [[Inventory_Dim_Status]]
