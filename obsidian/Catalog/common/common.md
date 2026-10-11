---
type: domain
domain: common
shared: true
tags: [catalog, domain]
---
> ابعاد مشترک بین حوزه‌ها: کالا، واحد، انبار، سال مالی، ارز و تأمین‌کننده

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-sales`: *
- `NLSQL-procurement`: *
- `NLSQL-treasury`: *
- `NLSQL-hr`: [[Dim_Date]]
- `NLSQL-bom`: [[Dim_Date]]
- `NLSQL-inventory_docs`: [[Dim_Date]]

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- [[Dim_Date]]: Dim_Date به جدول دیگری کلید ندارد؛ با ستون تاریخ وصلش کن: INNER JOIN [Dim_Date] ON TRY_CAST([Dim_Date].[FullDateAlternateKey] AS date) = CAST(<ستون تاریخ جدول اصلی> AS date). سال شمسی [PersianCalendarYear]، شماره ماه شمسی [PersianMonthNumberOfYear]، نام ماه شمسی [PersianMonthName]، فصل شمسی [PersianCalendarSeason]. سالی مثل ۱۴۰۳ سال شمسی است.

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

_none yet_

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[Dim_Part]]
- [[Dim_Unit]]
- [[Dim_Store]]
- [[Sales_Dim_FiscalYear]]
- [[Sales_Dim_Currency]]
- [[Treasury_Dim_Currency]]
- [[Procurement_Dim_Supplier]]
- [[Dim_Date]]
