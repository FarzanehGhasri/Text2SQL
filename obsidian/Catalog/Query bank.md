---
type: query-bank
tags: [catalog]
---
Questions with their correct SQL. The most similar ones (only those whose tables the user may read and that are in the prompt) are shown to the model as examples.
`verified` = checked against the database or approved with ✅ in a review note; `draft` = not checked yet.
Never copy a benchmark question here: the benchmark would then measure memory, not understanding.

## Examples

### فروش خالص هر دسته محصول چقدر است؟
- id: `sales_b01` · status: draft
```sql
SELECT [Dim_Product].[ProductCategoryName], SUM([Fact_Sales].[EffectiveNetPrice]) AS [NetSales] FROM [Fact_Sales] INNER JOIN [Dim_Product] ON [Fact_Sales].[Product_key] = [Dim_Product].[Product_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_Product].[ProductCategoryName] ORDER BY [NetSales] DESC
```

### کدام محصولات در دفتر فروش تهران بیشترین تعداد فروش را داشته‌اند؟
- id: `sales_b02` · status: draft
```sql
SELECT TOP 20 [Dim_Product].[ProductName], SUM([Fact_Sales].[Quantity]) AS [Qty] FROM [Fact_Sales] INNER JOIN [Dim_Product] ON [Fact_Sales].[Product_key] = [Dim_Product].[Product_key] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) AND [Dim_SalesOffice].[Name] LIKE N'%تهران%' GROUP BY [Dim_Product].[ProductName] ORDER BY [Qty] DESC
```

### میانگین مبلغ هر سفارش فروش در هر دفتر فروش
- id: `sales_b03` · status: draft
```sql
SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) / NULLIF(COUNT(DISTINCT [Fact_Sales].[OrderRef]), 0) AS [AvgOrderValue] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name] ORDER BY [AvgOrderValue] DESC
```

### به کدام مشتری‌ها بیشترین تخفیف داده شده است؟
- id: `sales_b04` · status: draft
```sql
SELECT TOP 20 [Dim_Customer].[CustomerName], SUM([Fact_Sales].[ReductionAmount]) AS [Discount] FROM [Fact_Sales] INNER JOIN [Dim_Customer] ON [Fact_Sales].[Customer_key] = [Dim_Customer].[Customer_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_Customer].[CustomerName] ORDER BY [Discount] DESC
```

### فروش ناخالص و فروش خالص هر دفتر فروش را کنار هم بیاور
- id: `sales_b05` · status: draft
```sql
SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[Gross Sales]) AS [GrossSales], SUM([Fact_Sales].[EffectiveNetPrice]) AS [NetSales] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name] ORDER BY [NetSales] DESC
```

### سهم هر دفتر فروش از کل فروش خالص به درصد
- id: `sales_b06` · status: draft
```sql
SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) * 100.0 / SUM(SUM([Fact_Sales].[EffectiveNetPrice])) OVER () AS [SharePct] FROM [Fact_Sales] INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name] ORDER BY [SharePct] DESC
```

### از کدام مشتری‌ها بیشترین مبلغ وصول شده است؟
- id: `sales_b07` · status: draft
```sql
SELECT TOP 20 [Dim_Customer].[CustomerName], SUM([Fact_Vosouli].[Amount]) AS [Collected] FROM [Fact_Vosouli] INNER JOIN [Dim_Customer] ON [Fact_Vosouli].[Customer_Key] = [Dim_Customer].[Customer_key] GROUP BY [Dim_Customer].[CustomerName] ORDER BY [Collected] DESC
```

### موجودی قابل استفاده محصولات در هر انبار
- id: `sales_b08` · status: draft
```sql
SELECT [Dim_Store].[StoreName], SUM([Sales_Fact_Inventory].[RemainInventory]) AS [Remain] FROM [Sales_Fact_Inventory] INNER JOIN [Dim_Store] ON [Sales_Fact_Inventory].[Store_Key] = [Dim_Store].[Store_key] GROUP BY [Dim_Store].[StoreName] ORDER BY [Remain] DESC
```

### تعداد اقلام سفارش فروش به تفکیک وضعیت
- id: `sales_b09` · status: draft
```sql
SELECT [Dim_State].[StateName], COUNT(*) AS [Items] FROM [Fact_Sales] INNER JOIN [Dim_State] ON [Fact_Sales].[OrderItemState_Key] = [Dim_State].[State_Key] GROUP BY [Dim_State].[StateName] ORDER BY [Items] DESC
```

### کدام محصولات بیشتر از همه مرجوع شده‌اند (تعداد و مبلغ)؟
- id: `sales_b10` · status: draft
```sql
SELECT TOP 20 [Dim_Product].[ProductName], SUM([Fact_ReturnedProduct].[Quantity]) AS [ReturnedQty], SUM([Fact_ReturnedProduct].[EffectiveNetPrice]) AS [ReturnedAmount] FROM [Fact_ReturnedProduct] INNER JOIN [Dim_Product] ON [Fact_ReturnedProduct].[Product_Key] = [Dim_Product].[Product_key] GROUP BY [Dim_Product].[ProductName] ORDER BY [ReturnedAmount] DESC
```

### روند ماهانه وصولی‌ها در سال میلادی جاری
- id: `sales_b11` · status: draft
```sql
SELECT MONTH([Fact_Vosouli].[ItemDate]) AS [Month], SUM([Fact_Vosouli].[Amount]) AS [Collected] FROM [Fact_Vosouli] WHERE YEAR([Fact_Vosouli].[ItemDate]) = YEAR(GETDATE()) GROUP BY MONTH([Fact_Vosouli].[ItemDate]) ORDER BY [Month]
```

### مشتریانی که هیچ سفارش فروشی ندارند
- id: `sales_b12` · status: draft
```sql
SELECT TOP 50 [Dim_Customer].[CustomerNumber], [Dim_Customer].[CustomerName] FROM [Dim_Customer] WHERE NOT EXISTS (SELECT 1 FROM [Fact_Sales] WHERE [Fact_Sales].[Customer_key] = [Dim_Customer].[Customer_key] AND [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7)) ORDER BY [Dim_Customer].[CustomerName]
```

### مبلغ خالص سفارش‌های خرید هر کارشناس خرید
- id: `prc_b01` · status: draft
```sql
SELECT [Dim_PurchasingAgent].[FullName], SUM([Fact_Order].[NetPrice]) AS [NetOrdered] FROM [Fact_Order] INNER JOIN [Dim_PurchasingAgent] ON [Fact_Order].[PurchasingAgent_Key] = [Dim_PurchasingAgent].[PurchasingAgent_Key] GROUP BY [Dim_PurchasingAgent].[FullName] ORDER BY [NetOrdered] DESC
```

### هر تامین‌کننده چند فاکتور خرید انجام‌شده دارد؟
- id: `prc_b02` · status: draft
```sql
SELECT TOP 50 [Procurement_Dim_Supplier].[FullName], COUNT(DISTINCT [Fact_Invoice].[InvoiceRef]) AS [Invoices] FROM [Fact_Invoice] INNER JOIN [Procurement_Dim_Supplier] ON [Fact_Invoice].[Supplier_Key] = [Procurement_Dim_Supplier].[Supplier_Key] WHERE [Fact_Invoice].[State] IN (3, 4, 7) GROUP BY [Procurement_Dim_Supplier].[FullName] ORDER BY [Invoices] DESC
```

### کدام کالاها بیشترین مقدار رسید انبار خرید را داشته‌اند؟
- id: `prc_b03` · status: draft
```sql
SELECT TOP 20 [Dim_Part].[PartName], [Dim_Unit].[UnitName], SUM([Fact_InventoryVoucher].[Quantity]) AS [ReceivedQty] FROM [Fact_InventoryVoucher] INNER JOIN [Dim_Part] ON [Fact_InventoryVoucher].[Part_Key] = [Dim_Part].[Part_Key] INNER JOIN [Dim_Unit] ON [Fact_InventoryVoucher].[Unit_Key] = [Dim_Unit].[Unit_key] WHERE [Fact_InventoryVoucher].[State] <> 4 GROUP BY [Dim_Part].[PartName], [Dim_Unit].[UnitName] ORDER BY [ReceivedQty] DESC
```

### میانگین وزنی نرخ خرید هر کالا در فاکتورهای خرید
- id: `prc_b04` · status: draft
```sql
SELECT TOP 50 [Dim_Part].[PartName], SUM([Fact_Invoice].[Price]) / NULLIF(SUM([Fact_Invoice].[Quantity]), 0) AS [AvgUnitPrice] FROM [Fact_Invoice] INNER JOIN [Dim_Part] ON [Fact_Invoice].[Part_Key] = [Dim_Part].[Part_Key] GROUP BY [Dim_Part].[PartName] ORDER BY [AvgUnitPrice] DESC
```

### هر واحد خرید چند قلم درخواست خرید در انتظار تأیید دارد؟
- id: `prc_b05` · status: draft
```sql
SELECT [Procurement_Dim_PurchasingDepartment].[Title], COUNT(*) AS [PendingItems] FROM [Fact_PurchaseRequest] INNER JOIN [Procurement_Dim_PurchasingDepartment] ON [Fact_PurchaseRequest].[PurchasingDepartment_Key] = [Procurement_Dim_PurchasingDepartment].[PurchasingDepartment_Key] WHERE [Fact_PurchaseRequest].[State_PR] IN (1, 2) GROUP BY [Procurement_Dim_PurchasingDepartment].[Title] ORDER BY [PendingItems] DESC
```

### مبلغ خالص دستورهای خرید به تفکیک نوع خرید
- id: `prc_b06` · status: draft
```sql
SELECT [Dim_PurchaseType].[Title], SUM([Fact_Purchase].[NetPrice_PO]) AS [NetPO] FROM [Fact_Purchase] INNER JOIN [Dim_PurchaseType] ON [Fact_Purchase].[PurchaseType_Key] = [Dim_PurchaseType].[PurchaseType_Key] GROUP BY [Dim_PurchaseType].[Title] ORDER BY [NetPO] DESC
```

### مقدار تحویل‌شده هر کالا از تامین‌کنندگان به تفکیک واحد
- id: `prc_b07` · status: draft
```sql
SELECT TOP 20 [Dim_Part].[PartName], [Dim_Unit].[UnitName], SUM([Procurement_Fact_Delivery].[Quantity]) AS [DeliveredQty] FROM [Procurement_Fact_Delivery] INNER JOIN [Dim_Part] ON [Procurement_Fact_Delivery].[Part_Key] = [Dim_Part].[Part_Key] INNER JOIN [Dim_Unit] ON [Procurement_Fact_Delivery].[Unit_Key] = [Dim_Unit].[Unit_key] GROUP BY [Dim_Part].[PartName], [Dim_Unit].[UnitName] ORDER BY [DeliveredQty] DESC
```

### مبلغ پیش‌فاکتورهایی که به دستور خرید تبدیل شده‌اند به تفکیک کارشناس خرید
- id: `prc_b08` · status: draft
```sql
SELECT [Dim_PurchasingAgent].[FullName], SUM([Fact_Quotation].[NetPrice]) AS [OrderedQuotations] FROM [Fact_Quotation] INNER JOIN [Dim_PurchasingAgent] ON [Fact_Quotation].[PurchasingAgent_Key] = [Dim_PurchasingAgent].[PurchasingAgent_Key] WHERE [Fact_Quotation].[State] = 8 GROUP BY [Dim_PurchasingAgent].[FullName] ORDER BY [OrderedQuotations] DESC
```

### مبلغ خالص فاکتورهای خرید هر واحد خرید در سال میلادی جاری
- id: `prc_b09` · status: draft
```sql
SELECT [Procurement_Dim_PurchasingDepartment].[Title], SUM([Fact_Invoice].[NetPrice]) AS [NetInvoiced] FROM [Fact_Invoice] INNER JOIN [Procurement_Dim_PurchasingDepartment] ON [Fact_Invoice].[PurchasingDepartment_Key] = [Procurement_Dim_PurchasingDepartment].[PurchasingDepartment_Key] WHERE YEAR([Fact_Invoice].[InvoiceDate]) = YEAR(GETDATE()) GROUP BY [Procurement_Dim_PurchasingDepartment].[Title] ORDER BY [NetInvoiced] DESC
```

### برای کدام کالاها بیشترین استعلام بها گرفته شده است؟
- id: `prc_b10` · status: draft
```sql
SELECT TOP 20 [Dim_Part].[PartName], COUNT(DISTINCT [Fact_Inquiry].[InquiryRef]) AS [Inquiries] FROM [Fact_Inquiry] INNER JOIN [Dim_Part] ON [Fact_Inquiry].[Part_Key] = [Dim_Part].[Part_Key] GROUP BY [Dim_Part].[PartName] ORDER BY [Inquiries] DESC
```

### مبلغ فاکتورهای خرید ارزی به تفکیک ارز، هم به ارز اصلی و هم به ریال
- id: `prc_b11` · status: draft
```sql
SELECT [Sales_Dim_Currency].[Title], SUM([Fact_Invoice].[NetPrice]) AS [NetPrice], SUM([Fact_Invoice].[NetPrice] * ISNULL([Fact_Invoice].[OperationalCurrencyExchangeRate], 1)) AS [NetPriceRial] FROM [Fact_Invoice] INNER JOIN [Sales_Dim_Currency] ON [Fact_Invoice].[Currency_Key] = [Sales_Dim_Currency].[Currency_Key] GROUP BY [Sales_Dim_Currency].[Title] ORDER BY [NetPriceRial] DESC
```

### سفارش‌های خرید معلق یا متوقف‌شده هر تامین‌کننده
- id: `prc_b12` · status: draft
```sql
SELECT TOP 50 [Procurement_Dim_Supplier].[FullName], COUNT(DISTINCT [Fact_Order].[OrderRef]) AS [Orders], SUM([Fact_Order].[NetPrice]) AS [NetPrice] FROM [Fact_Order] INNER JOIN [Procurement_Dim_Supplier] ON [Fact_Order].[Supplier_Key] = [Procurement_Dim_Supplier].[Supplier_Key] WHERE [Fact_Order].[State] IN (5, 6) GROUP BY [Procurement_Dim_Supplier].[FullName] ORDER BY [Orders] DESC
```

### جمع پرداخت‌ها به تفکیک عامل جریان نقدی
- id: `tre_b01` · status: draft
```sql
SELECT [Fact_CashFlow].[CashFlowFactorTitle], SUM([Fact_CashFlow].[Payment]) AS [TotalPayment] FROM [Fact_CashFlow] GROUP BY [Fact_CashFlow].[CashFlowFactorTitle] ORDER BY [TotalPayment] DESC
```

### جمع دریافت‌های ارزی به تفکیک ارز
- id: `tre_b02` · status: draft
```sql
SELECT [Fact_CashFlow].[CurrencyTitle], SUM([Fact_CashFlow].[CurrencyReceipt]) AS [CurrencyReceipt] FROM [Fact_CashFlow] WHERE [Fact_CashFlow].[CurrencyReceipt] <> 0 GROUP BY [Fact_CashFlow].[CurrencyTitle] ORDER BY [CurrencyReceipt] DESC
```

### چک‌های پرداختنی واخواست‌شده به تفکیک طرف مقابل
- id: `tre_b03` · status: draft
```sql
SELECT TOP 50 [Fact_PaymentDocumentDetail].[CounterPartName], COUNT(*) AS [Notes], SUM([Fact_PaymentDocumentDetail].[Amount]) AS [Amount] FROM [Fact_PaymentDocumentDetail] WHERE [Fact_PaymentDocumentDetail].[LastState] = 4 GROUP BY [Fact_PaymentDocumentDetail].[CounterPartName] ORDER BY [Amount] DESC
```

### چک‌های دریافتنی در انتظار وصول که سررسیدشان گذشته است
- id: `tre_b04` · status: draft
```sql
SELECT TOP 50 [Fact_ReceivedDocumentDetail].[SerialNumber], [Fact_ReceivedDocumentDetail].[DLTitle], [Fact_ReceivedDocumentDetail].[BankName], [Fact_ReceivedDocumentDetail].[Amount], [Fact_ReceivedDocumentDetail].[DueDate] FROM [Fact_ReceivedDocumentDetail] WHERE [Fact_ReceivedDocumentDetail].[LastState] = -3 AND [Fact_ReceivedDocumentDetail].[DueDate] < GETDATE() ORDER BY [Fact_ReceivedDocumentDetail].[DueDate]
```

### جمع بدهکار و بستانکار هر حساب کل در اسناد حسابداری
- id: `tre_b05` · status: draft
```sql
SELECT [Fact_Voucher].[GLTitle], SUM([Fact_Voucher].[Debit]) AS [Debit], SUM([Fact_Voucher].[Credit]) AS [Credit] FROM [Fact_Voucher] GROUP BY [Fact_Voucher].[GLTitle] ORDER BY [Debit] DESC
```

### مبلغ اعلامیه‌های پرداخت هر حساب تفصیلی
- id: `tre_b06` · status: draft
```sql
SELECT TOP 20 [Treasury_Dim_DL].[Title], SUM([Fact_PaymentNotice].[Amount]) AS [Amount] FROM [Fact_PaymentNotice] INNER JOIN [Treasury_Dim_DL] ON [Fact_PaymentNotice].[DL_Key] = [Treasury_Dim_DL].[DL_Key] GROUP BY [Treasury_Dim_DL].[Title] ORDER BY [Amount] DESC
```

### مبلغ خالص فاکتورهای خرید ثبت‌شده در خزانه به تفکیک تامین‌کننده
- id: `tre_b07` · status: draft
```sql
SELECT TOP 20 [Procurement_Dim_Supplier].[FullName], SUM([Fact_PurchaseInvoice].[NetPrice]) AS [NetPrice] FROM [Fact_PurchaseInvoice] INNER JOIN [Procurement_Dim_Supplier] ON [Fact_PurchaseInvoice].[Supplier_Key] = [Procurement_Dim_Supplier].[Supplier_Key] GROUP BY [Procurement_Dim_Supplier].[FullName] ORDER BY [NetPrice] DESC
```

### دریافت و پرداخت هر شعبه بانک ملت
- id: `tre_b08` · status: draft
```sql
SELECT [Fact_CashFlow].[BankBranchName], SUM([Fact_CashFlow].[Receipt]) AS [TotalReceipt], SUM([Fact_CashFlow].[Payment]) AS [TotalPayment] FROM [Fact_CashFlow] WHERE [Fact_CashFlow].[BankName] LIKE N'%ملت%' GROUP BY [Fact_CashFlow].[BankBranchName] ORDER BY [TotalReceipt] DESC
```

### چک‌های پرداختنی که در ۳۰ روز آینده سررسید می‌شوند
- id: `tre_b09` · status: draft
```sql
SELECT TOP 100 [Fact_PaymentDocumentDetail].[SerialNumber], [Fact_PaymentDocumentDetail].[CounterPartName], [Fact_PaymentDocumentDetail].[Amount], [Fact_PaymentDocumentDetail].[DueDate] FROM [Fact_PaymentDocumentDetail] WHERE [Fact_PaymentDocumentDetail].[DueDate] >= CAST(GETDATE() AS date) AND [Fact_PaymentDocumentDetail].[DueDate] < DATEADD(DAY, 30, CAST(GETDATE() AS date)) ORDER BY [Fact_PaymentDocumentDetail].[DueDate]
```

### تعداد کارمندان هر نوع قرارداد
- id: `hr_b01` · status: draft
```sql
SELECT [Dim_ContractType].[Description], COUNT(*) AS [Employees] FROM [Fact_Employee] INNER JOIN [Dim_ContractType] ON [Fact_Employee].[ContractType_Key] = [Dim_ContractType].[Contract_Key] GROUP BY [Dim_ContractType].[Description] ORDER BY [Employees] DESC
```

### تعداد کارمندان شاغل هر واحد سازمانی
- id: `hr_b02` · status: draft
```sql
SELECT [Dim_Department].[Description], COUNT(*) AS [Employees] FROM [Fact_Employee] INNER JOIN [Dim_Department] ON [Fact_Employee].[Department_Key] = [Dim_Department].[Department_Key] INNER JOIN [Dim_PersonStatus] ON [Fact_Employee].[PersonStatus_Key] = [Dim_PersonStatus].[PersonStatus_Key] WHERE [Dim_PersonStatus].[Description] LIKE N'%شاغل%' GROUP BY [Dim_Department].[Description] ORDER BY [Employees] DESC
```

### میانگین سابقه کار کارمندان هر واحد سازمانی
- id: `hr_b03` · status: draft
```sql
SELECT [Dim_Department].[Description], AVG(CAST(DATEDIFF(DAY, [Fact_Employee].[StartDate], COALESCE([Fact_Employee].[EndDate], GETDATE())) AS FLOAT)) / 365.25 AS [AvgYears] FROM [Fact_Employee] INNER JOIN [Dim_Department] ON [Fact_Employee].[Department_Key] = [Dim_Department].[Department_Key] WHERE [Fact_Employee].[StartDate] IS NOT NULL GROUP BY [Dim_Department].[Description] ORDER BY [AvgYears] DESC
```

### جمع ساعت اضافه‌کار هر واحد سازمانی
- id: `hr_b04` · status: draft
```sql
SELECT [Dim_Department].[Description], SUM([Fact_EmployeePeriodCalculation].[TotalExtraWorkAmount]) / 60.0 AS [ExtraWorkHours] FROM [Fact_EmployeePeriodCalculation] INNER JOIN [Fact_Employee] ON [Fact_EmployeePeriodCalculation].[Employee_Key] = [Fact_Employee].[Employee_Key] INNER JOIN [Dim_Department] ON [Fact_Employee].[Department_Key] = [Dim_Department].[Department_Key] GROUP BY [Dim_Department].[Description] ORDER BY [ExtraWorkHours] DESC
```

### تعداد روزهای غیبت کارمندان در هر دوره کارکرد
- id: `hr_b05` · status: draft
```sql
SELECT [HR_Dim_TimePeriod].[PeriodName], SUM([Fact_EmployeePeriodCalculation].[AbsenceCount]) AS [Absences] FROM [Fact_EmployeePeriodCalculation] INNER JOIN [HR_Dim_TimePeriod] ON [Fact_EmployeePeriodCalculation].[Period_Key] = [HR_Dim_TimePeriod].[Period_Key] GROUP BY [HR_Dim_TimePeriod].[PeriodName], [HR_Dim_TimePeriod].[StartDate] ORDER BY [HR_Dim_TimePeriod].[StartDate]
```

### تعداد کارمندان هر محل خدمت
- id: `hr_b06` · status: draft
```sql
SELECT [Dim_ServiceArea].[Title], COUNT(*) AS [Employees] FROM [Fact_Employee] INNER JOIN [Dim_ServiceArea] ON [Fact_Employee].[ServiceArea_Key] = [Dim_ServiceArea].[ServiceArea_Key] GROUP BY [Dim_ServiceArea].[Title] ORDER BY [Employees] DESC
```

### مواد مصرفی و مصرف استاندارد فرمول ساخت محصولی که نامش «پمپ» دارد
- id: `bom_b01` · status: draft
```sql
SELECT TOP 100 [BOMDetails].[ProductName], [BOMDetails].[BOMTitle], [BOMDetails].[ConsumptionName], [BOMDetails].[StandardConsumption], [BOMDetails].[UnitName] FROM [BOMDetails] WHERE [BOMDetails].[ProductName] LIKE N'%پمپ%' ORDER BY [BOMDetails].[ProductName], [BOMDetails].[ConsumptionName]
```

### برنامه تولید اصلی (MPS) هر گروه محصول به تفکیک سال و ماه
- id: `bom_b02` · status: draft
```sql
SELECT [Priority].[ProductGroup], [Priority].[Year], [Priority].[Month], SUM([Priority].[MPS]) AS [MPS] FROM [Priority] GROUP BY [Priority].[ProductGroup], [Priority].[Year], [Priority].[Month] ORDER BY [Priority].[Year], [Priority].[Month], [Priority].[ProductGroup]
```

### هر محصول چند فرمول ساخت دارد؟
- id: `bom_b03` · status: draft
```sql
SELECT TOP 50 [BOMDetails].[ProductName], COUNT(DISTINCT [BOMDetails].[BOMCode]) AS [BOMs] FROM [BOMDetails] GROUP BY [BOMDetails].[ProductName] ORDER BY [BOMs] DESC
```

### مقدار اقلام اسناد انبار هر شعبه به تفکیک دسته سند
- id: `inv_b01` · status: draft
```sql
SELECT [Fact_ntsw].[BranchName], [Fact_ntsw].[InventoryVoucherCategory], SUM([Fact_ntsw].[Quantity]) AS [Qty] FROM [Fact_ntsw] GROUP BY [Fact_ntsw].[BranchName], [Fact_ntsw].[InventoryVoucherCategory] ORDER BY [Fact_ntsw].[BranchName], [Qty] DESC
```

### پرگردش‌ترین کالاها در اسناد انبار کدامند؟
- id: `inv_b02` · status: draft
```sql
SELECT TOP 20 [Fact_ntsw].[PartCode], [Fact_ntsw].[PartName], COUNT(*) AS [Lines], SUM([Fact_ntsw].[Quantity]) AS [Qty] FROM [Fact_ntsw] GROUP BY [Fact_ntsw].[PartCode], [Fact_ntsw].[PartName] ORDER BY [Lines] DESC
```

### مجموع مالیات اسناد خرید و فروش هر فروشنده
- id: `inv_b03` · status: draft
```sql
SELECT TOP 20 [Fact_Documents].[Seller], SUM([Fact_Documents].[PriceTax]) AS [Tax] FROM [Fact_Documents] GROUP BY [Fact_Documents].[Seller] ORDER BY [Tax] DESC
```

### برای ۲۰ محصول پرفروش، فروش خالص و موجودی فعلی انبار را کنار هم نشان بده
- id: `x_b01` · status: draft
```sql
SELECT TOP 20 [s].[ProductName], [s].[NetSales], [i].[Remain] FROM (SELECT [Dim_Product].[Product_key], [Dim_Product].[ProductName], SUM([Fact_Sales].[EffectiveNetPrice]) AS [NetSales] FROM [Fact_Sales] INNER JOIN [Dim_Product] ON [Fact_Sales].[Product_key] = [Dim_Product].[Product_key] WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_Product].[Product_key], [Dim_Product].[ProductName]) AS [s] LEFT JOIN (SELECT [Sales_Fact_Inventory].[Product_Key], SUM([Sales_Fact_Inventory].[RemainInventory]) AS [Remain] FROM [Sales_Fact_Inventory] GROUP BY [Sales_Fact_Inventory].[Product_Key]) AS [i] ON [s].[Product_key] = [i].[Product_Key] ORDER BY [s].[NetSales] DESC
```

### فروش خالص هر ماه شمسی در سال ۱۴۰۲
- id: `date_b01` · status: draft
```sql
SELECT [Dim_Date].[PersianMonthNumberOfYear], [Dim_Date].[PersianMonthName], SUM([Fact_Sales].[EffectiveNetPrice]) AS [NetSales] FROM [Fact_Sales] INNER JOIN [Dim_Date] ON TRY_CAST([Dim_Date].[FullDateAlternateKey] AS date) = CAST([Fact_Sales].[OrderDate] AS date) WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) AND [Dim_Date].[PersianCalendarYear] = 1402 GROUP BY [Dim_Date].[PersianMonthNumberOfYear], [Dim_Date].[PersianMonthName] ORDER BY [Dim_Date].[PersianMonthNumberOfYear]
```

### در هر سال شمسی چند نفر استخدام شده‌اند؟
- id: `date_b02` · status: draft
```sql
SELECT [Dim_Date].[PersianCalendarYear], COUNT(*) AS [Hired] FROM [Fact_Employee] INNER JOIN [Dim_Date] ON TRY_CAST([Dim_Date].[FullDateAlternateKey] AS date) = CAST([Fact_Employee].[StartDate] AS date) GROUP BY [Dim_Date].[PersianCalendarYear] ORDER BY [Dim_Date].[PersianCalendarYear]
```

### مبلغ خالص فاکتورهای خرید در هر فصل امسال
- id: `date_b03` · status: draft
```sql
SELECT [Dim_Date].[PersianCalendarSeason], [Dim_Date].[PersianSeasonName], SUM([Fact_Invoice].[NetPrice]) AS [NetInvoiced] FROM [Fact_Invoice] INNER JOIN [Dim_Date] ON TRY_CAST([Dim_Date].[FullDateAlternateKey] AS date) = CAST([Fact_Invoice].[InvoiceDate] AS date) WHERE [Dim_Date].[PersianCalendarYear] = (SELECT MAX([PersianCalendarYear]) FROM [Dim_Date] WHERE TRY_CAST([FullDateAlternateKey] AS date) = CAST(GETDATE() AS date)) GROUP BY [Dim_Date].[PersianCalendarSeason], [Dim_Date].[PersianSeasonName] ORDER BY [Dim_Date].[PersianCalendarSeason]
```

### دریافت و پرداخت جریان نقدی به تفکیک ماه شمسی در سال ۱۴۰۴
- id: `date_b04` · status: draft
```sql
SELECT [Dim_Date].[PersianMonthNumberOfYear], SUM([Fact_CashFlow].[Receipt]) AS [TotalReceipt], SUM([Fact_CashFlow].[Payment]) AS [TotalPayment] FROM [Fact_CashFlow] INNER JOIN [Dim_Date] ON TRY_CAST([Dim_Date].[FullDateAlternateKey] AS date) = CAST([Fact_CashFlow].[ItemDate] AS date) WHERE [Dim_Date].[PersianCalendarYear] = 1404 GROUP BY [Dim_Date].[PersianMonthNumberOfYear] ORDER BY [Dim_Date].[PersianMonthNumberOfYear]
```
