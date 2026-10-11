---
type: table
domain: sales
source: "[dbo].[Fact_Sales]"
core: true
synonyms:
  - "فروش"
  - "سفارش فروش"
  - "فاکتور فروش"
  - "درآمد"
  - "مبیعات"
tags: [catalog, domain/sales, core]
---
> اقلام فروش؛ هر ردیف یک قلم از یک سفارش فروش

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `OrderRef` | bigint | مرجع سفارش (برای شمارش سفارش‌ها) | yes |
| `OrderNumber` | nvarchar | شماره سفارش | yes |
| `OrderDate` | datetime | تاریخ سفارش | yes |
| `Customer_key` | bigint | کلید اتصال به مشتریان | yes |
| `SalesOffice_Key` | udt_surrogate_key | کلید اتصال به دفاتر فروش | yes |
| `OrderItemNumber` | bigint | شماره قلم سفارش | yes |
| `OrderItemState_Key` | udt_surrogate_key | کلید اتصال به وضعیت‌های اقلام سفارش | yes |
| `Product_key` | udt_surrogate_key | کلید اتصال به محصولات قابل فروش با دسته‌بندی | yes |
| `Quantity` | decimal | مقدار / تعداد | yes |
| `Currency_Key` | udt_surrogate_key | کلید اتصال به ارزها | yes |
| `OperationalCurrencyExchangeRate` | decimal | نرخ تبدیل ارز به ریال | yes |
| `Fee` | decimal | نرخ واحد (قیمت هر واحد) | yes |
| `ReductionAmount` | decimal | مبلغ تخفیف | yes |
| `AdditionAmount` | decimal | مبلغ اضافات | yes |
| `Gross Sales` | decimal | فروش ناخالص | yes |
| `EffectiveNetPrice` | decimal | مبلغ خالص موثر (فروش خالص) | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Customer_key` → [[Dim_Customer]] `Customer_key` (inferred)
- `SalesOffice_Key` → [[Dim_SalesOffice]] `SalesOffice_key` (inferred)
- `OrderItemState_Key` → [[Dim_State]] `State_Key`
- `Product_key` → [[Dim_Product]] `Product_key` (inferred)
- `Currency_Key` → [[Sales_Dim_Currency]] `Currency_Key`
