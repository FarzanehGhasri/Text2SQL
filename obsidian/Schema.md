---
type: generated
tags: [catalog, schema]
---
> Written by `scripts/build-schema-note.js` from `catalog/*.json` (indexer-watch, every minute). Do not edit:
> edit the notes in `Catalog/` - this page follows within a minute.

# Schema
Every table of `SA_DataWarehouse` the model knows: 152 tables in 7 domains. ⭐ = the domain's core table.
Columns, synonyms and links are in each table note; rules, metrics and examples in each domain note.
*Links to* = the catalog `joins` of the table: the other table and the column(s) the join uses
(inferred from matching column names, unless marked FK).
Back to [[Home]].

## bom - فرمول ساخت
Domain note: [[bom]] · 3 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-bom`
Metrics: مصرف استاندارد، تعداد ماده مصرفی

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[BOMDetails]] ⭐ | فرمول ساخت (BOM): مواد مصرفی هر محصول | فرمول ساخت، بی او ام، مواد مصرفی، درخت محصول | `[BOM].[BOMDetails]` | 13 | - |
| [[Priority]] | اولویت تولید محصولات و فرمول‌ها به تفکیک ماه | اولویت تولید، برنامه تولید، MPS | `[BOM].[Priority_2]` | 13 | - |
| [[StockParts]] | موجودی قطعات | موجودی قطعات | `[BOM].[StockParts]` | 2 | - |

## hr - منابع انسانی
Domain note: [[hr]] · 20 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-hr`
Metrics: تعداد کارمندان، سابقه کار، اضافه‌کار، مرخصی، غیبت

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[Fact_Employee]] ⭐ | کارمندان با مشخصات سازمانی | کارمند، پرسنل، کارکنان، نیرو | `[HR].[Fact_Employee]` | 19 | [[Dim_Gender]] (`Gender_Key`), [[Dim_MaritalStatus]] (`MaritalStatus_Key` → `Marital_Key`), [[Dim_ServiceArea]] (`ServiceArea_Key`), [[Dim_ContractType]] (`ContractType_Key` → `Contract_Key`), [[Dim_Company]] (`Company_Key`), [[Dim_Department]] (`Department_Key`), [[Dim_SubDepartment]] (`SubDepartment_Key`), [[Dim_Job]] (`Job_Key`), [[Dim_JobPost]] (`JobPost_Key`), [[Dim_Education]] (`Education_Key`), [[Dim_PersonStatus]] (`PersonStatus_Key`) |
| [[Dim_BirthDay]] | تاریخ تولد کارمندان | تولد، سن | `[HR].[Dim_BirthDay]` | 3 | - |
| [[Dim_Company]] | شرکت‌ها | شرکت | `[HR].[Dim_Company]` | 2 | - |
| [[Dim_ContractType]] | انواع قرارداد | نوع قرارداد، قرارداد | `[HR].[Dim_ContractType]` | 2 | - |
| [[Dim_Department]] | واحدهای سازمانی | واحد، دپارتمان، بخش | `[HR].[Dim_Department]` | 2 | - |
| [[Dim_Education]] | مدارک تحصیلی | تحصیلات، مدرک | `[HR].[Dim_Education]` | 2 | - |
| [[Dim_Gender]] | جنسیت | جنسیت، زن، مرد | `[HR].[Dim_Gender]` | 2 | - |
| [[Dim_Job]] | شغل‌ها | شغل | `[HR].[Dim_Job]` | 2 | - |
| [[Dim_JobPost]] | پست‌های سازمانی | پست، سمت | `[HR].[Dim_JobPost]` | 2 | - |
| [[Dim_MaritalStatus]] | وضعیت تاهل | تاهل، متاهل، مجرد | `[HR].[Dim_MaritalStatus]` | 2 | - |
| [[Dim_Mission]] | انواع مأموریت | مأموریت، ماموریت | `[HR].[Dim_Mission]` | 2 | - |
| [[Dim_PersonStatus]] | وضعیت پرسنلی (شاغل، بازنشسته...) | وضعیت پرسنل، شاغل | `[HR].[Dim_PersonStatus]` | 2 | - |
| [[Dim_Section]] | قسمت‌ها | قسمت | `[HR].[Dim_Section]` | 2 | - |
| [[Dim_ServiceArea]] | محل‌های خدمت | محل خدمت | `[HR].[Dim_ServiceArea]` | 2 | - |
| [[Dim_SubDepartment]] | زیرواحدهای سازمانی | زیرواحد | `[HR].[Dim_SubDepartment]` | 2 | - |
| [[Dim_Vacation]] | انواع مرخصی | نوع مرخصی | `[HR].[Dim_Vacation]` | 2 | - |
| [[Fact_EmployeePeriodCalculation]] | کارکرد ماهانه هر کارمند: حضور، غیبت، مرخصی، اضافه‌کار | کارکرد، حضور و غیاب، اضافه کار، مرخصی | `[HR].[Fact_EmployeePeriodCalculation]` | 33 | [[Fact_Employee]] (`Employee_Key`), [[HR_Dim_TimePeriod]] (`Period_Key`), [[HR_Dim_WorkingYear]] (`WorkingYear_Key`), [[Dim_Vacation]] (`Vacation_Key`), [[Dim_Mission]] (`Mission_Key`) |
| [[HR_Dim_Status]] | وضعیت‌ها |  | `[HR].[Dim_Status]` | 2 | - |
| [[HR_Dim_TimePeriod]] | دوره‌های کارکرد | دوره، ماه کارکرد | `[HR].[Dim_TimePeriod]` | 5 | - |
| [[HR_Dim_WorkingYear]] | سال‌های کاری | سال کاری | `[HR].[Dim_WorkingYear]` | 4 | - |

## inventory_docs - اسناد انبار
Domain note: [[inventory_docs]] · 6 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-inventory_docs`
Metrics: مقدار اسناد انبار، مبلغ نهایی اسناد، مالیات اسناد

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[Fact_ntsw]] ⭐ | اقلام اسناد انبار: رسید و حواله | سند انبار، اسناد انبار، رسید، حواله | `[NTSW].[Fact_ntsw]` | 22 | - |
| [[Dim_DocumentType]] | انواع سند | نوع سند | `[NTSW].[Dim_DocumentType]` | 1 | - |
| [[Dim_FloorPart]] | طبقات کالا | طبقه کالا | `[NTSW].[Dim_FloorPart]` | 1 | - |
| [[Dim_GroupPart]] | گروه‌های کالا | گروه کالا | `[NTSW].[Dim_GroupPart]` | 1 | - |
| [[Fact_Documents]] | اسناد خرید/فروش با قیمت و مالیات | سند، فاکتور | `[NTSW].[Fact_Documents]` | 26 | - |
| [[Inventory_Dim_Status]] | وضعیت‌ها |  | `[NTSW].[Dim_Status]` | 1 | - |

## procurement - خرید و تدارکات
Domain note: [[procurement]] · 44 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-procurement`
Metrics: مبلغ خالص فاکتور خرید، مبلغ ریالی فاکتور خرید، تعداد فاکتور خرید، مبلغ خالص سفارش خرید، تعداد سفارش خرید، مبلغ خالص دستور خرید، تعداد دستور خرید، تعداد درخواست خرید، مقدار رسید انبار، میانگین نرخ خرید

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[Fact_Purchase]] ⭐ | زنجیره خرید: درخواست، دستور خرید و سفارش هر قلم در یک ردیف | خرید، زنجیره خرید، فرایند خرید | `[PRC].[Fact_Purchase_2]` | 38 | [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Procurement_Dim_Supplier]] (`Supplier_Key_O` → `Supplier_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Dim_Part]] (`Part_Key`), [[Sales_Dim_Currency]] (`Currency_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`), [[Dim_PurchaseType]] (`PurchaseType_Key`), [[Dim_CounterpartType]] (`CounterpartType_Key`), [[Procurement_Dim_UserPurchaseType]] (`UserPurchasetype_Key` → `UserPurchaseType_Key`), [[Procurement_Dim_PurchaseRequestType]] (`PurchaseRequestType_Key`) |
| [[Dim_CounterpartType]] | انواع طرف مقابل | نوع طرف مقابل | `[PRC].[Dim_CounterpartType]` | 2 | - |
| [[Dim_DeliveryState]] | وضعیت‌های تحویل | وضعیت تحویل | `[PRC].[Dim_DeliveryState]` | 2 | - |
| [[Dim_InventoryVoucherState]] | وضعیت‌های رسید انبار | وضعیت رسید | `[PRC].[Dim_InventoryVoucherState]` | 2 | - |
| [[Dim_InvoiceState]] | وضعیت‌های فاکتور | وضعیت فاکتور | `[PRC].[Dim_InvoiceState]` | 2 | - |
| [[Dim_PayInfoState]] | وضعیت‌های اطلاعات پرداخت |  | `[PRC].[Dim_PayInfoState]` | 2 | - |
| [[Dim_PaymentMethod]] | روش‌های پرداخت | روش پرداخت، نحوه پرداخت | `[PRC].[Dim_PaymentMethod]` | 2 | - |
| [[Dim_PaymentRefType]] | انواع مرجع پرداخت |  | `[PRC].[Dim_PaymentRefType]` | 2 | - |
| [[Dim_PayOrderState]] | وضعیت‌های دستور پرداخت |  | `[PRC].[Dim_PayOrderState]` | 2 | - |
| [[Dim_PayReqState]] | وضعیت‌های درخواست پرداخت |  | `[PRC].[Dim_PayReqState]` | 2 | - |
| [[Dim_PayState]] | وضعیت‌های پرداخت | وضعیت پرداخت | `[PRC].[Dim_PayState]` | 2 | - |
| [[Dim_PurchaseMethod]] | روش‌های خرید | روش خرید، رویه خرید | `[PRC].[Dim_PurchaseMethod]` | 2 | - |
| [[Dim_PurchaseState]] | وضعیت‌های خرید | وضعیت خرید، وضعیت درخواست | `[PRC].[Dim_PurchaseState]` | 3 | - |
| [[Dim_PurchaseType]] | انواع خرید (داخلی، خارجی...) | نوع خرید | `[PRC].[Dim_PurchaseType]` | 2 | - |
| [[Dim_PurchasingAgent]] | کارشناسان خرید | کارشناس خرید، مسئول خرید، خریدار | `[PRC].[Dim_PurchasingAgent_2]` | 4 | - |
| [[Dim_QuotationState]] | وضعیت‌های پیش‌فاکتور | وضعیت پیش فاکتور | `[PRC].[Dim_QuotationState]` | 2 | - |
| [[Dim_TransportType]] | انواع حمل | نوع حمل، روش حمل | `[PRC].[Dim_TransportType]` | 2 | - |
| [[Fact_CashFlowFactorGrouping]] | گروه‌بندی عوامل جریان نقدی (درختی) | گروه جریان نقدی | `[PRC].[Fact_CashFlowFactorGrouping]` | 6 | - |
| [[Fact_DeliveryReturnReport]] | گزارش برگشت از تحویل خرید | برگشت خرید، برگشت به تامین کننده | `[RPT].[Fact_DeliveryReturnReport]` | 15 | [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`) |
| [[Fact_Inquiry]] | اقلام استعلام بها از تامین‌کنندگان | استعلام، استعلام بها | `[PRC].[Fact_Inquiry_2]` | 12 | [[Dim_Part]] (`Part_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_key` → `PurchasingDepartment_Key`), [[Procurement_Dim_Supplier]] (`Supplier_Key`) |
| [[Fact_Inquiry_Process]] | ردیابی کامل فرایند خرید یک قلم از درخواست تا فاکتور | پیگیری خرید، فرایند خرید، ردیابی سفارش، وضعیت خرید | `[PRC].[Fact_Inquiry_Process]` | 50 | - |
| [[Fact_InquiryReport]] | گزارش اقلام استعلام | گزارش استعلام | `[RPT].[Fact_InquiryReport]` | 11 | [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`) |
| [[Fact_InventoryVoucher]] | اقلام رسید انبار خرید | رسید انبار، رسید | `[PRC].[Fact_InventoryVoucher]` | 10 | [[Dim_Part]] (`Part_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Dim_Store]] (`Store_Key` → `Store_key`) |
| [[Fact_Invoice]] | اقلام فاکتور خرید | فاکتور خرید، فاکتور تامین کننده | `[PRC].[Fact_Invoice_2]` | 19 | [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Dim_Part]] (`Part_Key`), [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Sales_Dim_Currency]] (`Currency_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`) |
| [[Fact_Order]] | اقلام سفارش خرید به تامین‌کننده | سفارش خرید، سفارش به تامین کننده | `[PRC].[Fact_Order_2]` | 19 | [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Dim_Part]] (`Part_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_Currency]] (`Currency_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`) |
| [[Fact_OrderReport]] | گزارش اقلام سفارش خرید | گزارش سفارش | `[RPT].[Fact_OrderReport]` | 16 | [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_Currency]] (`Currency_Key`) |
| [[Fact_Pay]] | پرداخت‌های انجام‌شده خرید | پرداخت | `[PRC].[Fact_Pay]` | 8 | [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`) |
| [[Fact_Payment]] | زنجیره پرداخت خرید: اطلاعات پرداخت، درخواست، دستور و پرداخت | پرداخت خرید، زنجیره پرداخت | `[PRC].[Fact_Payment_2]` | 38 | - |
| [[Fact_PaymentInfo]] | اقلام اطلاعات پرداخت خرید | اطلاعات پرداخت | `[PRC].[Fact_PaymentInfo_2]` | 10 | [[Sales_Dim_Currency]] (`Currency_Key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`) |
| [[Fact_PaymentReq]] | اقلام درخواست پرداخت خرید | درخواست پرداخت | `[PRC].[Fact_PaymentReq]` | 11 | [[Sales_Dim_Currency]] (`Currency_Key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`) |
| [[Fact_PurchaseOrder]] | اقلام دستور خرید | دستور خرید | `[PRC].[Fact_PurchaseOrder_2]` | 19 | [[Dim_Part]] (`Part_Key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_Currency]] (`Currency_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`) |
| [[Fact_PurchaseOrderReport]] | گزارش اقلام دستور خرید | گزارش دستور خرید | `[RPT].[Fact_PurchaseOrderReport]` | 23 | [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Sales_Dim_Currency]] (`Currency_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`) |
| [[Fact_PurchaseRequest]] | اقلام درخواست خرید | درخواست خرید، درخواست | `[PRC].[Fact_PurchaseRequest_2]` | 18 | [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Dim_Part]] (`Part_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Dim_CounterpartType]] (`CounterpartType_Key`), [[Procurement_Dim_PurchaseRequestType]] (`PurchaseRequestType_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`), [[Procurement_Dim_UserPurchaseType]] (`UserPurchaseType_Key`) |
| [[Fact_PurchaseRequestReport]] | گزارش اقلام درخواست خرید | گزارش درخواست خرید | `[RPT].[Fact_PurchaseRequestReport]` | 14 | [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`) |
| [[Fact_Quotation]] | اقلام پیش‌فاکتور دریافتی از تامین‌کنندگان | پیش فاکتور، پیشنهاد قیمت | `[PRC].[Fact_Quotation_2]` | 25 | [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Dim_Part]] (`Part_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Sales_Dim_Currency]] (`Currency_Key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`) |
| [[Fact_UnionReport]] | گزارش ترکیبی اسناد خرید | گزارش ترکیبی | `[RPT].[Fact_UnionReport]` | 9 | - |
| [[PaymentReceiveInfo]] | گزارش تجمیعی اطلاعات دریافت و پرداخت خرید با نام ستون‌های فارسی | گزارش پرداخت، اطلاعات دریافت پرداخت | `[PRC].[PaymentReceiveInfo]` | 37 | - |
| [[Procurement_Dim_PurchaseRequestType]] | انواع درخواست خرید | نوع درخواست خرید | `[PRC].[Dim_PurchaseRequestType]` | 2 | - |
| [[Procurement_Dim_PurchasingDepartment]] | واحدهای خرید | واحد خرید، دپارتمان خرید | `[PRC].[Dim_PurchasingDepartment]` | 3 | - |
| [[Procurement_Dim_User]] | کاربران سیستم خرید | کاربر | `[PRC].[Dim_User]` | 3 | - |
| [[Procurement_Dim_UserPurchaseType]] | انواع خرید کاربر | نوع خرید کاربر | `[PRC].[Dim_UserPurchaseType]` | 4 | - |
| [[Procurement_Fact_Delivery]] | اقلام تحویل کالا از تامین‌کننده | تحویل خرید، تحویل از تامین کننده | `[PRC].[Fact_Delivery_2]` | 11 | [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Procurement_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`), [[Dim_PurchasingAgent]] (`PurchasingAgent_Key`), [[Dim_Part]] (`Part_Key`) |
| [[Procurement_Fact_Inventory]] | پیوند رسید انبار، تحویل، سفارش و فاکتور خرید هر قلم | رسید و فاکتور، تطبیق خرید | `[PRC].[Fact_Inventory_2]` | 27 | [[Dim_InventoryVoucherState]] (`StateVoucher_Key` → `InventoryVoucherState_Key`), [[Dim_Part]] (`Part_Key`), [[Dim_Unit]] (`Unit_Key` → `Unit_key`), [[Dim_Store]] (`Store_Key` → `Store_key`), [[Dim_DeliveryState]] (`StateDelivery_Key` → `DeliveryState_Key`), [[Dim_InvoiceState]] (`StateInvoice_Key` → `InvoiceState_Key`), [[Procurement_Dim_Supplier]] (`SupplierInvoice_Key` → `Supplier_Key`) |
| [[Procurement_Fact_PaymentOrder]] | دستورهای پرداخت خرید | دستور پرداخت | `[PRC].[Fact_PaymentOrder]` | 9 | [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Treasury_Dim_Currency]] (`DepositCurrency_Key` → `Currency_Key`) |

## sales - فروش
Domain note: [[sales]] · 22 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-sales`
Metrics: فروش خالص، فروش ناخالص، تعداد سفارش فروش، مقدار فروش، تخفیف فروش، میانگین مبلغ سفارش فروش، برگشت از فروش، وصولی، موجودی محصول

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[Fact_Sales]] ⭐ | اقلام فروش؛ هر ردیف یک قلم از یک سفارش فروش | فروش، سفارش فروش، فاکتور فروش، درآمد | `[dbo].[Fact_Sales]` | 16 | [[Dim_Customer]] (`Customer_key`), [[Dim_SalesOffice]] (`SalesOffice_Key` → `SalesOffice_key`), [[Dim_State]] (`OrderItemState_Key` → `State_Key`, FK), [[Dim_Product]] (`Product_key`), [[Sales_Dim_Currency]] (`Currency_Key`, FK) |
| [[Dim_Account]] | حساب‌های دریافت وجه | حساب | `[dbo].[Dim_Account]` | 3 | - |
| [[Dim_Customer]] | مشتریان | مشتری، خریدار، طرف حساب | `[dbo].[Dim_Customer]` | 5 | - |
| [[Dim_CustomerSalesOffice]] | ارتباط مشتری با دفتر فروش | مشتری دفتر فروش | `[dbo].[Dim_CustomerSalesOffice]` | 3 | [[Dim_Customer]] (`Customer_key`), [[Dim_SalesOffice]] (`SalesOffice_key`) |
| [[Dim_PartNature]] | ماهیت کالا (مواد اولیه، نیم‌ساخته، محصول...) | ماهیت کالا، نوع کالا | `[dbo].[Dim_PartNature]` | 2 | - |
| [[Dim_Plant]] | کارخانه‌ها / سایت‌ها | کارخانه، سایت، پلنت | `[dbo].[Dim_Plant]` | 2 | - |
| [[Dim_Product]] | محصولات قابل فروش با دسته‌بندی | محصول، کالای فروش | `[dbo].[Dim_Product_2]` | 5 | [[Dim_ProductCategory]] (`PrdCategory_Key`) |
| [[Dim_ProductCategory]] | دسته‌بندی محصولات | دسته محصول، گروه محصول، دسته بندی | `[dbo].[Dim_ProductCategory_2]` | 2 | - |
| [[Dim_SalesOffice]] | دفاتر فروش | دفتر فروش، شعبه فروش، نمایندگی | `[dbo].[Dim_SalesOffice]` | 3 | - |
| [[Dim_SeasonDiscount]] | تخفیف‌های فصلی | تخفیف فصلی، تخفیف | `[dbo].[Dim_SeasonDiscount]` | 4 | - |
| [[Dim_State]] | وضعیت‌های اقلام سفارش | وضعیت سفارش | `[dbo].[Dim_State]` | 3 | - |
| [[Dim_YearDiscount]] | تخفیف‌های سالانه | تخفیف سالانه | `[dbo].[Dim_YearDiscount]` | 4 | - |
| [[Fact_Part_Inventory]] | موجودی فعلی کالاها (قطعات و مواد) در انبارها | موجودی کالا، موجودی قطعه، موجودی مواد | `[dbo].[Fact_Part_Inventory]` | 4 | [[Dim_Part]] (`Part_Key`), [[Dim_Store]] (`Store_Key` → `Store_key`) |
| [[Fact_ReturnedProduct]] | اقلام برگشت از فروش | برگشت از فروش، مرجوعی، برگشتی | `[dbo].[Fact_ReturnedProduct]` | 6 | [[Dim_SalesOffice]] (`SalesOffice_Key` → `SalesOffice_key`), [[Dim_Product]] (`Product_Key` → `Product_key`) |
| [[Fact_Vosouli]] | وصولی‌ها: دریافت وجه از مشتریان | وصولی، وصول، دریافت از مشتری، مطالبات | `[dbo].[Fact_Vosouli]` | 6 | [[Dim_Customer]] (`Customer_Key` → `Customer_key`), [[Dim_Account]] (`Account_Key`, FK), [[Dim_SalesOffice]] (`SalesOffice_Key` → `SalesOffice_key`, FK) |
| [[Sales_Dim_DL]] | حساب‌های تفصیلی | تفصیلی، حساب تفصیلی | `[dbo].[Dim_DL]` | 4 | - |
| [[Sales_Dim_PurchaseRequestType]] | انواع درخواست خرید | نوع درخواست خرید | `[dbo].[Dim_PurchaseRequestType]` | 2 | - |
| [[Sales_Dim_TimePeriod]] | دوره‌های زمانی | دوره، دوره زمانی | `[dbo].[Dim_TimePeriod]` | 3 | - |
| [[Sales_Dim_UserPurchaseType]] | انواع خرید کاربر | نوع خرید | `[dbo].[Dim_UserPurchaseType]` | 4 | - |
| [[Sales_Dim_WorkingYear]] | سال‌های کاری | سال کاری | `[dbo].[Dim_WorkingYear]` | 4 | - |
| [[Sales_Fact_Delivery]] | اقلام تحویل کالا به مشتری (حواله انبار) مرتبط با اقلام سفارش | تحویل، حواله، ارسال | `[dbo].[Fact_Delivery]` | 7 | [[Dim_Store]] (`Store_key`) |
| [[Sales_Fact_Inventory]] | موجودی فعلی محصولات در انبارها | موجودی، موجودی محصول، انبار | `[dbo].[Fact_Inventory_2]` | 5 | [[Dim_Product]] (`Product_Key` → `Product_key`), [[Dim_Store]] (`Store_Key` → `Store_key`) |

## treasury - خزانه‌داری
Domain note: [[treasury]] · 49 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-treasury`
Metrics: مانده نقدی، جمع دریافت، جمع پرداخت، گردش بدهکار، گردش بستانکار، مبلغ اعلامیه پرداخت

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[Fact_CashFlow]] ⭐ | جریان نقدی: همه دریافت‌ها و پرداخت‌ها، تخت‌شده با نام بانک و حساب و عامل نقدی | جریان نقدی، نقدینگی، دریافت و پرداخت، گردش نقدی | `[TRE].[Fact_CashFlow_2]` | 28 | - |
| [[Dim_AccountingOperation]] | عملیات حسابداری | عملیات حسابداری | `[TRE].[Dim_AccountingOperation]` | 3 | - |
| [[Dim_Bank]] | بانک‌ها | بانک | `[TRE].[Dim_Bank]` | 2 | - |
| [[Dim_BankAccount]] | حساب‌های بانکی | حساب بانکی، شماره حساب | `[TRE].[Dim_BankAccount]` | 8 | - |
| [[Dim_Branch]] | شعب / دفاتر | شعبه، دفتر | `[TRE].[Dim_Branch]` | 4 | - |
| [[Dim_CashFlowFactor]] | عوامل جریان نقدی | عامل جریان نقدی | `[TRE].[Dim_CashFlowFactor]` | 3 | - |
| [[Dim_CashFlowFactorGrouping]] | گروه‌بندی عوامل جریان نقدی | گروه جریان نقدی | `[TRE].[Dim_CashFlowFactorGrouping]` | 3 | - |
| [[Dim_CashFlowFactorGroupingDetail]] | جزئیات گروه‌بندی عوامل جریان نقدی |  | `[TRE].[Dim_CashFlowFactorGroupingDetail]` | 3 | - |
| [[Dim_DraftVoucher]] | پیش‌نویس اسناد | پیش نویس | `[TRE].[Dim_DraftVoucher]` | 4 | - |
| [[Dim_DraftVoucherItem]] | اقلام پیش‌نویس اسناد |  | `[TRE].[Dim_DraftVoucherItem]` | 5 | - |
| [[Dim_Group]] | گروه حساب‌ها | گروه حساب | `[TRE].[Dim_Group]` | 3 | - |
| [[Dim_Invoice]] | فاکتورها (سرآیند) | فاکتور | `[TRE].[Dim_Invoice]` | 11 | - |
| [[Dim_Ledger]] | دفاتر حسابداری | دفتر، دفتر حسابداری | `[TRE].[Dim_Ledger]` | 3 | - |
| [[Dim_Party]] | اشخاص / طرف حساب‌ها | شخص، طرف حساب | `[TRE].[Dim_Party]` | 2 | - |
| [[Dim_PayableNote]] | اسناد پرداختنی (چک و سفته) | چک پرداختنی، سند پرداختنی | `[TRE].[Dim_PayableNote]` | 11 | - |
| [[Dim_Payment]] | پرداخت‌ها (سرآیند) | پرداخت | `[TRE].[Dim_Payment]` | 4 | - |
| [[Dim_PaymentDeposit]] | واریزهای پرداخت | واریز پرداخت | `[TRE].[Dim_PaymentDeposit]` | 4 | - |
| [[Dim_PaymentInformation]] | اطلاعات پرداخت (سرآیند) | اطلاعات پرداخت | `[TRE].[Dim_PaymentInformation]` | 5 | - |
| [[Dim_PaymentOrder]] | دستورهای پرداخت (سرآیند) | دستور پرداخت | `[TRE].[Dim_PaymentOrder]` | 10 | - |
| [[Dim_PaymentRequest]] | درخواست‌های پرداخت (سرآیند) | درخواست پرداخت | `[TRE].[Dim_PaymentRequest]` | 8 | - |
| [[Dim_Receipt]] | دریافت‌ها (سرآیند) | دریافت، رسید دریافت | `[TRE].[Dim_Receipt]` | 2 | - |
| [[Dim_ReceiptDeposit]] | واریزهای دریافت | واریز دریافت | `[TRE].[Dim_ReceiptDeposit]` | 4 | - |
| [[Dim_ReceivableNote]] | اسناد دریافتنی (چک) | چک دریافتنی، سند دریافتنی | `[TRE].[Dim_ReceivableNote]` | 8 | - |
| [[Dim_ReceivableNoteTransaction]] | گردش اسناد دریافتنی | گردش چک | `[TRE].[Dim_ReceivableNoteTransaction]` | 5 | - |
| [[Dim_SL]] | حساب‌های معین | معین، حساب معین | `[TRE].[Dim_SL]` | 3 | - |
| [[Dim_vmSearchDeposit]] | واریزی‌های قابل جست‌وجو | واریزی | `[TRE].[Dim_vmSearchDeposit]` | 9 | - |
| [[Dim_VoucherItem]] | اقلام سند |  | `[TRE].[Dim_VoucherItem]` | 2 | - |
| [[Fact_BrowseAccount]] | گردش و مانده حساب‌ها | گردش حساب، مانده حساب، تراز | `[TRE].[Fact_BrowseAccount]` | 11 | [[Dim_SL]] (`SL_Key`), [[Dim_VoucherItem]] (`VoucherItem_Key`), [[Treasury_Dim_DL]] (`DL_Key`) |
| [[Fact_CashFlow_Moein]] | جریان نقدی — به تفکیک حساب معین (تخت‌شده) | جریان نقدی معین | `[TRE].[Fact_CashFlow_Moein]` | 28 | - |
| [[Fact_CashFlow_Payment]] | جریان نقدی — فقط پرداخت‌ها (تخت‌شده) | پرداخت‌ها، پرداخت نقدی | `[TRE].[Fact_CashFlow_Payment]` | 29 | - |
| [[Fact_CashFlow_Receipt]] | جریان نقدی — فقط دریافت‌ها (تخت‌شده) | دریافت‌ها، دریافت نقدی | `[TRE].[Fact_CashFlow_Receipt]` | 28 | - |
| [[Fact_CashFlow_Sanadhesabdari]] | جریان نقدی — سند حسابداری (تخت‌شده) | سند حسابداری نقدی | `[TRE].[Fact_CashFlow_Sanadhesabdari]` | 28 | - |
| [[Fact_CashFlow_TaghirModat]] | جریان نقدی — تغییر مدت (تخت‌شده) | تغییر مدت | `[TRE].[Fact_CashFlow_TaghirModat]` | 28 | - |
| [[Fact_CashFlow_Transfer]] | جریان نقدی — انتقال بین حساب‌ها (تخت‌شده) | انتقال، انتقال بین حساب | `[TRE].[Fact_CashFlow_Transfer]` | 31 | - |
| [[Fact_DraftVoucher]] | اقلام پیش‌نویس سند حسابداری | پیش نویس سند | `[TRE].[Fact_DraftVoucher]` | 15 | - |
| [[Fact_PaymentDocumentDetail]] | جزئیات اسناد پرداختنی (چک و سفته) | چک پرداختنی، اسناد پرداختنی، سفته | `[TRE].[Fact_PaymentDocumentDetail_2]` | 28 | - |
| [[Fact_PaymentNotice]] | اعلامیه‌های پرداخت | اعلامیه پرداخت | `[TRE].[Fact_PaymentNotice]` | 8 | [[Dim_Payment]] (`Payment_Key`), [[Treasury_Dim_DL]] (`DL_Key`), [[Dim_PaymentDeposit]] (`PaymentDeposit_Key`), [[Treasury_Dim_Currency]] (`Currency_Key`) |
| [[Fact_PaymentRequest]] | درخواست‌های پرداخت | درخواست پرداخت | `[TRE].[Fact_PaymentRequest]` | 6 | [[Dim_PaymentRequest]] (`PaymentRequest_Key`), [[Dim_Branch]] (`Branch_Key`), [[Treasury_Dim_Currency]] (`Currency_Key`), [[Treasury_Dim_DL]] (`DL_Key`) |
| [[Fact_PurchaseInvoice]] | فاکتورهای خرید از دید خزانه | فاکتور خرید خزانه | `[TRE].[Fact_PurchaseInvoice]` | 20 | [[Dim_Invoice]] (`Invoice_Key`), [[Procurement_Dim_Supplier]] (`Supplier_Key`), [[Sales_Dim_FiscalYear]] (`FiscalYear_Key`), [[Treasury_Dim_Currency]] (`Currency_Key`), [[Treasury_Dim_User]] (`User_Key`), [[Dim_Branch]] (`Branch_Key`), [[Treasury_Dim_PurchasingDepartment]] (`PurchasingDepartment_Key`) |
| [[Fact_ReceivedDocumentDetail]] | جزئیات اسناد دریافتنی (چک)، تخت‌شده با نام بانک و حساب معین | چک دریافتنی، اسناد دریافتنی | `[TRE].[Fact_ReceivedDocumentDetail_2]` | 22 | [[Dim_ReceivableNote]] (`ReceivableNote_Key`) |
| [[Fact_ReceivedPaymentInformation]] | اطلاعات پرداخت‌های دریافت‌شده | پرداخت دریافت شده | `[TRE].[Fact_ReceivedPaymentInformation]` | 9 | [[Dim_PaymentInformation]] (`PaymentInformaion_Key`), [[Treasury_Dim_Currency]] (`Currency_Key`), [[Dim_Branch]] (`Branch_Key`), [[Dim_Party]] (`Party_Key`) |
| [[Fact_SearchItem]] | اقلام جست‌وجوی واریزی | واریزی، جستجوی واریز | `[TRE].[Fact_SearchItem]` | 11 | [[Dim_vmSearchDeposit]] (`vmSearchDeposit_Key`), [[Treasury_Dim_Currency]] (`Currency_Key`), [[Dim_BankAccount]] (`BankAccount_Key`), [[Dim_Branch]] (`Branch_Key`) |
| [[Fact_Voucher]] | اقلام اسناد حسابداری | سند حسابداری، آرتیکل، سند | `[TRE].[Fact_Voucher]` | 13 | - |
| [[Treasury_Dim_DL]] | حساب‌های تفصیلی | تفصیلی | `[TRE].[Dim_DL]` | 3 | - |
| [[Treasury_Dim_FiscalYear]] | سال‌های مالی | سال مالی | `[TRE].[Dim_FiscalYear]` | 2 | - |
| [[Treasury_Dim_PurchasingDepartment]] | واحدهای خرید | واحد خرید | `[TRE].[Dim_PurchasingDepartment]` | 7 | - |
| [[Treasury_Dim_Supplier]] | تامین‌کنندگان از دید خزانه | تامین کننده | `[TRE].[Dim_Supplier]` | 6 | [[Procurement_Dim_Supplier]] (`Supplier_Key`) |
| [[Treasury_Dim_User]] | کاربران | کاربر | `[TRE].[Dim_User]` | 6 | - |
| [[Treasury_Fact_PaymentOrder]] | دستورهای پرداخت | دستور پرداخت | `[TRE].[Fact_PaymentOrder]` | 8 | [[Dim_PaymentOrder]] (`PaymentOrder_Key`), [[Dim_PaymentRequest]] (`PaymentRequest_Key`), [[Dim_Branch]] (`Branch_Key`), [[Treasury_Dim_DL]] (`DL_Key`) |

## common - ابعاد مشترک بین حوزه‌ها: کالا، واحد، انبار، سال مالی، ارز و تأمین‌کننده (shared)
Domain note: [[common]] · 8 tables · who may see it: `IT - Data`, `IT - Security`, `NLSQL-Full`, `NLSQL-sales`, `NLSQL-procurement`, `NLSQL-treasury`, `NLSQL-hr` (1 tables), `NLSQL-bom` (1 tables), `NLSQL-inventory_docs` (1 tables)

| Table | What it is | Also called | Source | Columns shown | Links to |
|---|---|---|---|---|---|
| [[Dim_Date]] | تقویم میلادی و شمسی؛ برای تبدیل تاریخ به سال و ماه شمسی | تقویم، تاریخ شمسی، شمسی، سال شمسی | `[TRE].[Dim_Date_2]` | 18 | - |
| [[Dim_Part]] | کالاها، قطعات و مواد | کالا، قطعه، ماده | `[dbo].[Dim_Part_2]` | 4 | - |
| [[Dim_Store]] | انبارها | انبار | `[dbo].[Dim_Store_2]` | 3 | - |
| [[Dim_Unit]] | واحدهای اندازه‌گیری | واحد، واحد شمارش | `[dbo].[Dim_Unit]` | 2 | - |
| [[Procurement_Dim_Supplier]] | تامین‌کنندگان | تامین کننده، فروشنده، تأمین‌کننده | `[PRC].[Dim_Supplier_2]` | 6 | - |
| [[Sales_Dim_Currency]] | ارزها | ارز، واحد پول | `[dbo].[Dim_Currency]` | 2 | - |
| [[Sales_Dim_FiscalYear]] | سال‌های مالی | سال مالی | `[dbo].[Dim_FiscalYear]` | 2 | - |
| [[Treasury_Dim_Currency]] | ارزها | ارز، واحد پول | `[TRE].[Dim_Currency]` | 4 | - |
