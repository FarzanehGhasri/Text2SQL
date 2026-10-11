---
type: domain
domain: hr
tags: [catalog, domain]
---
> منابع انسانی

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-hr`: *

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- Fact_EmployeePeriodCalculation هر ردیف کارکرد یک کارمند در یک دوره است.
- مقادیر Amount در کارکرد به دقیقه است مگر نامش Count یا Day باشد.

## Metrics
Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.

### تعداد کارمندان
- Also called: تعداد پرسنل، تعداد کارکنان، تعداد نیرو
- Formula: `COUNT(DISTINCT [Fact_Employee].[Employee_Key])`

### سابقه کار
- Also called: سنوات، سابقه خدمت
- Formula: `DATEDIFF(DAY, [Fact_Employee].[StartDate], COALESCE([Fact_Employee].[EndDate], GETDATE())) / 365.25`
- Note: به سال، برای هر کارمند؛ میانگین آن AVG(...) است.

### اضافه‌کار
- Also called: اضافه کار، اضافه کاری
- Formula: `SUM([Fact_EmployeePeriodCalculation].[TotalExtraWorkAmount])`
- Note: به دقیقه؛ اگر ساعت خواسته شد تقسیم بر 60.0.

### مرخصی
- Also called: جمع مرخصی
- Formula: `SUM([Fact_EmployeePeriodCalculation].[TotalvacationAmount])`
- Note: به دقیقه؛ تعداد دفعات در [TotalvacationCount].

### غیبت
- Also called: تعداد غیبت، روز غیبت
- Formula: `SUM([Fact_EmployeePeriodCalculation].[AbsenceCount])`

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

### تعداد کارمندان هر واحد
```sql
SELECT [Dim_Department].[Description], COUNT(*) AS [Employees] FROM [Fact_Employee] INNER JOIN [Dim_Department] ON [Fact_Employee].[Department_Key] = [Dim_Department].[Department_Key] GROUP BY [Dim_Department].[Description] ORDER BY [Employees] DESC
```

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[Fact_Employee]]
- [[Dim_BirthDay]]
- [[Dim_Company]]
- [[Dim_ContractType]]
- [[Dim_Department]]
- [[Dim_Education]]
- [[Dim_Gender]]
- [[Dim_Job]]
- [[Dim_JobPost]]
- [[Dim_MaritalStatus]]
- [[Dim_Mission]]
- [[Dim_PersonStatus]]
- [[Dim_Section]]
- [[Dim_ServiceArea]]
- [[Dim_SubDepartment]]
- [[Dim_Vacation]]
- [[Fact_EmployeePeriodCalculation]]
- [[HR_Dim_Status]]
- [[HR_Dim_TimePeriod]]
- [[HR_Dim_WorkingYear]]
