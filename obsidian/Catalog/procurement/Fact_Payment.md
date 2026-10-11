---
type: table
domain: procurement
source: "[PRC].[Fact_Payment_2]"
synonyms:
  - "پرداخت خرید"
  - "زنجیره پرداخت"
tags: [catalog, domain/procurement, needs-review]
---
> زنجیره پرداخت خرید: اطلاعات پرداخت، درخواست، دستور و پرداخت

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `PayInfo_ID` | bigint | شناسه اطلاعات پرداخت | yes |
| `PayInfo_Number` | nvarchar | شماره اطلاعات پرداخت | yes |
| `PayInfo_Date` | datetime | تاریخ اطلاعات پرداخت | yes |
| `CurrencyRef` | bigint | مرجع ارز | yes |
| `FiscalYearRef` | bigint | مرجع سال مالی | yes |
| `PayInfo_State` | int | کد وضعیت: 1=ثبت شده، 3=تایید شده | yes |
| `PayInfoItem_ID` | bigint | شناسه قلم اطلاعات پرداخت | hidden |
| `PayInfoItem_RefNumber` | nvarchar | مرجع شماره قلم اطلاعات پرداخت | yes |
| `PayInfoItem_RefType` | int | مرجع نوع قلم اطلاعات پرداخت | yes |
| `PayInfoItem_PaymentAmountInReferenceCurrency` | decimal | مبلغ مرجع ارز به پرداخت قلم اطلاعات پرداخت | yes |
| `PayInfoItem_PaymentAmount` | decimal | مبلغ پرداخت قلم اطلاعات پرداخت | yes |
| `PayInfoItem_ReferenceCurrencyRef` | bigint | مرجع مرجع ارز قلم اطلاعات پرداخت | yes |
| `PayReq_ID` | bigint | شناسه پرداخت درخواست | yes |
| `PayReq_Number` | nvarchar | شماره پرداخت درخواست | yes |
| `PayReq_Quantity` | decimal | مقدار پرداخت درخواست | yes |
| `PayReq_ReferenceAmount` | decimal | مرجع مبلغ پرداخت درخواست | yes |
| `PayReqItem_ID` | bigint | شناسه پرداخت درخواست قلم | hidden |
| `PayReqItem_Amount` | decimal | مبلغ پرداخت درخواست قلم | yes |
| `PayReqItem_PaymentDate` | datetime | تاریخ پرداخت درخواست قلم پرداخت | yes |
| `PayReqItem_State` | int | کد وضعیت: 1=ثبت موقت، 2=تایید شده، 3=خاتمه یافته، 4=در حال استفاده، 5=بسته شده، 6=باطل شده | yes |
| `PayReqItem_Quantity` | decimal | مقدار پرداخت درخواست قلم | yes |
| `PayOrder_ID` | bigint | شناسه سفارش پرداخت | yes |
| `PayOrder_Number` | nvarchar | شماره سفارش پرداخت | yes |
| `PayOrder_Date` | datetime | تاریخ سفارش پرداخت | yes |
| `PayOrder_State` | int | کد وضعیت: 1=ثبت موقت، 2=تایید شده، 3=در انتظار پرداخت، 4=پرداخت شده، 5=ابطال شده | yes |
| `PayOrder_ApproveDate` | datetime | تاریخ تأیید سفارش پرداخت | yes |
| `Pay_ID` | bigint | شناسه پرداخت | yes |
| `Pay_Number` | nvarchar | شماره پرداخت | yes |
| `Pay_Date` | datetime | تاریخ پرداخت | yes |
| `CounterPart_Key` | udt_surrogate_key | کلید طرف مقابل (تامین‌کننده یا شخص؟) | review |
| `Pay_ApproveDate` | datetime | تاریخ تأیید پرداخت | yes |
| `Pay_ApproveState` | int | کد وضعیت: 1=ثبت شده، 2=تایید شده، 3=سند صادر شده، 4=باطل شده | yes |
| `TotalOperationalCurrencyAmount` | decimal | جمع مبلغ به ریال | yes |
| `Invoice_ID` | bigint | شناسه فاکتور | yes |
| `Order_ID` | bigint | شناسه سفارش | yes |
| `PayOrder_DepositAmount` | decimal | مبلغ واریز سفارش پرداخت | yes |
| `PayInfo_Creator` | bigint |  | hidden |
| `Report_Pay_Date` | datetime |  | hidden |
| `cf_payDuration` | decimal |  | hidden |
| `cf_payDate` | datetime |  | hidden |
| `Invoice_Fee` | decimal | نرخ واحد فاکتور | yes |
| `Order_Fee` | decimal | نرخ واحد سفارش | yes |
| `PartID` | bigint | شناسه کالا | yes |
| `PayInfo_CreationDate` | datetime | تاریخ ایجاد اطلاعات پرداخت | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
