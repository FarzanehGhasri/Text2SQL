---
type: domain
domain: sales
tags: [catalog, domain]
---
> فروش

## Who may see it
One line per AD group, named exactly as in Active Directory: `*` = every table below, or a list of tables.

- `IT - Data`: *
- `IT - Security`: *
- `NLSQL-Full`: *
- `NLSQL-sales`: *

## Rules for the model
Sent to the model whenever this domain is used. A line that starts with tables (`[[Dim_Date]]: ...`) is sent only when those tables are in the prompt.

- مبالغ به ریال است مگر ستون ارز بگوید.
- وضعیت اقلام سفارش از Dim_State: 1=ثبت شده، 2=تایید شده، 3=در حال استفاده، 4=بسته شده، 5=معلق، 6=باطل شده، 7=مسدود. برای فروش واقعی OrderItemState_Key NOT IN (6,7).
- فروش خالص هر قلم در ستون [EffectiveNetPrice] است؛ فروش ناخالص در [Gross Sales].
- برای گروه‌بندی زمانی از [OrderDate] استفاده کن.
- هر ردیف Fact_Sales یک قلم سفارش است؛ برای تعداد سفارش از COUNT(DISTINCT [OrderRef]) استفاده کن.

## Metrics
Exact definitions, sent word for word when the question names one. Columns as `[Table].[Column]`.

### فروش خالص
- Also called: فروش واقعی، درآمد خالص، مبلغ فروش
- Formula: `SUM([Fact_Sales].[EffectiveNetPrice])`
- Always filter: `[Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)`

### فروش ناخالص
- Also called: فروش کل، فروش بدون کسر تخفیف
- Formula: `SUM([Fact_Sales].[Gross Sales])`
- Always filter: `[Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)`

### تعداد سفارش فروش
- Also called: تعداد سفارش
- Formula: `COUNT(DISTINCT [Fact_Sales].[OrderRef])`
- Always filter: `[Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)`
- Note: هر ردیف یک قلم است؛ COUNT(*) تعداد قلم را می‌شمارد، نه سفارش.

### مقدار فروش
- Also called: تعداد کالای فروخته، تعداد فروش
- Formula: `SUM([Fact_Sales].[Quantity])`
- Always filter: `[Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)`

### تخفیف فروش
- Also called: مبلغ تخفیف، تخفیف داده
- Formula: `SUM([Fact_Sales].[ReductionAmount])`
- Always filter: `[Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)`

### میانگین مبلغ سفارش فروش
- Also called: میانگین سفارش، متوسط مبلغ سفارش
- Formula: `SUM([Fact_Sales].[EffectiveNetPrice]) / NULLIF(COUNT(DISTINCT [Fact_Sales].[OrderRef]), 0)`
- Always filter: `[Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)`

### برگشت از فروش
- Also called: مبلغ برگشتی، مرجوعی
- Formula: `SUM([Fact_ReturnedProduct].[EffectiveNetPrice])`

### وصولی
- Also called: مبلغ وصول، دریافت از مشتری
- Formula: `SUM([Fact_Vosouli].[Amount])`

### موجودی محصول
- Also called: موجودی قابل استفاده محصول، موجودی انبار محصول
- Formula: `SUM([Sales_Fact_Inventory].[RemainInventory])`

## Examples
A question and its correct SQL; the most similar ones are shown to the model.

### پرفروش‌ترین ۱۰ محصول بر اساس مبلغ
```sql
SELECT TOP 10 [Dim_Product].[ProductName], SUM([Fact_Sales].[EffectiveNetPrice]) AS [Total] FROM [Fact_Sales] INNER JOIN [Dim_Product] ON [Fact_Sales].[Product_key] = [Dim_Product].[Product_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_Product].[ProductName] ORDER BY [Total] DESC
```

### فروش ماهانه (سال و ماه میلادی تاریخ سفارش) به تفکیک دفتر فروش
```sql
SELECT [Dim_SalesOffice].[Name], YEAR([Fact_Sales].[OrderDate]) AS [Year], MONTH([Fact_Sales].[OrderDate]) AS [Month], SUM([Fact_Sales].[EffectiveNetPrice]) AS [Total] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name], YEAR([Fact_Sales].[OrderDate]), MONTH([Fact_Sales].[OrderDate]) ORDER BY [Year], [Month]
```

### تعداد سفارش هر مشتری
```sql
SELECT TOP 50 [Dim_Customer].[CustomerName], COUNT(DISTINCT [Fact_Sales].[OrderRef]) AS [Orders] FROM [Fact_Sales] INNER JOIN [Dim_Customer] ON [Fact_Sales].[Customer_key] = [Dim_Customer].[Customer_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_Customer].[CustomerName] ORDER BY [Orders] DESC
```

## Tables
Every table of this domain, in order of importance. A new table: create its note in this folder and add it here.

- [[Fact_Sales]]
- [[Dim_Account]]
- [[Dim_Customer]]
- [[Dim_CustomerSalesOffice]]
- [[Dim_PartNature]]
- [[Dim_Plant]]
- [[Dim_Product]]
- [[Dim_ProductCategory]]
- [[Dim_SalesOffice]]
- [[Dim_SeasonDiscount]]
- [[Dim_State]]
- [[Dim_YearDiscount]]
- [[Fact_Part_Inventory]]
- [[Fact_ReturnedProduct]]
- [[Fact_Vosouli]]
- [[Sales_Dim_DL]]
- [[Sales_Dim_PurchaseRequestType]]
- [[Sales_Dim_TimePeriod]]
- [[Sales_Dim_UserPurchaseType]]
- [[Sales_Dim_WorkingYear]]
- [[Sales_Fact_Delivery]]
- [[Sales_Fact_Inventory]]
