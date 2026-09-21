# بازبینی کاتالوگ NL2SQL

هر جدول یک خط. توضیح و مترادف‌ها را چک کنید. موارد ⚠️ حتماً نیاز به نظر شما دارند.
ستون ⭐ یعنی جدول اصلی آن حوزه که در هر سوال مرتبط همیشه به مدل داده می‌شود.

## فروش (`sales.json`)

**قواعد حوزه:**
- مبالغ به ریال است مگر ستون ارز بگوید.
- وضعیت اقلام سفارش از Dim_State: 1=ثبت شده، 2=تایید شده، 3=در حال استفاده، 4=بسته شده، 5=معلق، 6=باطل شده، 7=مسدود. برای فروش واقعی OrderItemState_Key NOT IN (6,7).
- فروش خالص هر قلم در ستون [EffectiveNetPrice] است؛ فروش ناخالص در [Gross Sales].
- برای گروه‌بندی زمانی از [OrderDate] استفاده کن.
- هر ردیف Fact_Sales یک قلم سفارش است؛ برای تعداد سفارش از COUNT(DISTINCT [OrderRef]) استفاده کن.

| موجودیت | جدول | توضیح | مترادف‌ها |
|---|---|---|---|
| ⭐ Fact_Sales | [dbo].[Fact_Sales] | اقلام فروش؛ هر ردیف یک قلم از یک سفارش فروش | فروش، سفارش فروش، فاکتور فروش، درآمد، مبیعات |
| Dim_Account | [dbo].[Dim_Account] | حساب‌های دریافت وجه | حساب |
| Dim_Customer | [dbo].[Dim_Customer] | مشتریان | مشتری، خریدار، طرف حساب |
| Dim_CustomerSalesOffice | [dbo].[Dim_CustomerSalesOffice] | ارتباط مشتری با دفتر فروش | مشتری دفتر فروش |
| Dim_Part | [dbo].[Dim_Part_2] | کالاها، قطعات و مواد | کالا، قطعه، ماده |
| Dim_PartNature | [dbo].[Dim_PartNature] | ماهیت کالا (مواد اولیه، نیم‌ساخته، محصول...) | ماهیت کالا، نوع کالا |
| Dim_Plant | [dbo].[Dim_Plant] | کارخانه‌ها / سایت‌ها | کارخانه، سایت، پلنت |
| Dim_Product | [dbo].[Dim_Product_2] | محصولات قابل فروش با دسته‌بندی | محصول، کالای فروش |
| Dim_ProductCategory | [dbo].[Dim_ProductCategory_2] | دسته‌بندی محصولات | دسته محصول، گروه محصول، دسته بندی |
| Dim_SalesOffice | [dbo].[Dim_SalesOffice] | دفاتر فروش | دفتر فروش، شعبه فروش، نمایندگی |
| Dim_SeasonDiscount | [dbo].[Dim_SeasonDiscount] | تخفیف‌های فصلی | تخفیف فصلی، تخفیف |
| Dim_State | [dbo].[Dim_State] | وضعیت‌های اقلام سفارش | وضعیت سفارش |
| Dim_Store | [dbo].[Dim_Store_2] | انبارها | انبار |
| Dim_Unit | [dbo].[Dim_Unit] | واحدهای اندازه‌گیری | واحد، واحد شمارش |
| Dim_YearDiscount | [dbo].[Dim_YearDiscount] | تخفیف‌های سالانه | تخفیف سالانه |
| Fact_Part_Inventory | [dbo].[Fact_Part_Inventory] | موجودی فعلی کالاها (قطعات و مواد) در انبارها | موجودی کالا، موجودی قطعه، موجودی مواد |
| Fact_ReturnedProduct | [dbo].[Fact_ReturnedProduct] | اقلام برگشت از فروش | برگشت از فروش، مرجوعی، برگشتی |
| Fact_Vosouli | [dbo].[Fact_Vosouli] | وصولی‌ها: دریافت وجه از مشتریان | وصولی، وصول، دریافت از مشتری، مطالبات |
| Sales_Dim_Currency | [dbo].[Dim_Currency] | ارزها | ارز، واحد پول |
| Sales_Dim_DL | [dbo].[Dim_DL] | حساب‌های تفصیلی | تفصیلی، حساب تفصیلی |
| Sales_Dim_FiscalYear | [dbo].[Dim_FiscalYear] | سال‌های مالی | سال مالی |
| Sales_Dim_PurchaseRequestType | [dbo].[Dim_PurchaseRequestType] | انواع درخواست خرید | نوع درخواست خرید |
| Sales_Dim_TimePeriod | [dbo].[Dim_TimePeriod] | دوره‌های زمانی | دوره، دوره زمانی |
| Sales_Dim_UserPurchaseType | [dbo].[Dim_UserPurchaseType] | انواع خرید کاربر | نوع خرید |
| Sales_Dim_WorkingYear | [dbo].[Dim_WorkingYear] | سال‌های کاری | سال کاری |
| Sales_Fact_Delivery | [dbo].[Fact_Delivery] | اقلام تحویل کالا به مشتری (حواله انبار) مرتبط با اقلام سفارش | تحویل، حواله، ارسال |
| Sales_Fact_Inventory | [dbo].[Fact_Inventory_2] | موجودی فعلی محصولات در انبارها | موجودی، موجودی محصول، انبار |

**نیاز به تأیید کارشناس:**
- ⚠️ `Dim_Customer.CustomerState` — کد وضعیت مشتری: 1=ثبت شده، 2=تایید شده، 3=در حال استفاده، 4=بسته شده، 5=معلق، 6=باطل شده، 7=مسدود

## خرید و تدارکات (`procurement.json`)

**قواعد حوزه:**
- مبالغ به ریال است مگر ستون ارز بگوید. [OperationalCurrencyExchangeRate] نرخ تبدیل به ریال است.
- زنجیره خرید: درخواست خرید → استعلام → پیش‌فاکتور → دستور خرید → سفارش → تحویل → رسید انبار → فاکتور.
- هر ردیف Fact_* یک قلم سند است؛ برای تعداد سند از COUNT(DISTINCT [..Ref]) استفاده کن.
- Fact_Inquiry_Process کل زنجیره خرید یک قلم را در یک ردیف دارد و برای سوال‌های پیگیری فرایند مناسب است.
- هر ستون وضعیت راهنمای کدهایش را در توضیح خودش دارد؛ کدها بین جدول‌ها یکسان نیستند. NULL یعنی قلم هنوز به آن مرحله نرسیده.
- در جدول‌های خرید (درخواست، دستور، سفارش، فاکتور): «انجام‌شده» = State IN (3,4,7)، «در انتظار تأیید» = State IN (1,2)، «متوقف/معلق» = State IN (5,6).

| موجودیت | جدول | توضیح | مترادف‌ها |
|---|---|---|---|
| ⭐ Fact_Purchase | [PRC].[Fact_Purchase_2] | زنجیره خرید: درخواست، دستور خرید و سفارش هر قلم در یک ردیف | خرید، زنجیره خرید، فرایند خرید |
| Dim_CounterpartType | [PRC].[Dim_CounterpartType] | انواع طرف مقابل | نوع طرف مقابل |
| Dim_DeliveryState | [PRC].[Dim_DeliveryState] | وضعیت‌های تحویل | وضعیت تحویل |
| Dim_InventoryVoucherState | [PRC].[Dim_InventoryVoucherState] | وضعیت‌های رسید انبار | وضعیت رسید |
| Dim_InvoiceState | [PRC].[Dim_InvoiceState] | وضعیت‌های فاکتور | وضعیت فاکتور |
| Dim_PayInfoState | [PRC].[Dim_PayInfoState] | وضعیت‌های اطلاعات پرداخت |  |
| Dim_PaymentMethod | [PRC].[Dim_PaymentMethod] | روش‌های پرداخت | روش پرداخت، نحوه پرداخت |
| Dim_PaymentRefType | [PRC].[Dim_PaymentRefType] | انواع مرجع پرداخت |  |
| Dim_PayOrderState | [PRC].[Dim_PayOrderState] | وضعیت‌های دستور پرداخت |  |
| Dim_PayReqState | [PRC].[Dim_PayReqState] | وضعیت‌های درخواست پرداخت |  |
| Dim_PayState | [PRC].[Dim_PayState] | وضعیت‌های پرداخت | وضعیت پرداخت |
| Dim_PurchaseMethod | [PRC].[Dim_PurchaseMethod] | روش‌های خرید | روش خرید، رویه خرید |
| Dim_PurchaseState | [PRC].[Dim_PurchaseState] | وضعیت‌های خرید | وضعیت خرید، وضعیت درخواست |
| Dim_PurchaseType | [PRC].[Dim_PurchaseType] | انواع خرید (داخلی، خارجی...) | نوع خرید |
| Dim_PurchasingAgent | [PRC].[Dim_PurchasingAgent_2] | کارشناسان خرید | کارشناس خرید، مسئول خرید، خریدار |
| Dim_QuotationState | [PRC].[Dim_QuotationState] | وضعیت‌های پیش‌فاکتور | وضعیت پیش فاکتور |
| Dim_TransportType | [PRC].[Dim_TransportType] | انواع حمل | نوع حمل، روش حمل |
| Fact_CashFlowFactorGrouping | [PRC].[Fact_CashFlowFactorGrouping] | گروه‌بندی عوامل جریان نقدی (درختی) | گروه جریان نقدی |
| Fact_DeliveryReturnReport | [RPT].[Fact_DeliveryReturnReport] | گزارش برگشت از تحویل خرید | برگشت خرید، برگشت به تامین کننده |
| Fact_Inquiry | [PRC].[Fact_Inquiry_2] | اقلام استعلام بها از تامین‌کنندگان | استعلام، استعلام بها |
| Fact_Inquiry_Process | [PRC].[Fact_Inquiry_Process] | ردیابی کامل فرایند خرید یک قلم از درخواست تا فاکتور | پیگیری خرید، فرایند خرید، ردیابی سفارش، وضعیت خرید |
| Fact_InquiryReport | [RPT].[Fact_InquiryReport] | گزارش اقلام استعلام | گزارش استعلام |
| Fact_InventoryVoucher | [PRC].[Fact_InventoryVoucher] | اقلام رسید انبار خرید | رسید انبار، رسید |
| Fact_Invoice | [PRC].[Fact_Invoice_2] | اقلام فاکتور خرید | فاکتور خرید، فاکتور تامین کننده |
| Fact_Order | [PRC].[Fact_Order_2] | اقلام سفارش خرید به تامین‌کننده | سفارش خرید، سفارش به تامین کننده |
| Fact_OrderReport | [RPT].[Fact_OrderReport] | گزارش اقلام سفارش خرید | گزارش سفارش |
| Fact_Pay | [PRC].[Fact_Pay] | پرداخت‌های انجام‌شده خرید | پرداخت |
| Fact_Payment | [PRC].[Fact_Payment_2] | زنجیره پرداخت خرید: اطلاعات پرداخت، درخواست، دستور و پرداخت | پرداخت خرید، زنجیره پرداخت |
| Fact_PaymentInfo | [PRC].[Fact_PaymentInfo_2] | اقلام اطلاعات پرداخت خرید | اطلاعات پرداخت |
| Fact_PaymentReq | [PRC].[Fact_PaymentReq] | اقلام درخواست پرداخت خرید | درخواست پرداخت |
| Fact_PurchaseOrder | [PRC].[Fact_PurchaseOrder_2] | اقلام دستور خرید | دستور خرید |
| Fact_PurchaseOrderReport | [RPT].[Fact_PurchaseOrderReport] | گزارش اقلام دستور خرید | گزارش دستور خرید |
| Fact_PurchaseRequest | [PRC].[Fact_PurchaseRequest_2] | اقلام درخواست خرید | درخواست خرید، درخواست |
| Fact_PurchaseRequestReport | [RPT].[Fact_PurchaseRequestReport] | گزارش اقلام درخواست خرید | گزارش درخواست خرید |
| Fact_Quotation | [PRC].[Fact_Quotation_2] | اقلام پیش‌فاکتور دریافتی از تامین‌کنندگان | پیش فاکتور، پیشنهاد قیمت |
| Fact_UnionReport | [RPT].[Fact_UnionReport] | گزارش ترکیبی اسناد خرید | گزارش ترکیبی |
| PaymentReceiveInfo | [PRC].[PaymentReceiveInfo] | گزارش تجمیعی اطلاعات دریافت و پرداخت خرید با نام ستون‌های فارسی | گزارش پرداخت، اطلاعات دریافت پرداخت |
| Procurement_Dim_PurchaseRequestType | [PRC].[Dim_PurchaseRequestType] | انواع درخواست خرید | نوع درخواست خرید |
| Procurement_Dim_PurchasingDepartment | [PRC].[Dim_PurchasingDepartment] | واحدهای خرید | واحد خرید، دپارتمان خرید |
| Procurement_Dim_Supplier | [PRC].[Dim_Supplier_2] | تامین‌کنندگان | تامین کننده، فروشنده، تأمین‌کننده |
| Procurement_Dim_User | [PRC].[Dim_User] | کاربران سیستم خرید | کاربر |
| Procurement_Dim_UserPurchaseType | [PRC].[Dim_UserPurchaseType] | انواع خرید کاربر | نوع خرید کاربر |
| Procurement_Fact_Delivery | [PRC].[Fact_Delivery_2] | اقلام تحویل کالا از تامین‌کننده | تحویل خرید، تحویل از تامین کننده |
| Procurement_Fact_Inventory | [PRC].[Fact_Inventory_2] | پیوند رسید انبار، تحویل، سفارش و فاکتور خرید هر قلم | رسید و فاکتور، تطبیق خرید |
| Procurement_Fact_PaymentOrder | [PRC].[Fact_PaymentOrder] | دستورهای پرداخت خرید | دستور پرداخت |

**نیاز به تأیید کارشناس:**
- ⚠️ `Fact_Purchase.RequestingCenter_Key` — کلید مرکز درخواست‌کننده (کدام جدول بعد؟)
- ⚠️ `Fact_Inquiry.State` — کد وضعیت سند: 1=ثبت شده، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده، 8=دستور شده
- ⚠️ `Fact_Inquiry.ItemState` — کد وضعیت قلم: 1=ثبت شده، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده، 8=دستور شده
- ⚠️ `Fact_Pay.CounterPart_Key` — کلید طرف مقابل (تامین‌کننده یا شخص؟)
- ⚠️ `Fact_Payment.CounterPart_Key` — کلید طرف مقابل (تامین‌کننده یا شخص؟)
- ⚠️ `Fact_PaymentReq.CounterPart_Key` — کلید طرف مقابل (تامین‌کننده یا شخص؟)
- ⚠️ `Procurement_Fact_PaymentOrder.CounterPart_Key` — کلید طرف مقابل (تامین‌کننده یا شخص؟)

## خزانه‌داری (`treasury.json`)

**قواعد حوزه:**
- مبالغ به ریال است مگر ستون ارز بگوید.
- در Fact_CashFlow ستون [Receipt] دریافت و [Payment] پرداخت است؛ [Remaining] مانده. نام بانک و حساب داخل خودش است و به join نیاز ندارد.
- برای تاریخ شمسی از Dim_Date و ستون‌های Persian* استفاده کن.
- Debit بدهکار و Credit بستانکار است.
- وضعیت چک‌ها: کد منفی یعنی «در انتظار» یک اقدام، کد مثبت یعنی اقدام انجام شده. 3=وصول شده، 11=پرداخت شده، 4=واخواست شده، 10 و 15=مسترد شده. راهنمای کامل در توضیح ستون.

| موجودیت | جدول | توضیح | مترادف‌ها |
|---|---|---|---|
| ⭐ Fact_CashFlow | [TRE].[Fact_CashFlow_2] | جریان نقدی: همه دریافت‌ها و پرداخت‌ها، تخت‌شده با نام بانک و حساب و عامل نقدی | جریان نقدی، نقدینگی، دریافت و پرداخت، گردش نقدی |
| Dim_AccountingOperation | [TRE].[Dim_AccountingOperation] | عملیات حسابداری | عملیات حسابداری |
| Dim_Bank | [TRE].[Dim_Bank] | بانک‌ها | بانک |
| Dim_BankAccount | [TRE].[Dim_BankAccount] | حساب‌های بانکی | حساب بانکی، شماره حساب |
| Dim_Branch | [TRE].[Dim_Branch] | شعب / دفاتر | شعبه، دفتر |
| Dim_CashFlowFactor | [TRE].[Dim_CashFlowFactor] | عوامل جریان نقدی | عامل جریان نقدی |
| Dim_CashFlowFactorGrouping | [TRE].[Dim_CashFlowFactorGrouping] | گروه‌بندی عوامل جریان نقدی | گروه جریان نقدی |
| Dim_CashFlowFactorGroupingDetail | [TRE].[Dim_CashFlowFactorGroupingDetail] | جزئیات گروه‌بندی عوامل جریان نقدی |  |
| Dim_Date | [TRE].[Dim_Date_2] | تقویم میلادی و شمسی؛ برای تبدیل تاریخ به سال و ماه شمسی | تقویم، تاریخ شمسی، شمسی |
| Dim_DraftVoucher | [TRE].[Dim_DraftVoucher] | پیش‌نویس اسناد | پیش نویس |
| Dim_DraftVoucherItem | [TRE].[Dim_DraftVoucherItem] | اقلام پیش‌نویس اسناد |  |
| Dim_Group | [TRE].[Dim_Group] | گروه حساب‌ها | گروه حساب |
| Dim_Invoice | [TRE].[Dim_Invoice] | فاکتورها (سرآیند) | فاکتور |
| Dim_Ledger | [TRE].[Dim_Ledger] | دفاتر حسابداری | دفتر، دفتر حسابداری |
| Dim_Party | [TRE].[Dim_Party] | اشخاص / طرف حساب‌ها | شخص، طرف حساب |
| Dim_PayableNote | [TRE].[Dim_PayableNote] | اسناد پرداختنی (چک و سفته) | چک پرداختنی، سند پرداختنی |
| Dim_Payment | [TRE].[Dim_Payment] | پرداخت‌ها (سرآیند) | پرداخت |
| Dim_PaymentDeposit | [TRE].[Dim_PaymentDeposit] | واریزهای پرداخت | واریز پرداخت |
| Dim_PaymentInformation | [TRE].[Dim_PaymentInformation] | اطلاعات پرداخت (سرآیند) | اطلاعات پرداخت |
| Dim_PaymentOrder | [TRE].[Dim_PaymentOrder] | دستورهای پرداخت (سرآیند) | دستور پرداخت |
| Dim_PaymentRequest | [TRE].[Dim_PaymentRequest] | درخواست‌های پرداخت (سرآیند) | درخواست پرداخت |
| Dim_Receipt | [TRE].[Dim_Receipt] | دریافت‌ها (سرآیند) | دریافت، رسید دریافت |
| Dim_ReceiptDeposit | [TRE].[Dim_ReceiptDeposit] | واریزهای دریافت | واریز دریافت |
| Dim_ReceivableNote | [TRE].[Dim_ReceivableNote] | اسناد دریافتنی (چک) | چک دریافتنی، سند دریافتنی |
| Dim_ReceivableNoteTransaction | [TRE].[Dim_ReceivableNoteTransaction] | گردش اسناد دریافتنی | گردش چک |
| Dim_SL | [TRE].[Dim_SL] | حساب‌های معین | معین، حساب معین |
| Dim_vmSearchDeposit | [TRE].[Dim_vmSearchDeposit] | واریزی‌های قابل جست‌وجو | واریزی |
| Dim_VoucherItem | [TRE].[Dim_VoucherItem] | اقلام سند |  |
| Fact_BrowseAccount | [TRE].[Fact_BrowseAccount] | گردش و مانده حساب‌ها | گردش حساب، مانده حساب، تراز |
| Fact_CashFlow_Moein | [TRE].[Fact_CashFlow_Moein] | جریان نقدی — به تفکیک حساب معین (تخت‌شده) | جریان نقدی معین |
| Fact_CashFlow_Payment | [TRE].[Fact_CashFlow_Payment] | جریان نقدی — فقط پرداخت‌ها (تخت‌شده) | پرداخت‌ها، پرداخت نقدی |
| Fact_CashFlow_Receipt | [TRE].[Fact_CashFlow_Receipt] | جریان نقدی — فقط دریافت‌ها (تخت‌شده) | دریافت‌ها، دریافت نقدی |
| Fact_CashFlow_Sanadhesabdari | [TRE].[Fact_CashFlow_Sanadhesabdari] | جریان نقدی — سند حسابداری (تخت‌شده) | سند حسابداری نقدی |
| Fact_CashFlow_TaghirModat | [TRE].[Fact_CashFlow_TaghirModat] | جریان نقدی — تغییر مدت (تخت‌شده) | تغییر مدت |
| Fact_CashFlow_Transfer | [TRE].[Fact_CashFlow_Transfer] | جریان نقدی — انتقال بین حساب‌ها (تخت‌شده) | انتقال، انتقال بین حساب |
| Fact_DraftVoucher | [TRE].[Fact_DraftVoucher] | اقلام پیش‌نویس سند حسابداری | پیش نویس سند |
| Fact_PaymentDocumentDetail | [TRE].[Fact_PaymentDocumentDetail_2] | جزئیات اسناد پرداختنی (چک و سفته) | چک پرداختنی، اسناد پرداختنی، سفته |
| Fact_PaymentNotice | [TRE].[Fact_PaymentNotice] | اعلامیه‌های پرداخت | اعلامیه پرداخت |
| Fact_PaymentRequest | [TRE].[Fact_PaymentRequest] | درخواست‌های پرداخت | درخواست پرداخت |
| Fact_PurchaseInvoice | [TRE].[Fact_PurchaseInvoice] | فاکتورهای خرید از دید خزانه | فاکتور خرید خزانه |
| Fact_ReceivedDocumentDetail | [TRE].[Fact_ReceivedDocumentDetail_2] | جزئیات اسناد دریافتنی (چک)، تخت‌شده با نام بانک و حساب معین | چک دریافتنی، اسناد دریافتنی |
| Fact_ReceivedPaymentInformation | [TRE].[Fact_ReceivedPaymentInformation] | اطلاعات پرداخت‌های دریافت‌شده | پرداخت دریافت شده |
| Fact_SearchItem | [TRE].[Fact_SearchItem] | اقلام جست‌وجوی واریزی | واریزی، جستجوی واریز |
| Fact_Voucher | [TRE].[Fact_Voucher] | اقلام اسناد حسابداری | سند حسابداری، آرتیکل، سند |
| Treasury_Dim_Currency | [TRE].[Dim_Currency] | ارزها | ارز، واحد پول |
| Treasury_Dim_DL | [TRE].[Dim_DL] | حساب‌های تفصیلی | تفصیلی |
| Treasury_Dim_FiscalYear | [TRE].[Dim_FiscalYear] | سال‌های مالی | سال مالی |
| Treasury_Dim_PurchasingDepartment | [TRE].[Dim_PurchasingDepartment] | واحدهای خرید | واحد خرید |
| Treasury_Dim_Supplier | [TRE].[Dim_Supplier] | تامین‌کنندگان از دید خزانه | تامین کننده |
| Treasury_Dim_User | [TRE].[Dim_User] | کاربران | کاربر |
| Treasury_Fact_PaymentOrder | [TRE].[Fact_PaymentOrder] | دستورهای پرداخت | دستور پرداخت |

**نیاز به تأیید کارشناس:**
- ⚠️ `Dim_Invoice.State` — کد وضعیت سند: 1=ثبت شده، 2=در حال بررسی، 3=تایید شده، 4=در جریان، 5=معلق، 6=متوقف شده، 7=بسته شده
- ⚠️ `Treasury_Dim_User.Status` — کد وضعیت: 1=فعال، 2=غیرفعال

## منابع انسانی (`hr.json`)

**قواعد حوزه:**
- Fact_EmployeePeriodCalculation هر ردیف کارکرد یک کارمند در یک دوره است.
- مقادیر Amount در کارکرد به دقیقه است مگر نامش Count یا Day باشد.

| موجودیت | جدول | توضیح | مترادف‌ها |
|---|---|---|---|
| ⭐ Fact_Employee | [HR].[Fact_Employee] | کارمندان با مشخصات سازمانی | کارمند، پرسنل، کارکنان، نیرو |
| Dim_BirthDay | [HR].[Dim_BirthDay] | تاریخ تولد کارمندان | تولد، سن |
| Dim_Company | [HR].[Dim_Company] | شرکت‌ها | شرکت |
| Dim_ContractType | [HR].[Dim_ContractType] | انواع قرارداد | نوع قرارداد، قرارداد |
| Dim_Department | [HR].[Dim_Department] | واحدهای سازمانی | واحد، دپارتمان، بخش |
| Dim_Education | [HR].[Dim_Education] | مدارک تحصیلی | تحصیلات، مدرک |
| Dim_Gender | [HR].[Dim_Gender] | جنسیت | جنسیت، زن، مرد |
| Dim_Job | [HR].[Dim_Job] | شغل‌ها | شغل |
| Dim_JobPost | [HR].[Dim_JobPost] | پست‌های سازمانی | پست، سمت |
| Dim_MaritalStatus | [HR].[Dim_MaritalStatus] | وضعیت تاهل | تاهل، متاهل، مجرد |
| Dim_Mission | [HR].[Dim_Mission] | انواع مأموریت | مأموریت، ماموریت |
| Dim_PersonStatus | [HR].[Dim_PersonStatus] | وضعیت پرسنلی (شاغل، بازنشسته...) | وضعیت پرسنل، شاغل |
| Dim_Section | [HR].[Dim_Section] | قسمت‌ها | قسمت |
| Dim_ServiceArea | [HR].[Dim_ServiceArea] | محل‌های خدمت | محل خدمت |
| Dim_SubDepartment | [HR].[Dim_SubDepartment] | زیرواحدهای سازمانی | زیرواحد |
| Dim_Vacation | [HR].[Dim_Vacation] | انواع مرخصی | نوع مرخصی |
| Fact_EmployeePeriodCalculation | [HR].[Fact_EmployeePeriodCalculation] | کارکرد ماهانه هر کارمند: حضور، غیبت، مرخصی، اضافه‌کار | کارکرد، حضور و غیاب، اضافه کار، مرخصی، غیبت |
| HR_Dim_Status | [HR].[Dim_Status] | وضعیت‌ها |  |
| HR_Dim_TimePeriod | [HR].[Dim_TimePeriod] | دوره‌های کارکرد | دوره، ماه کارکرد |
| HR_Dim_WorkingYear | [HR].[Dim_WorkingYear] | سال‌های کاری | سال کاری |

## فرمول ساخت (`bom.json`)

**قواعد حوزه:**
- هر ردیف BOMDetails یک ماده مصرفی در فرمول ساخت یک محصول است.
- [StandardConsumption] مقدار مصرف استاندارد به ازای یک واحد محصول است.

| موجودیت | جدول | توضیح | مترادف‌ها |
|---|---|---|---|
| ⭐ BOMDetails | [BOM].[BOMDetails] | فرمول ساخت (BOM): مواد مصرفی هر محصول | فرمول ساخت، بی او ام، مواد مصرفی، درخت محصول |
| Priority | [BOM].[Priority_2] | اولویت تولید محصولات و فرمول‌ها به تفکیک ماه | اولویت تولید، برنامه تولید، MPS |
| StockParts | [BOM].[StockParts] | موجودی قطعات | موجودی قطعات |

**نیاز به تأیید کارشناس:**
- ⚠️ `Priority.M` — نامشخص — ستون M در جدول Priority چیست؟
- ⚠️ `Priority.ActivePurchaseBOM` — فرمول خرید فعال؟ (تأیید شود)

## اسناد انبار (`inventory_docs.json`)

**قواعد حوزه:**
- Fact_ntsw اقلام اسناد انبار (رسید و حواله) است.
- برای تاریخ شمسی از [PersianDateStr] یا [PersianDateInt] استفاده کن.

| موجودیت | جدول | توضیح | مترادف‌ها |
|---|---|---|---|
| ⭐ Fact_ntsw | [NTSW].[Fact_ntsw] | اقلام اسناد انبار: رسید و حواله | سند انبار، رسید، حواله، گردش انبار |
| Dim_DocumentType | [NTSW].[Dim_DocumentType] | انواع سند | نوع سند |
| Dim_FloorPart | [NTSW].[Dim_FloorPart] | طبقات کالا | طبقه کالا |
| Dim_GroupPart | [NTSW].[Dim_GroupPart] | گروه‌های کالا | گروه کالا |
| Fact_Documents | [NTSW].[Fact_Documents] | اسناد خرید/فروش با قیمت و مالیات | سند، فاکتور |
| Inventory_Dim_Status | [NTSW].[Dim_Status] | وضعیت‌ها |  |

## سوال‌های باز برای کارشناس

1. **پرداخت** هم در حوزه خرید (`PRC.Fact_Pay`, `Fact_Payment`) هست هم در خزانه (`TRE.Fact_PaymentOrder`, `Fact_PaymentNotice`). کدام منبع رسمی است؟ سوال «پرداخت‌های این ماه» باید از کدام جواب بگیرد؟
2. **فاکتور خرید** در `PRC.Fact_Invoice` و `TRE.Fact_PurchaseInvoice` و `TRE.Dim_Invoice`. رابطه‌شان چیست؟
3. `CounterPart_Key` در جدول‌های پرداخت به کدام بعد وصل است — `Dim_Supplier` یا `Dim_Party`؟
4. `RequestingCenter_Key` در `Fact_Purchase` به کدام جدول وصل است؟
5. ستون‌های `State` و `ItemState` کد عددی‌اند؟ هر مقدار چه معنایی دارد؟ برای فیلتر «تأییدشده» یا «باطل‌نشده» لازم است.
6. مبالغ به ریال است یا تومان؟ `Price`، `NetPrice`، `Amount` همه یک واحد دارند؟
7. جدول‌های `Fact_*_2` و `StFact_*` حذف شده‌اند به فرض اینکه کپی یا staging هستند. درست است؟
