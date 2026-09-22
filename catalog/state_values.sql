/* مقادیر هر ستون وضعیت با تعداد ردیف — خروجی را در برگه «کدهای وضعیت» ستون E بگذارید */
SELECT '[dbo].[Dim_Customer]' AS [table], 'CustomerState' AS [column], CAST([CustomerState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [dbo].[Dim_Customer] GROUP BY [CustomerState]
UNION ALL
SELECT '[dbo].[Fact_Delivery]' AS [table], 'VoucherItemState' AS [column], CAST([VoucherItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [dbo].[Fact_Delivery] GROUP BY [VoucherItemState]
UNION ALL
SELECT '[PRC].[Fact_Purchase_2]' AS [table], 'State_PO' AS [column], CAST([State_PO] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Purchase_2] GROUP BY [State_PO]
UNION ALL
SELECT '[PRC].[Fact_Purchase_2]' AS [table], 'State_O' AS [column], CAST([State_O] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Purchase_2] GROUP BY [State_O]
UNION ALL
SELECT '[PRC].[Fact_Purchase_2]' AS [table], 'State_PR' AS [column], CAST([State_PR] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Purchase_2] GROUP BY [State_PR]
UNION ALL
SELECT '[RPT].[Fact_DeliveryReturnReport]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [RPT].[Fact_DeliveryReturnReport] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Inquiry_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Inquiry_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Inquiry_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Inquiry_2] GROUP BY [ItemState]
UNION ALL
SELECT '[RPT].[Fact_InquiryReport]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [RPT].[Fact_InquiryReport] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_InventoryVoucher]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_InventoryVoucher] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_InventoryVoucher]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_InventoryVoucher] GROUP BY [ItemState]
UNION ALL
SELECT '[PRC].[Fact_Invoice_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Invoice_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Invoice_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Invoice_2] GROUP BY [ItemState]
UNION ALL
SELECT '[PRC].[Fact_Order_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Order_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Order_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Order_2] GROUP BY [ItemState]
UNION ALL
SELECT '[RPT].[Fact_OrderReport]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [RPT].[Fact_OrderReport] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Pay]' AS [table], 'ApproveState' AS [column], CAST([ApproveState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Pay] GROUP BY [ApproveState]
UNION ALL
SELECT '[PRC].[Fact_Payment_2]' AS [table], 'PayInfo_State' AS [column], CAST([PayInfo_State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Payment_2] GROUP BY [PayInfo_State]
UNION ALL
SELECT '[PRC].[Fact_Payment_2]' AS [table], 'PayReqItem_State' AS [column], CAST([PayReqItem_State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Payment_2] GROUP BY [PayReqItem_State]
UNION ALL
SELECT '[PRC].[Fact_Payment_2]' AS [table], 'PayOrder_State' AS [column], CAST([PayOrder_State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Payment_2] GROUP BY [PayOrder_State]
UNION ALL
SELECT '[PRC].[Fact_Payment_2]' AS [table], 'Pay_ApproveState' AS [column], CAST([Pay_ApproveState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Payment_2] GROUP BY [Pay_ApproveState]
UNION ALL
SELECT '[PRC].[Fact_PaymentInfo_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PaymentInfo_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_PaymentReq]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PaymentReq] GROUP BY [ItemState]
UNION ALL
SELECT '[PRC].[Fact_PaymentReq]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PaymentReq] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_PurchaseOrder_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PurchaseOrder_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_PurchaseOrder_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PurchaseOrder_2] GROUP BY [ItemState]
UNION ALL
SELECT '[RPT].[Fact_PurchaseOrderReport]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [RPT].[Fact_PurchaseOrderReport] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_PurchaseRequest_2]' AS [table], 'State_PR' AS [column], CAST([State_PR] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PurchaseRequest_2] GROUP BY [State_PR]
UNION ALL
SELECT '[PRC].[Fact_PurchaseRequest_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PurchaseRequest_2] GROUP BY [ItemState]
UNION ALL
SELECT '[RPT].[Fact_PurchaseRequestReport]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [RPT].[Fact_PurchaseRequestReport] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Quotation_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Quotation_2] GROUP BY [ItemState]
UNION ALL
SELECT '[PRC].[Fact_Quotation_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Quotation_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Delivery_2]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Delivery_2] GROUP BY [State]
UNION ALL
SELECT '[PRC].[Fact_Delivery_2]' AS [table], 'ItemState' AS [column], CAST([ItemState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_Delivery_2] GROUP BY [ItemState]
UNION ALL
SELECT '[PRC].[Fact_PaymentOrder]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [PRC].[Fact_PaymentOrder] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_Invoice]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_Invoice] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_PayableNote]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_PayableNote] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_PaymentInformation]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_PaymentInformation] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_PaymentOrder]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_PaymentOrder] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_PaymentRequest]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_PaymentRequest] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_ReceivableNote]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_ReceivableNote] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_ReceivableNoteTransaction]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_ReceivableNoteTransaction] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_vmSearchDeposit]' AS [table], 'ApproveState' AS [column], CAST([ApproveState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_vmSearchDeposit] GROUP BY [ApproveState]
UNION ALL
SELECT '[TRE].[Fact_PaymentDocumentDetail_2]' AS [table], 'LastState' AS [column], CAST([LastState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Fact_PaymentDocumentDetail_2] GROUP BY [LastState]
UNION ALL
SELECT '[TRE].[Fact_ReceivedDocumentDetail_2]' AS [table], 'LastState' AS [column], CAST([LastState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Fact_ReceivedDocumentDetail_2] GROUP BY [LastState]
UNION ALL
SELECT '[TRE].[Fact_Voucher]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Fact_Voucher] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_PurchasingDepartment]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_PurchasingDepartment] GROUP BY [State]
UNION ALL
SELECT '[TRE].[Dim_User]' AS [table], 'Status' AS [column], CAST([Status] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [TRE].[Dim_User] GROUP BY [Status]
UNION ALL
SELECT '[BOM].[BOMDetails]' AS [table], 'BOMState' AS [column], CAST([BOMState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [BOM].[BOMDetails] GROUP BY [BOMState]
UNION ALL
SELECT '[NTSW].[Fact_ntsw]' AS [table], 'State' AS [column], CAST([State] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [NTSW].[Fact_ntsw] GROUP BY [State]
UNION ALL
SELECT '[NTSW].[Fact_Documents]' AS [table], 'SellerState' AS [column], CAST([SellerState] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [NTSW].[Fact_Documents] GROUP BY [SellerState]
UNION ALL
SELECT '[NTSW].[Fact_Documents]' AS [table], 'Status' AS [column], CAST([Status] AS NVARCHAR(50)) AS [value], COUNT(*) AS [rows] FROM [NTSW].[Fact_Documents] GROUP BY [Status]
ORDER BY [table], [column], [rows] DESC;

/* جدول‌های بعدِ وضعیت: عنوان هر کد اینجاست */
SELECT '[PRC].[Dim_PurchaseState]' AS [dim], * FROM [PRC].[Dim_PurchaseState];
SELECT '[PRC].[Dim_DeliveryState]' AS [dim], * FROM [PRC].[Dim_DeliveryState];
SELECT '[PRC].[Dim_InvoiceState]' AS [dim], * FROM [PRC].[Dim_InvoiceState];
SELECT '[PRC].[Dim_InventoryVoucherState]' AS [dim], * FROM [PRC].[Dim_InventoryVoucherState];
SELECT '[PRC].[Dim_QuotationState]' AS [dim], * FROM [PRC].[Dim_QuotationState];
SELECT '[PRC].[Dim_PayState]' AS [dim], * FROM [PRC].[Dim_PayState];
SELECT '[PRC].[Dim_PayInfoState]' AS [dim], * FROM [PRC].[Dim_PayInfoState];
SELECT '[PRC].[Dim_PayOrderState]' AS [dim], * FROM [PRC].[Dim_PayOrderState];
SELECT '[PRC].[Dim_PayReqState]' AS [dim], * FROM [PRC].[Dim_PayReqState];
SELECT '[dbo].[Dim_State]' AS [dim], * FROM [dbo].[Dim_State];
SELECT '[HR].[Dim_Status]' AS [dim], * FROM [HR].[Dim_Status];
SELECT '[HR].[Dim_PersonStatus]' AS [dim], * FROM [HR].[Dim_PersonStatus];
SELECT '[NTSW].[Dim_Status]' AS [dim], * FROM [NTSW].[Dim_Status];
SELECT '[TRE].[LookupLastState]' AS [dim], * FROM [TRE].[LookupLastState];