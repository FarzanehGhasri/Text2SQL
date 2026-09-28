USE [SA_DataWarehouse]
GO
/****** Object:  Schema [BOM]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE SCHEMA [BOM]
GO
/****** Object:  Schema [HR]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE SCHEMA [HR]
GO
/****** Object:  Schema [NTSW]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE SCHEMA [NTSW]
GO
/****** Object:  Schema [PRC]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE SCHEMA [PRC]
GO
/****** Object:  Schema [RPT]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE SCHEMA [RPT]
GO
/****** Object:  Schema [TRE]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE SCHEMA [TRE]
GO
/****** Object:  Table [BOM].[BOMDetails]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[BOMDetails](
	[BOMID] [int] IDENTITY(1,1) NOT NULL,
	[ProductCode] [nvarchar](64) NULL,
	[ProductName] [nvarchar](512) NULL,
	[BOMCode] [nvarchar](64) NULL,
	[BOMTitle] [nvarchar](512) NULL,
	[ConsumptionCode] [nvarchar](256) NULL,
	[ConsumptionName] [nvarchar](512) NULL,
	[StandardConsumption] [decimal](28, 15) NULL,
	[UnitName] [nvarchar](256) NULL,
	[AlterGroup] [nvarchar](512) NULL,
	[AlterPriority] [int] NULL,
	[BOMState] [int] NULL,
	[PartNature] [int] NULL,
	[InsertDate] [datetime] NULL,
	[Current] [int] NULL,
 CONSTRAINT [PK_BOMDetails] PRIMARY KEY NONCLUSTERED 
(
	[BOMID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_BOMDetails_ProductCode]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE CLUSTERED INDEX [IX_BOMDetails_ProductCode] ON [BOM].[BOMDetails]
(
	[ProductCode] ASC,
	[BOMCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Table [BOM].[BOMDetails_HalfMade]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[BOMDetails_HalfMade](
	[BOMID] [int] IDENTITY(1,1) NOT NULL,
	[ProductCode] [nvarchar](64) NULL,
	[ProductName] [nvarchar](512) NULL,
	[BOMCode] [nvarchar](64) NULL,
	[BOMTitle] [nvarchar](512) NULL,
	[ConsumptionCode] [nvarchar](256) NULL,
	[ConsumptionName] [nvarchar](512) NULL,
	[StandardConsumption] [decimal](28, 15) NULL,
	[UnitName] [nvarchar](256) NULL,
	[AlterGroup] [nvarchar](512) NULL,
	[AlterPriority] [int] NULL,
	[BOMState] [int] NULL,
	[PartNature] [int] NULL,
	[InsertDate] [datetime] NULL,
	[Current] [int] NULL,
 CONSTRAINT [PK_BOMDetails_HalfMade] PRIMARY KEY NONCLUSTERED 
(
	[BOMID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [BOM].[Priority]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[Priority](
	[PriorityID] [int] IDENTITY(1,1) NOT NULL,
	[Year] [int] NULL,
	[Month] [int] NULL,
	[ProductGroup] [nvarchar](256) NULL,
	[ProductCode] [float] NULL,
	[ProductName] [nvarchar](512) NULL,
	[BOMCode] [float] NULL,
	[BOMName] [nvarchar](512) NULL,
	[Priority_Product] [int] NULL,
	[Priority_BOM] [int] NULL,
	[MPS] [int] NULL,
	[InsertedDate] [datetime] NULL,
	[Current] [int] NULL,
 CONSTRAINT [PK_Priority] PRIMARY KEY NONCLUSTERED 
(
	[PriorityID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [BOM].[Priority_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[Priority_2](
	[PriorityID] [int] IDENTITY(1,1) NOT NULL,
	[ProductCode] [float] NULL,
	[ProductName] [nvarchar](512) NULL,
	[ProductGroup] [nvarchar](256) NULL,
	[BOMCode] [float] NULL,
	[BOMName] [nvarchar](512) NULL,
	[Priority_Product] [int] NULL,
	[Priority_BOM] [int] NULL,
	[M] [int] NULL,
	[Year] [int] NULL,
	[Month] [int] NULL,
	[MPS] [int] NULL,
	[ActivePurchaseBOM] [int] NULL,
	[InsertedDate] [datetime] NULL,
 CONSTRAINT [PK_Priority_2] PRIMARY KEY CLUSTERED 
(
	[PriorityID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [BOM].[Priority_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[Priority_temp](
	[ProductCode] [nvarchar](64) NULL,
	[ProductName] [nvarchar](512) NULL,
	[BOMCode] [nvarchar](64) NULL,
	[BOMName] [nvarchar](512) NULL,
	[Priority_Product] [int] NULL,
	[Priority_BOM] [int] NULL,
	[M] [int] NULL,
	[Year] [int] NULL,
	[Month] [int] NULL,
	[MPS] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [BOM].[Priority_template]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[Priority_template](
	[ProductCode] [float] NULL,
	[ProductName] [nvarchar](512) NULL,
	[BOMCode] [float] NULL,
	[BOMName] [nvarchar](512) NULL,
	[Priority_Product] [int] NULL,
	[Priority_BOM] [int] NULL,
	[M] [int] NULL,
	[Year] [int] NULL,
	[Month] [int] NULL,
	[MPS] [int] NULL,
	[ActivePurchaseBOM] [int] NULL,
	[InsertedDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [BOM].[StockParts]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [BOM].[StockParts](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[PartCode] [nvarchar](64) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[InsertDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[a_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[a_temp](
	[1] [nvarchar](3000) NULL,
	[2] [nvarchar](3000) NULL,
	[3] [nvarchar](3000) NULL,
	[4] [nvarchar](3000) NULL,
	[5] [nvarchar](3000) NULL,
	[6] [nvarchar](3000) NULL,
	[7] [nvarchar](3000) NULL,
	[8] [nvarchar](3000) NULL,
	[9] [nvarchar](3000) NULL,
	[10] [nvarchar](3000) NULL,
	[11] [nvarchar](3000) NULL,
	[12] [nvarchar](3000) NULL,
	[13] [nvarchar](3000) NULL,
	[14] [nvarchar](3000) NULL,
	[15] [nvarchar](3000) NULL,
	[16] [nvarchar](3000) NULL,
	[17] [nvarchar](3000) NULL,
	[18] [nvarchar](3000) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[aaa]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aaa](
	[prt] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[aaaaaaaa_pr]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[aaaaaaaa_pr](
	[ProductCode] [float] NULL,
	[ProductName] [nvarchar](255) NULL,
	[BOMCode] [float] NULL,
	[BOMName] [nvarchar](255) NULL,
	[Priority_Product] [float] NULL,
	[Priority_BOM] [float] NULL,
	[M] [float] NULL,
	[Year] [float] NULL,
	[Month] [float] NULL,
	[MPS] [float] NULL,
	[ActivePurchaseBOM] [float] NULL,
	[InsertedDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[bac_CustomerSalesOffice_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bac_CustomerSalesOffice_Staging](
	[CustomerSalesOfficeID] [bigint] NOT NULL,
	[CustomerRef] [bigint] NOT NULL,
	[Customer_Key] [dbo].[udt_surrogate_key] NULL,
	[SalesOfficeRef] [bigint] NOT NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[bac_Dim_Customer]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bac_Dim_Customer](
	[Customer_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CustomerID] [bigint] NULL,
	[CustomerNumber] [nvarchar](50) NULL,
	[CustomerName] [nvarchar](256) NULL,
	[CustomerrType] [int] NOT NULL,
	[CustomerState] [int] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[bac_Dim_CustomerSalesOffice]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[bac_Dim_CustomerSalesOffice](
	[CustomerSalesOffice_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Customer_key] [dbo].[udt_surrogate_key] NOT NULL,
	[SalesOffice_key] [dbo].[udt_surrogate_key] NOT NULL,
	[CustomerSalesOfficeID] [bigint] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CustomerSalesOffice_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CustomerSalesOffice_Staging](
	[CustomerSalesOfficeID] [bigint] NOT NULL,
	[CustomerRef] [bigint] NOT NULL,
	[Customer_Key] [dbo].[udt_surrogate_key] NULL,
	[SalesOfficeRef] [bigint] NOT NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Delivery_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Delivery_temp](
	[OrderItemNumber] [bigint] NULL,
	[Store_key] [dbo].[udt_surrogate_key] NOT NULL,
	[VoucherItemNumber] [bigint] NULL,
	[VoucherRef] [bigint] NULL,
	[VoucherDate] [datetime] NULL,
	[VoucherQuantity] [decimal](28, 6) NULL,
	[VoucherItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Account]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Account](
	[Account_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[AccountID] [bigint] NOT NULL,
	[Name] [nvarchar](200) NULL,
	[SecondTitle] [nvarchar](256) NULL,
 CONSTRAINT [PK_Dim_Account] PRIMARY KEY CLUSTERED 
(
	[Account_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Currency]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Currency](
	[Currency_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CurrencyID] [bigint] NULL,
	[Title] [nchar](128) NULL,
 CONSTRAINT [PK_Dim_Currency] PRIMARY KEY CLUSTERED 
(
	[Currency_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Customer]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Customer](
	[Customer_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CustomerID] [bigint] NULL,
	[CustomerNumber] [nvarchar](50) NULL,
	[CustomerName] [nvarchar](256) NULL,
	[CustomerrType] [int] NOT NULL,
	[CustomerState] [int] NOT NULL,
 CONSTRAINT [PK_Dim_Customer] PRIMARY KEY CLUSTERED 
(
	[Customer_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_CustomerSalesOffice]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_CustomerSalesOffice](
	[CustomerSalesOffice_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Customer_key] [dbo].[udt_surrogate_key] NOT NULL,
	[SalesOffice_key] [dbo].[udt_surrogate_key] NOT NULL,
	[CustomerSalesOfficeID] [bigint] NOT NULL,
 CONSTRAINT [PK_Dim_CustomerSalesOffice] PRIMARY KEY CLUSTERED 
(
	[CustomerSalesOffice_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_DL]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_DL](
	[DL_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[DLID] [bigint] NOT NULL,
	[ReferenceID] [int] NULL,
	[Code] [nvarchar](64) NOT NULL,
	[Title] [nvarchar](512) NOT NULL,
 CONSTRAINT [PK_Dim_DL] PRIMARY KEY CLUSTERED 
(
	[DL_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_DL2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_DL2](
	[DL_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[DLID] [bigint] NOT NULL,
	[ReferenceID] [int] NULL,
	[Code] [nvarchar](64) NOT NULL,
	[Title] [nvarchar](512) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_EntityLookup]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_EntityLookup](
	[Code] [int] NULL,
	[EntityName] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_EntityLookup_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_EntityLookup_2](
	[Code] [int] NULL,
	[EntityName] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_FiscalYear]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_FiscalYear](
	[FiscalYear_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[FiscalYearID] [bigint] NULL,
	[Title] [int] NULL,
 CONSTRAINT [PK_Dim_FiscalYear] PRIMARY KEY CLUSTERED 
(
	[FiscalYear_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Part]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Part](
	[Part_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PartID] [bigint] NULL,
	[PartCode] [nvarchar](64) NULL,
	[PartName] [nvarchar](256) NULL,
	[PartNature] [int] NULL,
 CONSTRAINT [PK_Dim_Part] PRIMARY KEY CLUSTERED 
(
	[Part_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Part_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Part_2](
	[Part_Key] [dbo].[udt_surrogate_key] IDENTITY(33877,1) NOT NULL,
	[PartID] [bigint] NULL,
	[PartCode] [nvarchar](64) NULL,
	[PartName] [nvarchar](256) NULL,
	[PartNature] [int] NULL,
 CONSTRAINT [PK_Dim_Part_2] PRIMARY KEY CLUSTERED 
(
	[Part_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_PartNature]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_PartNature](
	[PartNatureID] [int] NOT NULL,
	[PartNatureTitle] [nvarchar](256) NULL,
 CONSTRAINT [PK_PartNature] PRIMARY KEY CLUSTERED 
(
	[PartNatureID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Plant]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Plant](
	[Plant_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PlantID] [bigint] NULL,
	[Name] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_Plant] PRIMARY KEY CLUSTERED 
(
	[Plant_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Product]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Product](
	[Product_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ProductID] [bigint] NOT NULL,
	[ProductCode] [nvarchar](50) NOT NULL,
	[ProductName] [nvarchar](256) NOT NULL,
	[PrdCategory_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductCategoryName] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Product] PRIMARY KEY CLUSTERED 
(
	[Product_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Product_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Product_2](
	[Product_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ProductID] [bigint] NOT NULL,
	[ProductCode] [nvarchar](50) NOT NULL,
	[ProductName] [nvarchar](256) NOT NULL,
	[PrdCategory_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductCategoryName] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Product_2] PRIMARY KEY CLUSTERED 
(
	[Product_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_ProductCategory]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_ProductCategory](
	[PrdCategory_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CategoryName] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_ProductCategory] PRIMARY KEY CLUSTERED 
(
	[PrdCategory_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_ProductCategory_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_ProductCategory_2](
	[PrdCategory_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PrdCategoryID] [bigint] NOT NULL,
	[CategoryName] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_ProductCategory_2] PRIMARY KEY CLUSTERED 
(
	[PrdCategory_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_PurchaseRequestType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_PurchaseRequestType](
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchaseRequestTypeId] [bigint] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PurchaseRequestType] PRIMARY KEY CLUSTERED 
(
	[PurchaseRequestType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_SalesOffice]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_SalesOffice](
	[SalesOffice_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[SalesOfficeID] [bigint] NOT NULL,
	[Name] [nvarchar](128) NULL,
	[SalesOfficeCode] [nvarchar](64) NULL,
 CONSTRAINT [PK_Dim_SalesOffice] PRIMARY KEY CLUSTERED 
(
	[SalesOffice_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_SeasonDiscount]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_SeasonDiscount](
	[Season_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[FromDate] [date] NULL,
	[ToDate] [date] NULL,
	[DiscountRate] [decimal](18, 3) NULL,
 CONSTRAINT [PK_Dim_SeasonDiscount] PRIMARY KEY CLUSTERED 
(
	[Season_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_State]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_State](
	[State_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[StateCode] [int] NULL,
	[StateName] [nvarchar](150) NULL,
 CONSTRAINT [PK_Dim_State] PRIMARY KEY CLUSTERED 
(
	[State_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Store]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Store](
	[Store_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[StoreID] [bigint] NOT NULL,
	[StoreCode] [nvarchar](64) NOT NULL,
	[StoreName] [nvarchar](128) NOT NULL,
 CONSTRAINT [PK_Dim_Store] PRIMARY KEY CLUSTERED 
(
	[Store_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Store_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Store_2](
	[Store_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[StoreID] [bigint] NOT NULL,
	[StoreCode] [nvarchar](64) NOT NULL,
	[StoreName] [nvarchar](128) NOT NULL,
 CONSTRAINT [PK_Dim_Store_2] PRIMARY KEY CLUSTERED 
(
	[Store_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_TimePeriod]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_TimePeriod](
	[Period_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PeriodId] [bigint] NULL,
	[PeriodName] [nvarchar](100) NULL,
	[WorkingYearId] [int] NULL,
 CONSTRAINT [PK_Dim_TimePeriod] PRIMARY KEY CLUSTERED 
(
	[Period_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_Unit]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_Unit](
	[Unit_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[UnitID] [bigint] NULL,
	[UnitName] [nvarchar](256) NULL,
 CONSTRAINT [PK_Dim_Unit] PRIMARY KEY CLUSTERED 
(
	[Unit_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_UserPurchaseType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_UserPurchaseType](
	[UserPurchaseType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[UserPurchaseTypeID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Title] [nvarchar](256) NULL,
	[PurchaseType] [int] NULL,
 CONSTRAINT [PK_Dim_UserPurchaseType] PRIMARY KEY CLUSTERED 
(
	[UserPurchaseType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_WorkingYear]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_WorkingYear](
	[WorkingYear_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[id] [bigint] NULL,
	[Name] [nvarchar](100) NULL,
	[StartDate] [datetime] NULL,
 CONSTRAINT [PK_Dim_WorkingYear] PRIMARY KEY CLUSTERED 
(
	[WorkingYear_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Dim_YearDiscount]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Dim_YearDiscount](
	[Year_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[FromDate] [date] NULL,
	[ToDate] [date] NULL,
	[DiscountRate] [decimal](18, 3) NULL,
 CONSTRAINT [PK_Dim_YearDiscount] PRIMARY KEY CLUSTERED 
(
	[Year_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[editted_bac_Dim_Customer]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[editted_bac_Dim_Customer](
	[Customer_key] [dbo].[udt_surrogate_key] NOT NULL,
	[CustomerID] [bigint] NULL,
	[CustomerNumber] [nvarchar](50) NULL,
	[CustomerName] [nvarchar](256) NULL,
	[CustomerrType] [int] NOT NULL,
	[CustomerState] [int] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[EtsPeriodCalculation_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[EtsPeriodCalculation_Staging](
	[EmployeeId] [bigint] NOT NULL,
	[EmployeeCode] [nvarchar](100) NOT NULL,
	[FullName] [nvarchar](101) NOT NULL,
	[PeriodId] [bigint] NOT NULL,
	[PeriodName] [nvarchar](100) NOT NULL,
	[WorkingYearName] [nvarchar](100) NOT NULL,
	[AbsenceCount] [int] NOT NULL,
	[DelayCount] [int] NOT NULL,
	[HurryCount] [int] NOT NULL,
	[TotalAlowedWorkDeficit] [int] NOT NULL,
	[TotalShifts] [int] NOT NULL,
	[FunctionalityCountInDay] [int] NOT NULL,
	[PresenceCountInDay] [int] NOT NULL,
	[DeficitAccruedHolidayInMinutes] [int] NOT NULL,
	[DeficitAccruedHolidayInDay] [int] NOT NULL,
	[AccruedHolidayInMinutes] [int] NOT NULL,
	[AccruedHolidayInDay] [int] NOT NULL,
	[PrecenseAmount] [int] NOT NULL,
	[AbsenceWorkDeficitAmount] [int] NOT NULL,
	[DelayWorkDeficitAmount] [int] NOT NULL,
	[HurryWorkDeficitAmount] [int] NOT NULL,
	[TotalWorkDeficitAmount] [int] NOT NULL,
	[TotalFunctionalityAmount] [int] NOT NULL,
	[TotalvacationAmount] [int] NOT NULL,
	[TotalMissionAmount] [int] NOT NULL,
	[TotalMissionInHoliday] [int] NOT NULL,
	[TotalNormalExtraWorkAmount] [int] NOT NULL,
	[TotalExtraWorkAmount] [int] NOT NULL,
	[ConsideredWork] [int] NOT NULL,
	[TotalFunctionalityCountInDay] [int] NOT NULL,
	[TotalAccuredHoliday] [int] NOT NULL,
	[TotalPeriodDayCount] [int] NOT NULL,
	[FunctionalityAmount] [int] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Delivery]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Delivery](
	[OrderItemNumber] [bigint] NULL,
	[Store_key] [dbo].[udt_surrogate_key] NOT NULL,
	[VoucherItemNumber] [bigint] NULL,
	[VoucherRef] [bigint] NULL,
	[VoucherDate] [datetime] NULL,
	[VoucherQuantity] [decimal](28, 6) NULL,
	[VoucherItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_EntityRelation]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_EntityRelation](
	[SourceRef] [bigint] NULL,
	[SourceType] [int] NULL,
	[TargetRef] [bigint] NULL,
	[TargetType] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Inventory]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Inventory](
	[Product_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductCode] [nvarchar](64) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Inventory_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Inventory_2](
	[Product_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductCode] [nvarchar](64) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Inventory_2_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Inventory_2_Staging](
	[PartCode] [nvarchar](64) NULL,
	[StoreCode] [dbo].[udt_surrogate_key] NULL,
	[Remain] [decimal](28, 6) NULL,
	[tmpInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Part_Inventory]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Part_Inventory](
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_ReturnedProduct]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_ReturnedProduct](
	[ReturnedInvoiceItemID] [bigint] NOT NULL,
	[ReturnedInvoiceID] [bigint] NOT NULL,
	[Date] [datetime] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Quantity] [decimal](28, 6) NOT NULL,
	[EffectiveNetPrice] [decimal](28, 6) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Sales]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Sales](
	[OrderRef] [bigint] NULL,
	[OrderNumber] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[Customer_key] [bigint] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OrderItemNumber] [bigint] NULL,
	[OrderItemState_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[ReductionAmount] [decimal](28, 6) NULL,
	[AdditionAmount] [decimal](28, 6) NULL,
	[Gross Sales] [decimal](28, 6) NULL,
	[EffectiveNetPrice] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_StateHistory]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_StateHistory](
	[EntityCode] [int] NULL,
	[RecordID] [bigint] NULL,
	[SourceState] [int] NULL,
	[TargetState] [int] NULL,
	[ChangeDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fact_Vosouli]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fact_Vosouli](
	[Customer_Key] [bigint] NULL,
	[Amount] [decimal](28, 6) NULL,
	[Account_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[ItemType] [int] NULL,
	[ItemDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Inventory_Data_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Inventory_Data_Staging](
	[ProductCode] [nvarchar](64) NULL,
	[PartName] [nvarchar](256) NULL,
	[Product_Key] [dbo].[udt_surrogate_key] NULL,
	[StoreCode] [nvarchar](64) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Inventory_Part_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Inventory_Part_Staging](
	[PartCode] [nvarchar](64) NULL,
	[PartName] [nvarchar](256) NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[StoreCode] [nvarchar](64) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Inventory_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Inventory_temp](
	[Product_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductCode] [nvarchar](64) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Lookup]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Lookup](
	[LookupID] [bigint] NOT NULL,
	[Type] [nvarchar](50) NOT NULL,
	[Code] [int] NOT NULL,
	[Value] [nvarchar](100) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Order_Data_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Order_Data_Staging](
	[Stage_key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[OrderRef] [bigint] NULL,
	[OrderNumber] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[OrderItemState] [int] NULL,
	[OrderItemState_Key] [dbo].[udt_surrogate_key] NULL,
	[SalesOfficeRef] [bigint] NULL,
	[SalesOffice_key] [dbo].[udt_surrogate_key] NULL,
	[CustomerNumber] [nvarchar](50) NULL,
	[CustomerRef] [bigint] NULL,
	[CustomerName] [nvarchar](256) NULL,
	[Customer_key] [dbo].[udt_surrogate_key] NULL,
	[OrderItemNumber] [bigint] NULL,
	[ProductNumber] [nvarchar](50) NULL,
	[ProductRef] [bigint] NULL,
	[ProductName] [nvarchar](256) NULL,
	[Product_key] [dbo].[udt_surrogate_key] NULL,
	[ProductCategory] [nvarchar](255) NULL,
	[PrdCategory_key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[Gross Sales] [decimal](28, 6) NULL,
	[ReductionAmount] [decimal](28, 6) NULL,
	[AdditionAmount] [decimal](28, 6) NULL,
	[EffectiveNetPrice] [decimal](28, 6) NULL,
 CONSTRAINT [PK_Source_Data_Staging] PRIMARY KEY CLUSTERED 
(
	[Stage_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Order_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Order_Staging](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[OrderDate] [datetime] NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[SupplierRef] [bigint] NULL,
	[Quantity_O] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Fee_O] [decimal](28, 6) NULL,
	[Price_O] [decimal](28, 6) NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[State_O] [int] NULL,
	[NetPrice_O] [decimal](28, 6) NULL,
	[Additions_O] [decimal](28, 6) NULL,
	[Deductions_O] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseOrder_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseOrder_Staging](
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[Number_PO] [int] NULL,
	[OrderDate] [datetime] NULL,
	[PartRef] [bigint] NULL,
	[Quantity_PO] [decimal](28, 6) NULL,
	[Fee_PO] [decimal](28, 6) NULL,
	[Price_PO] [decimal](28, 6) NULL,
	[Additions_PO] [decimal](28, 6) NULL,
	[Deductions_PO] [decimal](28, 6) NULL,
	[NetPrice_PO] [decimal](28, 6) NULL,
	[State_PO] [int] NULL,
	[PurchasingAgentRef_PO] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Records]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Records](
	[Code] [float] NULL,
	[PrdName] [nvarchar](255) NULL,
	[PrdGroup] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReturnedProduct_Data_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReturnedProduct_Data_Staging](
	[ReturnedInvoiceItemID] [bigint] NOT NULL,
	[ReturnedInvoiceID] [bigint] NOT NULL,
	[Date] [datetime] NOT NULL,
	[SalesOfficeRef] [bigint] NOT NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductRef] [bigint] NOT NULL,
	[Product_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NOT NULL,
	[EffectiveNetPrice] [decimal](28, 6) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReturnedProduct_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReturnedProduct_temp](
	[ReturnedInvoiceItemID] [bigint] NOT NULL,
	[ReturnedInvoiceID] [bigint] NOT NULL,
	[Date] [datetime] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Quantity] [decimal](28, 6) NOT NULL,
	[EffectiveNetPrice] [decimal](28, 6) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Sales_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sales_temp](
	[OrderRef] [bigint] NULL,
	[OrderNumber] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[Customer_key] [bigint] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OrderItemNumber] [bigint] NULL,
	[OrderItemState_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[ReductionAmount] [decimal](28, 6) NULL,
	[AdditionAmount] [decimal](28, 6) NULL,
	[Gross Sales] [decimal](28, 6) NULL,
	[EffectiveNetPrice] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Sheet11]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sheet11](
	[Product Code] [float] NULL,
	[Product Name] [nvarchar](255) NULL,
	[BOM Code] [float] NULL,
	[BOM Name] [nvarchar](255) NULL,
	[Priority_Product] [float] NULL,
	[Priority_BOM] [float] NULL,
	[M] [float] NULL,
	[Year] [float] NULL,
	[Month] [float] NULL,
	[MPS] [float] NULL,
	[F11] [nvarchar](255) NULL,
	[F12] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_Delivery]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_Delivery](
	[OrderItemNumber] [bigint] NULL,
	[Store_key] [dbo].[udt_surrogate_key] NOT NULL,
	[VoucherItemNumber] [bigint] NULL,
	[VoucherRef] [bigint] NULL,
	[VoucherDate] [datetime] NULL,
	[VoucherQuantity] [decimal](28, 6) NULL,
	[VoucherItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_Inventory]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_Inventory](
	[Product_Key] [dbo].[udt_surrogate_key] NULL,
	[ProductCode] [nvarchar](64) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[RemainInventory] [decimal](28, 6) NULL,
	[TempInventory] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_ReturnedProduct]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_ReturnedProduct](
	[ReturnedInvoiceItemID] [bigint] NOT NULL,
	[ReturnedInvoiceID] [bigint] NOT NULL,
	[Date] [datetime] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Quantity] [decimal](28, 6) NOT NULL,
	[EffectiveNetPrice] [decimal](28, 6) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_Sales]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_Sales](
	[OrderRef] [bigint] NULL,
	[OrderNumber] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[Customer_key] [bigint] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OrderItemNumber] [bigint] NULL,
	[OrderItemState_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[ReductionAmount] [decimal](28, 6) NULL,
	[AdditionAmount] [decimal](28, 6) NULL,
	[Gross Sales] [decimal](28, 6) NULL,
	[EffectiveNetPrice] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_Sales_old]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_Sales_old](
	[OrderRef] [bigint] NULL,
	[OrderNumber] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[Customer_key] [bigint] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OrderItemNumber] [bigint] NULL,
	[OrderItemState_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Product_key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[ReductionAmount] [decimal](28, 6) NULL,
	[AdditionAmount] [decimal](28, 6) NULL,
	[Gross Sales] [decimal](28, 6) NULL,
	[EffectiveNetPrice] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_Vosouli]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_Vosouli](
	[Customer_Key] [bigint] NULL,
	[Amount] [decimal](28, 6) NULL,
	[Account_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[ItemType] [int] NULL,
	[ItemDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StFact_Vosouli2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StFact_Vosouli2](
	[Customer_Key] [bigint] NULL,
	[Amount] [decimal](28, 6) NULL,
	[Account_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[ItemType] [int] NULL,
	[ItemDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Vosouli_Data_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Vosouli_Data_Staging](
	[DLID] [bigint] NULL,
	[CustomerNumber] [nvarchar](64) NULL,
	[CustomerName] [nvarchar](512) NULL,
	[Customer_Key] [dbo].[udt_surrogate_key] NULL,
	[Amount] [decimal](28, 6) NULL,
	[AccountID] [bigint] NULL,
	[AccountName] [nvarchar](200) NULL,
	[Account_Key] [dbo].[udt_surrogate_key] NULL,
	[SalesOffice] [nvarchar](128) NULL,
	[SalesOfficeID] [bigint] NULL,
	[SalesOffice_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemType] [int] NULL,
	[ItemDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vosouli_temp]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vosouli_temp](
	[Customer_Key] [bigint] NULL,
	[Amount] [numeric](28, 6) NULL,
	[Account_Key] [bigint] NULL,
	[SalesOffice_Key] [bigint] NULL,
	[ItemType] [int] NULL,
	[ItemDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Voucher_Data_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Voucher_Data_Staging](
	[Stage_ID] [int] IDENTITY(1,1) NOT NULL,
	[OrderItemNumber] [bigint] NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[StoreRef] [bigint] NULL,
	[VoucherItemNumber] [bigint] NULL,
	[VoucherItemState] [int] NULL,
	[VoucherRef] [bigint] NULL,
	[VoucherDate] [datetime] NULL,
	[VoucherQuantity] [decimal](28, 6) NULL,
 CONSTRAINT [PK_Voucher_Data_Staging] PRIMARY KEY CLUSTERED 
(
	[Stage_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WorkFlowTable]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WorkFlowTable](
	[SourceRef] [bigint] NULL,
	[SourceType] [int] NULL,
	[SourceState] [int] NULL,
	[SourceDate] [date] NULL,
	[TargetRef] [bigint] NULL,
	[TargetType] [int] NULL,
	[TargetState] [int] NULL,
	[TargetDate] [date] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WorkFlowTable_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WorkFlowTable_2](
	[SourceRef] [bigint] NULL,
	[SourceType] [int] NULL,
	[SourceState] [int] NULL,
	[SourceDate] [date] NULL,
	[TargetRef] [bigint] NULL,
	[TargetType] [int] NULL,
	[TargetState] [int] NULL,
	[TargetDate] [date] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_BirthDay]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_BirthDay](
	[Birth_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[personelyCode] [int] NULL,
	[BirthDate] [datetime] NULL,
 CONSTRAINT [PK_Dim_BirthDay] PRIMARY KEY CLUSTERED 
(
	[Birth_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Company]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Company](
	[Company_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[FkSherkat] [int] NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Company] PRIMARY KEY CLUSTERED 
(
	[Company_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_ContractType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_ContractType](
	[Contract_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK_ContractType] PRIMARY KEY CLUSTERED 
(
	[Contract_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Department]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Department](
	[Department_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[tp_ID_HRBaseVahed] [int] NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Department] PRIMARY KEY CLUSTERED 
(
	[Department_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Education]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Education](
	[Education_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[tp_ID] [int] NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Education] PRIMARY KEY CLUSTERED 
(
	[Education_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Gender]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Gender](
	[Gender_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](50) NULL,
 CONSTRAINT [PK_Gender] PRIMARY KEY CLUSTERED 
(
	[Gender_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Job]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Job](
	[Job_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Job] PRIMARY KEY CLUSTERED 
(
	[Job_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_JobPost]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_JobPost](
	[JobPost_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_JobGrade] PRIMARY KEY CLUSTERED 
(
	[JobPost_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_MaritalStatus]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_MaritalStatus](
	[Marital_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](50) NULL,
 CONSTRAINT [PK_MaritalStatus] PRIMARY KEY CLUSTERED 
(
	[Marital_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Mission]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Mission](
	[Mission_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Id] [bigint] NULL,
	[Name] [nvarchar](100) NULL,
 CONSTRAINT [PK_Dim_Mission] PRIMARY KEY CLUSTERED 
(
	[Mission_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_PersonStatus]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_PersonStatus](
	[PersonStatus_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PersonStatus] PRIMARY KEY CLUSTERED 
(
	[PersonStatus_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Section]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Section](
	[Section_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[tp_ID] [int] NULL,
	[Title] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_Section] PRIMARY KEY CLUSTERED 
(
	[Section_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_ServiceArea]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_ServiceArea](
	[ServiceArea_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[tp_ID] [int] NULL,
	[Title] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_ServiceArea] PRIMARY KEY CLUSTERED 
(
	[ServiceArea_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Status]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Status](
	[Status_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_Status] PRIMARY KEY CLUSTERED 
(
	[Status_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_SubDepartment]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_SubDepartment](
	[SubDepartment_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[tp_ID] [int] NULL,
	[Title] [nvarchar](255) NULL,
 CONSTRAINT [PK_Dim_SubDepartment] PRIMARY KEY CLUSTERED 
(
	[SubDepartment_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_TimePeriod]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_TimePeriod](
	[Period_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PeriodId] [bigint] NULL,
	[PeriodName] [nvarchar](100) NULL,
	[WorkingYearId] [bigint] NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
 CONSTRAINT [PK_Dim_TimePeriod] PRIMARY KEY CLUSTERED 
(
	[Period_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_Vacation]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_Vacation](
	[Vacation_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[Id] [bigint] NULL,
	[Name] [nvarchar](100) NULL,
 CONSTRAINT [PK_Dim_Vacation] PRIMARY KEY CLUSTERED 
(
	[Vacation_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Dim_WorkingYear]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Dim_WorkingYear](
	[WorkingYear_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[id] [bigint] NULL,
	[Name] [nvarchar](100) NULL,
	[StartDate] [datetime] NULL,
	[PersistOn] [datetime] NULL,
 CONSTRAINT [PK_Dim_WorkingYear] PRIMARY KEY CLUSTERED 
(
	[WorkingYear_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[EtsPeriodCalculation_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[EtsPeriodCalculation_Staging](
	[Employee_Key] [dbo].[udt_surrogate_key] NULL,
	[EmployeeId] [bigint] NULL,
	[EmployeeCode] [nvarchar](100) NULL,
	[FullName] [nvarchar](101) NULL,
	[Period_Key] [dbo].[udt_surrogate_key] NULL,
	[PeriodId] [bigint] NULL,
	[PeriodName] [nvarchar](100) NULL,
	[WorkingYear_Key] [dbo].[udt_surrogate_key] NULL,
	[WorkingYearName] [nvarchar](100) NULL,
	[AbsenceCount] [int] NULL,
	[DelayCount] [int] NULL,
	[HurryCount] [int] NULL,
	[TotalAlowedWorkDeficit] [int] NULL,
	[TotalShifts] [int] NULL,
	[FunctionalityCountInDay] [int] NULL,
	[PresenceCountInDay] [int] NULL,
	[DeficitAccruedHolidayInMinutes] [int] NULL,
	[DeficitAccruedHolidayInDay] [int] NULL,
	[AccruedHolidayInMinutes] [int] NULL,
	[AccruedHolidayInDay] [int] NULL,
	[PrecenseAmount] [int] NULL,
	[AbsenceWorkDeficitAmount] [int] NULL,
	[DelayWorkDeficitAmount] [int] NULL,
	[HurryWorkDeficitAmount] [int] NULL,
	[TotalWorkDeficitAmount] [int] NULL,
	[TotalFunctionalityAmount] [int] NULL,
	[Vacation_Key] [dbo].[udt_surrogate_key] NULL,
	[VacationId] [bigint] NULL,
	[TotalvacationAmount] [int] NULL,
	[TotalvacationCount] [int] NULL,
	[TotalMissionAmount] [int] NULL,
	[Mission_Key] [dbo].[udt_surrogate_key] NULL,
	[MissionId] [bigint] NULL,
	[TotalMissionInHoliday] [int] NULL,
	[TotalNormalExtraWorkAmount] [int] NULL,
	[TotalExtraWorkAmount] [int] NULL,
	[ConsideredWork] [int] NULL,
	[TotalFunctionalityCountInDay] [int] NULL,
	[TotalAccuredHoliday] [int] NULL,
	[TotalPeriodDayCount] [int] NULL,
	[FunctionalityAmount] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Fact_Employee]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Fact_Employee](
	[Employee_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[NationalCode] [nvarchar](255) NULL,
	[FirstName] [nvarchar](255) NULL,
	[LastName] [nvarchar](255) NULL,
	[Gender_Key] [dbo].[udt_surrogate_key] NULL,
	[MaritalStatus_Key] [dbo].[udt_surrogate_key] NULL,
	[BirthDate] [datetime] NULL,
	[PersonelyCode] [nvarchar](255) NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
	[ServiceArea_Key] [dbo].[udt_surrogate_key] NULL,
	[ContractType_Key] [dbo].[udt_surrogate_key] NULL,
	[Company_Key] [dbo].[udt_surrogate_key] NULL,
	[Department_Key] [dbo].[udt_surrogate_key] NULL,
	[SubDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[Job_Key] [dbo].[udt_surrogate_key] NULL,
	[JobPost_Key] [dbo].[udt_surrogate_key] NULL,
	[Education_Key] [dbo].[udt_surrogate_key] NULL,
	[PersonStatus_Key] [dbo].[udt_surrogate_key] NULL,
 CONSTRAINT [PK_Fact_Employee] PRIMARY KEY CLUSTERED 
(
	[Employee_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Fact_EmployeePeriodCalculation]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Fact_EmployeePeriodCalculation](
	[Employee_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[Period_Key] [dbo].[udt_surrogate_key] NULL,
	[WorkingYear_Key] [dbo].[udt_surrogate_key] NULL,
	[AbsenceCount] [int] NULL,
	[DelayCount] [int] NULL,
	[HurryCount] [int] NULL,
	[TotalAlowedWorkDeficit] [int] NULL,
	[TotalShifts] [int] NULL,
	[FunctionalityCountInDay] [int] NULL,
	[PresenceCountInDay] [int] NULL,
	[DeficitAccruedHolidayInMinutes] [int] NULL,
	[DeficitAccruedHolidayInDay] [int] NULL,
	[AccruedHolidayInMinutes] [int] NULL,
	[AccruedHolidayInDay] [int] NULL,
	[PrecenseAmount] [int] NULL,
	[AbsenceWorkDeficitAmount] [int] NULL,
	[DelayWorkDeficitAmount] [int] NULL,
	[HurryWorkDeficitAmount] [int] NULL,
	[TotalWorkDeficitAmount] [int] NULL,
	[TotalFunctionalityAmount] [int] NULL,
	[Vacation_Key] [dbo].[udt_surrogate_key] NULL,
	[TotalvacationAmount] [int] NULL,
	[TotalvacationCount] [int] NULL,
	[Mission_Key] [dbo].[udt_surrogate_key] NULL,
	[TotalMissionAmount] [int] NULL,
	[TotalMissionInHoliday] [int] NULL,
	[TotalNormalExtraWorkAmount] [int] NULL,
	[TotalExtraWorkAmount] [int] NULL,
	[ConsideredWork] [int] NULL,
	[TotalFunctionalityCountInDay] [int] NULL,
	[TotalAccuredHoliday] [int] NULL,
	[TotalPeriodDayCount] [int] NULL,
	[FunctionalityAmount] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [HR].[Personel_Info_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HR].[Personel_Info_Staging](
	[tp_ID] [int] NOT NULL,
	[NationalCode] [nvarchar](255) NULL,
	[FirstName] [nvarchar](255) NULL,
	[LastName] [nvarchar](255) NULL,
	[Gender_Key] [dbo].[udt_surrogate_key] NULL,
	[Jensiat] [nvarchar](255) NULL,
	[MaritalStatus_Key] [dbo].[udt_surrogate_key] NULL,
	[VaziatTahol] [nvarchar](255) NULL,
	[BirthDate] [datetime] NULL,
	[PersonelyCode] [nvarchar](255) NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
	[mahaleKhedmat] [int] NULL,
	[ServiceArea_Key] [dbo].[udt_surrogate_key] NULL,
	[ContractType_Key] [dbo].[udt_surrogate_key] NULL,
	[NoeGharardad] [nvarchar](50) NULL,
	[Company_Key] [dbo].[udt_surrogate_key] NULL,
	[Sherkat_ID] [int] NULL,
	[Department_Key] [dbo].[udt_surrogate_key] NULL,
	[Vahed_ID] [int] NULL,
	[SubDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[ZirVahed_ID] [int] NULL,
	[Ghesmat_ID] [int] NULL,
	[Section_Key] [dbo].[udt_surrogate_key] NULL,
	[Job_Key] [dbo].[udt_surrogate_key] NULL,
	[Display_Job] [nvarchar](150) NULL,
	[JobPost_Key] [dbo].[udt_surrogate_key] NULL,
	[Post2] [nvarchar](255) NULL,
	[Education_Key] [dbo].[udt_surrogate_key] NULL,
	[Maghta_ID] [int] NULL,
	[PersonStatus_Key] [dbo].[udt_surrogate_key] NULL,
	[VaziatPersonel] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[Dim_DocumentType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[Dim_DocumentType](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Title] [nvarchar](1000) NULL,
	[InsertedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[Dim_FloorPart]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[Dim_FloorPart](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Title] [nvarchar](1000) NULL,
	[InsertedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[Dim_GroupPart]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[Dim_GroupPart](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Title] [nvarchar](1000) NULL,
	[InsertedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[Dim_Status]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[Dim_Status](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Title] [nvarchar](1000) NULL,
	[InsertedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[Fact_Documents]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[Fact_Documents](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[RowNum] [bigint] NULL,
	[DocNumber] [bigint] NULL,
	[InvoiceSerial] [nvarchar](50) NULL,
	[DocDate] [nvarchar](10) NULL,
	[DocSaveDate] [nvarchar](10) NULL,
	[DateApprove] [nvarchar](10) NULL,
	[DocType] [nvarchar](200) NULL,
	[Seller] [nvarchar](3000) NULL,
	[SellerState] [nvarchar](100) NULL,
	[ActivityType] [nvarchar](100) NULL,
	[Source] [nvarchar](1000) NULL,
	[Destination] [nvarchar](3500) NULL,
	[BillOfLadingNumber] [nvarchar](1000) NULL,
	[DocDescription] [nvarchar](3500) NULL,
	[Status] [nvarchar](500) NULL,
	[GroupPart] [nvarchar](500) NULL,
	[FloorPart] [nvarchar](1000) NULL,
	[PartCode] [nvarchar](100) NULL,
	[PartDescription] [nvarchar](3500) NULL,
	[Unit] [nvarchar](50) NULL,
	[Amount] [decimal](28, 15) NULL,
	[PriceUnit] [decimal](28, 15) NULL,
	[PriceDiscount] [decimal](28, 15) NULL,
	[PriceOther] [decimal](28, 15) NULL,
	[PriceTax] [decimal](28, 15) NULL,
	[PriceFinal] [decimal](28, 15) NULL,
	[Decription] [nvarchar](3999) NULL,
	[InsertedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[Fact_ntsw]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[Fact_ntsw](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[VoucherName] [nvarchar](256) NULL,
	[InventoryVoucherCategory] [nvarchar](256) NULL,
	[Number] [bigint] NULL,
	[VoucherCode] [nvarchar](20) NULL,
	[Date] [datetime] NULL,
	[BranchName] [nvarchar](256) NULL,
	[PartCode] [nvarchar](64) NULL,
	[PartName] [nvarchar](512) NULL,
	[TechnicalSpecification] [nvarchar](50) NULL,
	[StoreRef] [int] NULL,
	[PartRef] [int] NULL,
	[PartNature] [nvarchar](256) NULL,
	[UnitName] [nvarchar](256) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[MajorUnitQuantity] [decimal](28, 6) NULL,
	[State] [nvarchar](256) NULL,
	[CounterpartEntityText] [nvarchar](512) NULL,
	[CounterpartTypeTitle] [nvarchar](512) NULL,
	[DelivererOrReceiverPartyFullName] [nvarchar](512) NULL,
	[PersianDateStr] [nvarchar](14) NULL,
	[PersianDateInt] [int] NULL,
	[InsertDate] [datetime] NULL,
	[Remaining] [decimal](31, 6) NULL,
 CONSTRAINT [PK__Fact_nts__360414DFD860C70F] PRIMARY KEY NONCLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Fact_ntsw]    Script Date: 9/28/2026 11:42:38 AM ******/
CREATE CLUSTERED INDEX [IX_Fact_ntsw] ON [NTSW].[Fact_ntsw]
(
	[PartCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Table [NTSW].[StFact_ntsw]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [NTSW].[StFact_ntsw](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[VoucherName] [nvarchar](256) NULL,
	[InventoryVoucherCategory] [nvarchar](256) NULL,
	[Number] [bigint] NULL,
	[VoucherCode] [nvarchar](20) NULL,
	[Date] [datetime] NULL,
	[BranchName] [nvarchar](256) NULL,
	[PartCode] [nvarchar](64) NULL,
	[PartName] [nvarchar](512) NULL,
	[TechnicalSpecification] [nvarchar](50) NULL,
	[StoreRef] [int] NULL,
	[PartRef] [int] NULL,
	[PartNature] [nvarchar](256) NULL,
	[UnitName] [nvarchar](256) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[MajorUnitQuantity] [decimal](28, 6) NULL,
	[State] [nvarchar](256) NULL,
	[CounterpartEntityText] [nvarchar](512) NULL,
	[CounterpartTypeTitle] [nvarchar](512) NULL,
	[DelivererOrReceiverPartyFullName] [nvarchar](512) NULL,
	[PersianDateStr] [nvarchar](14) NULL,
	[PersianDateInt] [int] NULL,
	[InsertDate] [datetime] NULL,
	[Remaining] [decimal](31, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Delivery_Staging]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Delivery_Staging](
	[DeliveryItemID] [bigint] NULL,
	[DeliveryRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[ReferenceRef] [int] NULL,
	[DeliveryDate] [datetime] NULL,
	[ApprovedDeliveryDate] [datetime] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_CounterpartType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_CounterpartType](
	[CounterpartType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CounterpartID] [int] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_CounterpartType] PRIMARY KEY CLUSTERED 
(
	[CounterpartType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_DeliveryState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_DeliveryState](
	[DeliveryState_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[DeliveryStateID] [bigint] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_DeliveryState] PRIMARY KEY CLUSTERED 
(
	[DeliveryState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_InventoryVoucherState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_InventoryVoucherState](
	[InventoryVoucherState_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ID] [bigint] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_InventoryVoucherState] PRIMARY KEY CLUSTERED 
(
	[InventoryVoucherState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_InvoiceState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_InvoiceState](
	[InvoiceState_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[InvoiceStateID] [bigint] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_InvoiceState] PRIMARY KEY CLUSTERED 
(
	[InvoiceState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PayInfoState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PayInfoState](
	[PayInfoState_Key] [int] NOT NULL,
	[PayInfoState_Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PayInfoState] PRIMARY KEY CLUSTERED 
(
	[PayInfoState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PaymentMethod]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PaymentMethod](
	[PaymentMethod_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PaymentMethodName] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PaymentMethod] PRIMARY KEY CLUSTERED 
(
	[PaymentMethod_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PaymentRefType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PaymentRefType](
	[RefType_Key] [int] NOT NULL,
	[RefType_Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PaymentRefType] PRIMARY KEY CLUSTERED 
(
	[RefType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PayOrderState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PayOrderState](
	[PayOrderState_Key] [int] NOT NULL,
	[PayOrderState_Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PayOrderState] PRIMARY KEY CLUSTERED 
(
	[PayOrderState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PayReqState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PayReqState](
	[PayReqState_Key] [int] NOT NULL,
	[PayReqState_Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PayReqState] PRIMARY KEY CLUSTERED 
(
	[PayReqState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PayState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PayState](
	[PayState_Key] [int] NOT NULL,
	[PayState_Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PayState] PRIMARY KEY CLUSTERED 
(
	[PayState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchaseMethod]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchaseMethod](
	[PurchaseMethod_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchaseMethodName] [nvarchar](50) NULL,
 CONSTRAINT [PK_Table_1] PRIMARY KEY CLUSTERED 
(
	[PurchaseMethod_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchaseRequestType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchaseRequestType](
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchaseRequestTypeId] [bigint] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PurchaseRequestType_1] PRIMARY KEY CLUSTERED 
(
	[PurchaseRequestType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchaseState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchaseState](
	[State_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[StateCode] [int] NULL,
	[StateName] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PurchaseState_1] PRIMARY KEY CLUSTERED 
(
	[State_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchaseType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchaseType](
	[PurchaseType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchaseTypeID] [int] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PurchaseType] PRIMARY KEY CLUSTERED 
(
	[PurchaseType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchasingAgent]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchasingAgent](
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchasingAgentID] [bigint] NULL,
	[PartyRef] [bigint] NULL,
	[FirstName] [nvarchar](50) NULL,
	[FullName] [nvarchar](101) NULL,
 CONSTRAINT [PK_Dim_PurchasingAgent_1] PRIMARY KEY CLUSTERED 
(
	[PurchasingAgent_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchasingAgent_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchasingAgent_2](
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchasingAgentID] [bigint] NULL,
	[PartyRef] [bigint] NULL,
	[FirstName] [nvarchar](50) NULL,
	[FullName] [nvarchar](101) NULL,
 CONSTRAINT [PK_Dim_PurchasingAgent_2] PRIMARY KEY CLUSTERED 
(
	[PurchasingAgent_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_PurchasingDepartment]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_PurchasingDepartment](
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NOT NULL,
	[PurchasingDepartmentID] [bigint] NULL,
	[Number] [int] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_PurchasingDepartment] PRIMARY KEY CLUSTERED 
(
	[PurchasingDepartment_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_QuotationState]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_QuotationState](
	[QuotationState_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[QuotationStateID] [bigint] NULL,
	[Title] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_QuotationState] PRIMARY KEY CLUSTERED 
(
	[QuotationState_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_Supplier]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_Supplier](
	[Supplier_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[SupplierID] [bigint] NULL,
	[PartyRef] [bigint] NULL,
	[FirstName] [nvarchar](50) NULL,
	[LastName] [nvarchar](50) NULL,
	[FullName] [nvarchar](150) NULL,
	[SupplierNumber] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_Supplier] PRIMARY KEY CLUSTERED 
(
	[Supplier_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_Supplier_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_Supplier_2](
	[Supplier_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[SupplierID] [bigint] NULL,
	[PartyRef] [bigint] NULL,
	[FirstName] [nvarchar](50) NULL,
	[LastName] [nvarchar](50) NULL,
	[FullName] [nvarchar](150) NULL,
	[SupplierNumber] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_Supplier_2] PRIMARY KEY CLUSTERED 
(
	[Supplier_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_TransportType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_TransportType](
	[TransportType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[TransportTypeName] [nvarchar](50) NULL,
 CONSTRAINT [PK_Dim_TransportType] PRIMARY KEY CLUSTERED 
(
	[TransportType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_User]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_User](
	[UserID] [bigint] NULL,
	[Name] [nvarchar](50) NULL,
	[PartyRef] [bigint] NULL,
	[Creator_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
 CONSTRAINT [PK_Dim_User] PRIMARY KEY CLUSTERED 
(
	[Creator_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Dim_UserPurchaseType]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Dim_UserPurchaseType](
	[UserPurchaseType_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[UserPurchaseTypeID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Title] [nvarchar](256) NULL,
	[PurchaseType] [int] NULL,
 CONSTRAINT [PK_Dim_UserPurchaseType_1] PRIMARY KEY CLUSTERED 
(
	[UserPurchaseType_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_CashFlowFactorGrouping]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_CashFlowFactorGrouping](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[CashFlowFactorGroupingID] [int] NULL,
	[CashFlowFactorGroupingCode] [int] NULL,
	[CashFlowFactorGroupingTitle] [nvarchar](200) NULL,
	[CashFlowFactorGroupingDetailID] [int] NULL,
	[CashFlowFactorGroupingDetailCode] [nvarchar](50) NULL,
	[CashFlowFactorGroupingDetailTitle] [nvarchar](500) NULL,
	[ParentRef] [int] NULL,
	[Left] [int] NULL,
	[Right] [int] NULL,
	[InsertedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Delivery]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Delivery](
	[DeliveryItemID] [bigint] NULL,
	[DeliveryRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[DeliveryDate] [datetime] NULL,
	[ApprovedDeliveryDate] [datetime] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Delivery_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Delivery_2](
	[DeliveryItemID] [bigint] NULL,
	[DeliveryRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[DeliveryDate] [datetime] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Inquiry]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Inquiry](
	[InquiryItemID] [bigint] NULL,
	[InquiryRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Number] [nvarchar](50) NULL,
	[InquiryDate] [datetime] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[PurchasingDepartment_key] [dbo].[udt_surrogate_key] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Inquiry_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Inquiry_2](
	[InquiryItemID] [bigint] NULL,
	[InquiryRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Number] [nvarchar](50) NULL,
	[InquiryDate] [datetime] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[PurchasingDepartment_key] [dbo].[udt_surrogate_key] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Inquiry_Process]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Inquiry_Process](
	[Number] [int] NULL,
	[RequestDate] [datetime] NULL,
	[Quantity] [decimal](18, 6) NULL,
	[DemandDate] [datetime] NULL,
	[FullName] [nvarchar](200) NULL,
	[UnitName] [nvarchar](256) NULL,
	[NameGhalam] [nvarchar](300) NULL,
	[CodeGhalam] [nvarchar](128) NULL,
	[NoeiGhalamKharidani] [nvarchar](50) NULL,
	[VaziatGhalamDarkhast] [nvarchar](50) NULL,
	[RavieKharid] [nvarchar](50) NULL,
	[TarafMoghabel] [nvarchar](256) NULL,
	[NoeiTarafMoghabel] [nvarchar](100) NULL,
	[VahedTamin] [nvarchar](200) NULL,
	[ShomareEstelamBaha] [int] NULL,
	[TarikhestelamBaha] [datetime] NULL,
	[MohlatEstelam] [datetime] NULL,
	[VaziatGhalamestelam] [nvarchar](100) NULL,
	[ShomarePishFactor] [nvarchar](50) NULL,
	[TarikhPishFactor] [datetime] NULL,
	[VaziatGhalamPishFactor] [nvarchar](100) NULL,
	[TaminKonande] [nvarchar](200) NULL,
	[ShomareDastorKharid] [int] NULL,
	[TarikhDastorKharid] [datetime] NULL,
	[MeghdarDastorShode] [decimal](18, 6) NULL,
	[VaziatGhalamDastor] [nvarchar](100) NULL,
	[ShomareSefaresh] [int] NULL,
	[TarikhSefaresh] [datetime] NULL,
	[MeghdarSefareshShode] [decimal](18, 6) NULL,
	[VaziatGhalamSefaresh] [nvarchar](100) NULL,
	[ShomareTahvil] [int] NULL,
	[TarikhTahvil] [datetime] NULL,
	[MeghdarTahvilShode] [decimal](18, 6) NULL,
	[VaziatGhalamTahvil] [nvarchar](100) NULL,
	[ShomareResid] [int] NULL,
	[MeghdarResid] [decimal](18, 6) NULL,
	[TarikhResid] [datetime] NULL,
	[ShomareFactor] [nvarchar](50) NULL,
	[TarikhFactor] [datetime] NULL,
	[MeghdarFactorShode] [decimal](18, 6) NULL,
	[Fee] [decimal](18, 6) NULL,
	[MablaghNakhalesFactor] [decimal](18, 6) NULL,
	[MablaghKhalesFactor] [decimal](18, 6) NULL,
	[Ezafat] [decimal](18, 6) NULL,
	[Kosorat] [decimal](18, 6) NULL,
	[Arz] [nvarchar](128) NULL,
	[HazineTakmili] [nvarchar](300) NULL,
	[MablaghKhalesHazineTakmili] [decimal](18, 6) NULL,
	[VaziatGhalamFactor] [nvarchar](100) NULL,
	[TarikhTaeidTahvil] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Inventory]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Inventory](
	[InventoryVoucherItemID] [bigint] NULL,
	[InventoryVoucherRef] [bigint] NULL,
	[InventoryVoucherNumber] [nvarchar](50) NULL,
	[DeliveryItemID] [bigint] NULL,
	[DeliveryRef] [bigint] NULL,
	[DeliveryDate] [datetime] NULL,
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[ApprovedDeliveryDate] [datetime] NULL,
	[ReferenceDelivery] [bigint] NULL,
	[StateVoucher_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[QuantityVoucher] [decimal](28, 6) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[InventoryVoucherDate] [datetime] NULL,
	[QuantityDelivery] [decimal](28, 6) NULL,
	[StateDelivery_Key] [dbo].[udt_surrogate_key] NULL,
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[PriceInvoice] [decimal](28, 6) NULL,
	[FeeInvoice] [decimal](28, 6) NULL,
	[QuantityInvoice] [decimal](28, 6) NULL,
	[StateInvoice_Key] [dbo].[udt_surrogate_key] NULL,
	[SupplierInvoice_Key] [dbo].[udt_surrogate_key] NULL,
	[AdditionSInvoice] [decimal](28, 6) NULL,
	[DeductionsInvoice] [decimal](28, 6) NULL,
	[NetPriceInvoice] [decimal](28, 6) NULL,
	[NumberInvoice] [nvarchar](50) NULL,
	[InvoiceDate] [datetime] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Inventory_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Inventory_2](
	[InventoryVoucherItemID] [bigint] NULL,
	[InventoryVoucherRef] [bigint] NULL,
	[InventoryVoucherNumber] [nvarchar](50) NULL,
	[DeliveryItemID] [bigint] NULL,
	[DeliveryRef] [bigint] NULL,
	[DeliveryDate] [datetime] NULL,
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[ApprovedDeliveryDate] [datetime] NULL,
	[ReferenceDelivery] [bigint] NULL,
	[StateVoucher_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[QuantityVoucher] [decimal](28, 6) NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[InventoryVoucherDate] [datetime] NULL,
	[QuantityDelivery] [decimal](28, 6) NULL,
	[StateDelivery_Key] [dbo].[udt_surrogate_key] NULL,
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[PriceInvoice] [decimal](28, 6) NULL,
	[FeeInvoice] [decimal](28, 6) NULL,
	[QuantityInvoice] [decimal](28, 6) NULL,
	[StateInvoice_Key] [dbo].[udt_surrogate_key] NULL,
	[SupplierInvoice_Key] [dbo].[udt_surrogate_key] NULL,
	[AdditionSInvoice] [decimal](28, 6) NULL,
	[DeductionsInvoice] [decimal](28, 6) NULL,
	[NetPriceInvoice] [decimal](28, 6) NULL,
	[NumberInvoice] [nvarchar](50) NULL,
	[InvoiceDate] [datetime] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_InventoryVoucher]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_InventoryVoucher](
	[InventoryVoucherItemID] [bigint] NULL,
	[InventoryVoucherRef] [bigint] NULL,
	[State] [int] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[Date] [datetime] NULL,
	[Number] [nvarchar](50) NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Invoice]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Invoice](
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Price] [decimal](28, 6) NULL,
	[InvoiceDate] [datetime] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Invoice_2]    Script Date: 9/28/2026 11:42:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Invoice_2](
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Price] [decimal](28, 6) NULL,
	[InvoiceDate] [datetime] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Order]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Order](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[OrderDate] [datetime] NULL,
	[Number] [nvarchar](50) NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Order_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Order_2](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[OrderDate] [datetime] NULL,
	[Number] [nvarchar](50) NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Pay]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Pay](
	[PaymentID] [bigint] NULL,
	[Number] [nvarchar](64) NULL,
	[Date] [datetime] NULL,
	[CounterPart_Key] [dbo].[udt_surrogate_key] NULL,
	[ApproveDate] [datetime] NULL,
	[ApproveState] [int] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[Creator_Key] [bigint] NULL,
	[TotalOperationalCurrencyAmount] [decimal](28, 6) NULL,
	[Report_Pay_Date] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Payment]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Payment](
	[PayInfo_ID] [bigint] NULL,
	[PayInfo_Number] [nvarchar](150) NULL,
	[PayInfo_Date] [datetime] NULL,
	[CurrencyRef] [bigint] NULL,
	[FiscalYearRef] [bigint] NULL,
	[PayInfo_State] [int] NULL,
	[PayInfoItem_ID] [bigint] NULL,
	[PayInfoItem_RefNumber] [nvarchar](150) NULL,
	[PayInfoItem_RefType] [int] NULL,
	[PayInfoItem_PaymentAmountInReferenceCurrency] [decimal](28, 6) NULL,
	[PayInfoItem_PaymentAmount] [decimal](28, 6) NULL,
	[PayInfoItem_ReferenceCurrencyRef] [bigint] NULL,
	[PayReq_ID] [bigint] NULL,
	[PayReq_Number] [nvarchar](128) NULL,
	[PayReq_Quantity] [decimal](28, 6) NULL,
	[PayReq_ReferenceAmount] [decimal](28, 6) NULL,
	[PayReqItem_ID] [bigint] NULL,
	[PayReqItem_Amount] [decimal](28, 6) NULL,
	[PayReqItem_PaymentDate] [datetime] NULL,
	[PayReqItem_State] [int] NULL,
	[PayReqItem_Quantity] [decimal](28, 6) NULL,
	[PayOrder_ID] [bigint] NULL,
	[PayOrder_Number] [nvarchar](128) NULL,
	[PayOrder_Date] [datetime] NULL,
	[PayOrder_State] [int] NULL,
	[PayOrder_ApproveDate] [datetime] NULL,
	[Pay_ID] [bigint] NULL,
	[Pay_Number] [nvarchar](64) NULL,
	[Pay_Date] [datetime] NULL,
	[CounterPart_Key] [dbo].[udt_surrogate_key] NULL,
	[Pay_ApproveDate] [datetime] NULL,
	[Pay_ApproveState] [int] NULL,
	[TotalOperationalCurrencyAmount] [decimal](28, 6) NULL,
	[Invoice_ID] [bigint] NULL,
	[Order_ID] [bigint] NULL,
	[PayOrder_DepositAmount] [decimal](28, 6) NULL,
	[PayInfo_Creator] [bigint] NULL,
	[Report_Pay_Date] [datetime] NULL,
	[cf_payDuration] [decimal](28, 6) NULL,
	[cf_payDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Payment_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Payment_2](
	[PayInfo_ID] [bigint] NULL,
	[PayInfo_Number] [nvarchar](150) NULL,
	[PayInfo_Date] [datetime] NULL,
	[CurrencyRef] [bigint] NULL,
	[FiscalYearRef] [bigint] NULL,
	[PayInfo_State] [int] NULL,
	[PayInfoItem_ID] [bigint] NULL,
	[PayInfoItem_RefNumber] [nvarchar](150) NULL,
	[PayInfoItem_RefType] [int] NULL,
	[PayInfoItem_PaymentAmountInReferenceCurrency] [decimal](28, 6) NULL,
	[PayInfoItem_PaymentAmount] [decimal](28, 6) NULL,
	[PayInfoItem_ReferenceCurrencyRef] [bigint] NULL,
	[PayReq_ID] [bigint] NULL,
	[PayReq_Number] [nvarchar](128) NULL,
	[PayReq_Quantity] [decimal](28, 6) NULL,
	[PayReq_ReferenceAmount] [decimal](28, 6) NULL,
	[PayReqItem_ID] [bigint] NULL,
	[PayReqItem_Amount] [decimal](28, 6) NULL,
	[PayReqItem_PaymentDate] [datetime] NULL,
	[PayReqItem_State] [int] NULL,
	[PayReqItem_Quantity] [decimal](28, 6) NULL,
	[PayOrder_ID] [bigint] NULL,
	[PayOrder_Number] [nvarchar](128) NULL,
	[PayOrder_Date] [datetime] NULL,
	[PayOrder_State] [int] NULL,
	[PayOrder_ApproveDate] [datetime] NULL,
	[Pay_ID] [bigint] NULL,
	[Pay_Number] [nvarchar](64) NULL,
	[Pay_Date] [datetime] NULL,
	[CounterPart_Key] [dbo].[udt_surrogate_key] NULL,
	[Pay_ApproveDate] [datetime] NULL,
	[Pay_ApproveState] [int] NULL,
	[TotalOperationalCurrencyAmount] [decimal](28, 6) NULL,
	[Invoice_ID] [bigint] NULL,
	[Order_ID] [bigint] NULL,
	[PayOrder_DepositAmount] [decimal](28, 6) NULL,
	[PayInfo_Creator] [bigint] NULL,
	[Report_Pay_Date] [datetime] NULL,
	[cf_payDuration] [decimal](28, 6) NULL,
	[cf_payDate] [datetime] NULL,
	[Invoice_Fee] [decimal](28, 6) NULL,
	[Order_Fee] [decimal](28, 6) NULL,
	[PartID] [bigint] NULL,
	[PayInfo_CreationDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PaymentInfo]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PaymentInfo](
	[PayInfoItemID] [bigint] NULL,
	[PayInfoRef] [bigint] NULL,
	[ReferenceNumber] [nvarchar](150) NULL,
	[ReferenceType] [int] NULL,
	[PaymentAmountInReferenceCurrency] [decimal](28, 6) NULL,
	[PaymentAmount] [decimal](28, 6) NULL,
	[ReferenceCurrencyRef] [bigint] NULL,
	[Number] [nvarchar](150) NULL,
	[Date] [datetime] NULL,
	[Currency_Key] [bigint] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[State] [int] NULL,
	[Creator_Key] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[cf_payDuration] [decimal](28, 6) NULL,
	[cf_payDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PaymentInfo_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PaymentInfo_2](
	[PayInfoItemID] [bigint] NULL,
	[ReferenceNumber] [nvarchar](150) NULL,
	[ReferenceType] [int] NULL,
	[PaymentAmountInReferenceCurrency] [decimal](28, 6) NULL,
	[PaymentAmount] [decimal](28, 6) NULL,
	[ReferenceCurrencyRef] [bigint] NULL,
	[Number] [nvarchar](150) NULL,
	[Date] [datetime] NULL,
	[Currency_Key] [bigint] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[State] [int] NULL,
	[Creator_Key] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PaymentOrder]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PaymentOrder](
	[PaymentOrderID] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Date] [datetime] NULL,
	[CounterPart_Key] [bigint] NULL,
	[Creator_Key] [bigint] NULL,
	[State] [int] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[ApproveDate] [datetime] NULL,
	[DepositAmount] [decimal](28, 6) NULL,
	[DepositCurrency_Key] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PaymentReq]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PaymentReq](
	[PaymentReqItemID] [bigint] NULL,
	[PaymentReqRef] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[Amount] [decimal](28, 6) NULL,
	[PaymentDate] [datetime] NULL,
	[ItemState] [int] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[CounterPart_Key] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Creator_Key] [bigint] NULL,
	[State] [int] NULL,
	[ReferenceAmount] [decimal](28, 6) NULL,
	[FiscalYear_Key] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Purchase]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Purchase](
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[Number_PO] [nvarchar](50) NULL,
	[Number_PR] [nvarchar](50) NULL,
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Supplier_Key_O] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[OrderDate] [datetime] NULL,
	[RequestDate] [datetime] NULL,
	[DemandDate] [datetime] NULL,
	[RequestingCenter_Key] [dbo].[udt_surrogate_key] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity_PR] [decimal](28, 6) NULL,
	[Quantity_PO] [decimal](28, 6) NULL,
	[Fee_PO] [decimal](28, 6) NULL,
	[Price_PO] [decimal](28, 6) NULL,
	[Additions_PO] [decimal](28, 6) NULL,
	[Deductions_PO] [decimal](28, 6) NULL,
	[NetPrice_PO] [decimal](28, 6) NULL,
	[Quantity_O] [decimal](28, 6) NULL,
	[Fee_O] [decimal](28, 6) NULL,
	[Price_O] [decimal](28, 6) NULL,
	[Additions_O] [decimal](28, 6) NULL,
	[Deductions_O] [decimal](28, 6) NULL,
	[NetPrice_O] [decimal](28, 6) NULL,
	[State_PO] [int] NULL,
	[State_O] [int] NULL,
	[State_PR] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchasetype_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Purchase_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Purchase_2](
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[Number_PO] [nvarchar](50) NULL,
	[Number_PR] [nvarchar](50) NULL,
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Supplier_Key_O] [dbo].[udt_surrogate_key] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[OrderDate] [datetime] NULL,
	[RequestDate] [datetime] NULL,
	[DemandDate] [datetime] NULL,
	[RequestingCenter_Key] [dbo].[udt_surrogate_key] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity_PR] [decimal](28, 6) NULL,
	[Quantity_PO] [decimal](28, 6) NULL,
	[Fee_PO] [decimal](28, 6) NULL,
	[Price_PO] [decimal](28, 6) NULL,
	[Additions_PO] [decimal](28, 6) NULL,
	[Deductions_PO] [decimal](28, 6) NULL,
	[NetPrice_PO] [decimal](28, 6) NULL,
	[Quantity_O] [decimal](28, 6) NULL,
	[Fee_O] [decimal](28, 6) NULL,
	[Price_O] [decimal](28, 6) NULL,
	[Additions_O] [decimal](28, 6) NULL,
	[Deductions_O] [decimal](28, 6) NULL,
	[NetPrice_O] [decimal](28, 6) NULL,
	[State_PO] [int] NULL,
	[State_O] [int] NULL,
	[State_PR] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchasetype_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PurchaseOrder]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PurchaseOrder](
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Number] [nvarchar](50) NULL,
	[State] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[ItemState] [int] NULL,
	[PurchaseOrderDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PurchaseOrder_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PurchaseOrder_2](
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Number] [nvarchar](50) NULL,
	[State] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[ItemState] [int] NULL,
	[PurchaseOrderDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PurchaseRequest]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PurchaseRequest](
	[PurchaseRequestItemID] [bigint] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[DemandDate] [datetime] NULL,
	[InquiryDeadlineDate] [datetime] NULL,
	[Number_PR] [nvarchar](50) NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType] [int] NULL,
	[State_PR] [int] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[RequestDate] [datetime] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_PurchaseRequest_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_PurchaseRequest_2](
	[PurchaseRequestItemID] [bigint] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[DemandDate] [datetime] NULL,
	[InquiryDeadlineDate] [datetime] NULL,
	[Number_PR] [nvarchar](50) NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType] [int] NULL,
	[State_PR] [int] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[RequestDate] [datetime] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Quotation]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Quotation](
	[QuotationItemID] [bigint] NULL,
	[QuotationRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[ItemState] [int] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationDate] [datetime] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PaymentMethod] [int] NULL,
	[PurchaseMethod] [int] NULL,
	[TransportType] [int] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Fact_Quotation_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Fact_Quotation_2](
	[QuotationItemID] [bigint] NULL,
	[QuotationRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[ItemState] [int] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationDate] [datetime] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PaymentMethod] [int] NULL,
	[PurchaseMethod] [int] NULL,
	[TransportType] [int] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[PurchaseRequestNumber] [nvarchar](50) NULL,
	[InquiryNumber] [nvarchar](50) NULL,
	[EntityUnitRef] [int] NULL,
	[Number] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Inovice_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Inovice_Staging](
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Price] [decimal](28, 6) NULL,
	[InvoiceDate] [datetime] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Inquiry_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Inquiry_Staging](
	[InquiryItemID] [bigint] NULL,
	[InquiryRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Number] [nvarchar](50) NULL,
	[InquiryDate] [datetime] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_key] [dbo].[udt_surrogate_key] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[InventoryVoucher_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[InventoryVoucher_Staging](
	[InventoryVoucherItemID] [bigint] NULL,
	[ReferenceRefInvoiceItem] [bigint] NULL,
	[InventoryVoucherRef] [bigint] NULL,
	[InventoryVoucherNumber] [nvarchar](50) NULL,
	[ReferenceVoucher] [bigint] NULL,
	[ReceiptPermitItemID] [bigint] NULL,
	[ReferencePermit] [bigint] NULL,
	[DeliveryItemID] [bigint] NULL,
	[ReceiptPermitRef] [bigint] NULL,
	[DeliveryRef] [bigint] NULL,
	[ReferenceDelivery] [bigint] NULL,
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[StateVoucher] [int] NULL,
	[StateVoucher_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRefVoucher] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[CounterpartEntityRef] [bigint] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[QuantityVoucher] [decimal](28, 6) NULL,
	[StoreRef] [bigint] NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[InventoryVoucherDate] [datetime] NULL,
	[StatePermit] [int] NULL,
	[DeliveryDate] [datetime] NULL,
	[ApprovedDeliveryDate] [datetime] NULL,
	[QuantityDelivery] [decimal](28, 6) NULL,
	[StateDelivery] [int] NULL,
	[StateDelivery_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRefPermit] [bigint] NULL,
	[QuantityPermit] [decimal](28, 6) NULL,
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[PriceInvoice] [decimal](28, 6) NULL,
	[FeeInvoice] [decimal](28, 6) NULL,
	[QuantityInvoice] [decimal](28, 6) NULL,
	[StateInvoice] [int] NULL,
	[StateInvoice_Key] [dbo].[udt_surrogate_key] NULL,
	[SupplierInvoice] [bigint] NULL,
	[SupplierInvoice_Key] [dbo].[udt_surrogate_key] NULL,
	[AdditionSInvoice] [decimal](28, 6) NULL,
	[DeductionsInvoice] [decimal](28, 6) NULL,
	[NetPriceInvoice] [decimal](28, 6) NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[NumberInvoice] [nvarchar](50) NULL,
	[InvoiceDate] [datetime] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[PurchasingDepartmentRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[InventoryVoucher2_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[InventoryVoucher2_Staging](
	[InventoryVoucherItemID] [bigint] NULL,
	[InventoryVoucherRef] [bigint] NULL,
	[ReferenceRef] [int] NULL,
	[State] [int] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[StoreRef] [bigint] NULL,
	[Store_Key] [dbo].[udt_surrogate_key] NULL,
	[Date] [datetime] NULL,
	[Number] [nvarchar](50) NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Invoice_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Invoice_Staging](
	[InvoiceItemID] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[InvoiceDate] [datetime] NULL,
	[Price] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [nvarchar](50) NULL,
	[PurchaseItemRef] [bigint] NULL,
	[PartRef] [bigint] NULL,
	[ReferenceRef] [nvarchar](50) NULL,
	[SupplierRef] [bigint] NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[CurrencyRef] [bigint] NULL,
	[PurchasingDepartmentRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Order_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Order_Staging](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[OrderDate] [datetime] NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[ReferenceRef] [bigint] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[SupplierRef_O] [bigint] NULL,
	[Supplier_Key_O] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity_O] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee_O] [decimal](28, 6) NULL,
	[Price_O] [decimal](28, 6) NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[State_O] [int] NULL,
	[NetPrice_O] [decimal](28, 6) NULL,
	[Additions_O] [decimal](28, 6) NULL,
	[Deductions_O] [decimal](28, 6) NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Order2_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Order2_Staging](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[OrderDate] [datetime] NULL,
	[Number] [nvarchar](50) NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[ReferenceRef] [bigint] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Pay_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Pay_Staging](
	[PaymentID] [bigint] NULL,
	[Number] [nvarchar](64) NULL,
	[Date] [datetime] NULL,
	[CounterPart_Key] [dbo].[udt_surrogate_key] NULL,
	[ApproveDate] [datetime] NULL,
	[ApproveState] [int] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[Creator_Key] [bigint] NULL,
	[TotalOperationalCurrencyAmount] [decimal](28, 6) NULL,
	[Report_Pay_Date] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Payment_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Payment_Staging](
	[PayInfo_ID] [bigint] NULL,
	[PayInfo_Number] [nvarchar](150) NULL,
	[PayInfo_Date] [datetime] NULL,
	[CurrencyRef] [bigint] NULL,
	[FiscalYearRef] [bigint] NULL,
	[PayInfo_State] [int] NULL,
	[PayInfoItem_ID] [bigint] NULL,
	[PayInfoItem_RefNumber] [nvarchar](150) NULL,
	[PayInfoItem_RefType] [int] NULL,
	[PayInfoItem_PaymentAmountInReferenceCurrency] [decimal](28, 6) NULL,
	[PayInfoItem_PaymentAmount] [decimal](28, 6) NULL,
	[PayInfoItem_ReferenceCurrencyRef] [bigint] NULL,
	[PayReq_ID] [bigint] NULL,
	[PayReq_Number] [nvarchar](128) NULL,
	[PayReq_Quantity] [decimal](28, 6) NULL,
	[PayReq_ReferenceAmount] [decimal](28, 6) NULL,
	[PayReqItem_ID] [bigint] NULL,
	[PayReqItem_Amount] [decimal](28, 6) NULL,
	[PayReqItem_PaymentDate] [datetime] NULL,
	[PayReqItem_State] [int] NULL,
	[PayReqItem_Quantity] [decimal](28, 6) NULL,
	[PayOrder_ID] [bigint] NULL,
	[PayOrder_Number] [nvarchar](128) NULL,
	[PayOrder_Date] [datetime] NULL,
	[PayOrder_State] [int] NULL,
	[PayOrder_ApproveDate] [datetime] NULL,
	[Pay_ID] [bigint] NULL,
	[Pay_Number] [nvarchar](64) NULL,
	[Pay_Date] [datetime] NULL,
	[CounterPartRef] [bigint] NULL,
	[CounterPart_Key] [dbo].[udt_surrogate_key] NULL,
	[Pay_ApproveDate] [datetime] NULL,
	[Pay_ApproveState] [int] NULL,
	[TotalOperationalCurrencyAmount] [decimal](28, 6) NULL,
	[Invoice_ID] [bigint] NULL,
	[Order_ID] [bigint] NULL,
	[PayOrder_DepositAmount] [decimal](28, 6) NULL,
	[PayInfo_Creator] [bigint] NULL,
	[Report_Pay_Date] [datetime] NULL,
	[cf_payDuration] [decimal](28, 6) NULL,
	[cf_payDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PaymentInfo_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PaymentInfo_Staging](
	[PayInfoItemID] [bigint] NULL,
	[PayInfoRef] [bigint] NULL,
	[PayInfoItemRefNumber] [nvarchar](150) NULL,
	[PayInfoItemRefType] [int] NULL,
	[PayInfoItemPaymentAmountInReferenceCurrency] [decimal](28, 6) NULL,
	[PayInfoItemPaymentAmount] [decimal](28, 6) NULL,
	[PayInfoItemReferenceCurrencyRef] [bigint] NULL,
	[PayInfoNumber] [nvarchar](150) NULL,
	[PayInfoDate] [datetime] NULL,
	[PayInfoCurrencyRef] [bigint] NULL,
	[PayInfoFiscalYearRef] [bigint] NULL,
	[PayInfoState] [int] NULL,
	[PayInfoCreator] [bigint] NULL,
	[InvoiceRef] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[cf_payDuration] [decimal](28, 6) NULL,
	[cf_payDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PaymentOrder_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PaymentOrder_Staging](
	[PaymentOrderID] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Date] [datetime] NULL,
	[CounterPart_Key] [bigint] NULL,
	[Creator_Key] [bigint] NULL,
	[State] [int] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[ApproveDate] [datetime] NULL,
	[DepositAmount] [decimal](28, 6) NULL,
	[DepositCurrencyRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PaymentReceiveInfo]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PaymentReceiveInfo](
	[RowNumber] [int] IDENTITY(1,1) NOT NULL,
	[شماره اطلاعات دریافت پرداخت] [int] NULL,
	[زمان پرداخت(روز)] [decimal](18, 6) NULL,
	[زمان تامین وجه] [datetime] NULL,
	[وضعیت اطلاعات دریافت پرداخت] [nvarchar](100) NULL,
	[توضیحات اطلاعات دریافت پرداخت] [nvarchar](500) NULL,
	[مبلغ درخواستی(ریال)] [decimal](28, 6) NULL,
	[شماره درخواست پرداخت] [int] NULL,
	[تاریخ درخواست پرداخت] [datetime] NULL,
	[وضعیت درخواست پرداخت] [nvarchar](100) NULL,
	[تاریخ خاتمه درخواست پرداخت] [datetime] NULL,
	[شماره دستور پرداخت] [int] NULL,
	[وضعیت دستور پرداخت] [nvarchar](100) NULL,
	[شماره اعلامیه پرداخت] [int] NULL,
	[وضعیت اعلامیه پرداخت] [nvarchar](100) NULL,
	[تاریخ اعلامیه پرداخت] [datetime] NULL,
	[تاریخ صدور اعلامیه پرداخت] [datetime] NULL,
	[مبلغ پرداختی(ریال)] [decimal](28, 6) NULL,
	[نرخ ارز پرداختی] [decimal](28, 6) NULL,
	[نوع ارز پرداختی] [nvarchar](50) NULL,
	[تاریخ پرداخت] [datetime] NULL,
	[شماره رسید انبار] [int] NULL,
	[تاریخ رسید انبار] [datetime] NULL,
	[کد کالا] [bigint] NULL,
	[نام کالا] [nvarchar](300) NULL,
	[نوع سند مبنا] [nvarchar](100) NULL,
	[شماره سند مبنا] [nvarchar](50) NULL,
	[تاریخ سند مبنا] [datetime] NULL,
	[مبلغ قلم مبنا] [decimal](18, 6) NULL,
	[وضعیت قلم سفارش] [nvarchar](100) NULL,
	[نام تامین کننده] [nvarchar](200) NULL,
	[کد تامین کننده] [int] NULL,
	[نام رمز تامین] [nvarchar](200) NULL,
	[نام کارشناس] [nvarchar](200) NULL,
	[تاریخ اطلاعات دریافت پرداخت] [datetime] NULL,
	[مبلغ پیش پرداخت] [decimal](18, 6) NULL,
	[مبلغ(ریال) بعد از اصلاحات واحد مالی] [decimal](28, 6) NULL,
	[شرح درخواست پرداخت] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[RowNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PaymentReq_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PaymentReq_Staging](
	[PaymentReqItemID] [bigint] NULL,
	[PaymentReqRef] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[Amount] [decimal](28, 6) NULL,
	[PaymentDate] [datetime] NULL,
	[DueDate] [datetime] NULL,
	[ItemState] [int] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[CounterPart_Key] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Creator_Key] [bigint] NULL,
	[State] [int] NULL,
	[ReferenceAmount] [decimal](28, 6) NULL,
	[FiscalYear_Key] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Plant_PurchasingDepartment]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Plant_PurchasingDepartment](
	[PlantID] [bigint] NULL,
	[PurchasingDepartmentID] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Plant_PurchasingDepartment_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Plant_PurchasingDepartment_2](
	[PlantID] [bigint] NULL,
	[PurchasingDepartmentID] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Purchase_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Purchase_Staging](
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[Number_PO] [nvarchar](50) NULL,
	[Number_PR] [nvarchar](50) NULL,
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[ReferenceRef] [bigint] NULL,
	[SupplierRef_O] [bigint] NULL,
	[Supplier_Key_O] [dbo].[udt_surrogate_key] NULL,
	[SupplierRef_PO] [bigint] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[OrderDate] [datetime] NULL,
	[RequestDate] [datetime] NULL,
	[DemandDate] [datetime] NULL,
	[RequestingCenterRef] [bigint] NULL,
	[RequestingCenter_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity_PO] [decimal](28, 6) NULL,
	[Quantity_O] [decimal](28, 6) NULL,
	[Quantity_PR] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee_PO] [decimal](28, 6) NULL,
	[Price_PO] [decimal](28, 6) NULL,
	[Fee_O] [decimal](28, 6) NULL,
	[Price_O] [decimal](28, 6) NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[State_PO] [int] NULL,
	[State_O] [int] NULL,
	[State_PR] [int] NULL,
	[Additions_PO] [decimal](28, 6) NULL,
	[Additions_O] [decimal](28, 6) NULL,
	[Deductions_PO] [decimal](28, 6) NULL,
	[Deductions_O] [decimal](28, 6) NULL,
	[NetPrice_PO] [decimal](28, 6) NULL,
	[NetPrice_O] [decimal](28, 6) NULL,
	[PurchasingAgentRef_PO] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef_PR] [bigint] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingCenter_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType] [int] NULL,
	[PurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[CounterpartType] [bigint] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[CounterpartRef] [bigint] NULL,
	[Counterpart_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchasetype_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PurchaseOrder_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PurchaseOrder_Staging](
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[ReferenceRef] [bigint] NULL,
	[Number_PO] [int] NULL,
	[OrderDate] [datetime] NULL,
	[PartRef] [bigint] NULL,
	[SupplierRef_PO] [bigint] NULL,
	[Quantity_PO] [decimal](28, 6) NULL,
	[Fee_PO] [decimal](28, 6) NULL,
	[Price_PO] [decimal](28, 6) NULL,
	[Additions_PO] [decimal](28, 6) NULL,
	[Deductions_PO] [decimal](28, 6) NULL,
	[NetPrice_PO] [decimal](28, 6) NULL,
	[State_PO] [int] NULL,
	[PurchasingAgentRef_PO] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PurchaseOrder2_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PurchaseOrder2_Staging](
	[PurchaseOrderItemID] [bigint] NULL,
	[PurchaseRequestItemRef] [bigint] NULL,
	[PurchaseOrderRef] [bigint] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[Number] [nvarchar](50) NULL,
	[State] [int] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [nchar](10) NULL,
	[ReferenceRef] [bigint] NULL,
	[ItemState] [int] NULL,
	[PurchaseOrderDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PurchaseRequest_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PurchaseRequest_Staging](
	[PurchaseRequestItemId] [bigint] NOT NULL,
	[PurchaseRequestRef] [bigint] NOT NULL,
	[Number_PR] [nvarchar](50) NULL,
	[RequestDate] [datetime] NULL,
	[RequestingCenterRef] [bigint] NULL,
	[RequestingCenter_Key] [dbo].[udt_surrogate_key] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[CounterpartType] [int] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[CounterpartRef] [bigint] NULL,
	[Counterpart_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity_PR] [decimal](28, 6) NULL,
	[MajorUnitQuantity_PR] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[DemandDate] [datetime] NULL,
	[PurchasingAgentRef_PR] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType] [int] NULL,
	[PurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[State_PR] [int] NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchasetypeRef] [bigint] NULL,
	[UserPurchasetype_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType] [bigint] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[PurchaseRequest2_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[PurchaseRequest2_Staging](
	[PurchaseRequestItemID] [bigint] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[DemandDate] [datetime] NULL,
	[InquiryDeadlineDate] [datetime] NULL,
	[Number_PR] [nvarchar](50) NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseType] [int] NULL,
	[State_PR] [int] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[RequestDate] [datetime] NULL,
	[CounterpartType] [int] NULL,
	[CounterpartType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestType] [int] NULL,
	[PurchaseRequestType_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[UserPurchaseTypeRef] [bigint] NULL,
	[UserPurchaseType_Key] [dbo].[udt_surrogate_key] NULL,
	[ReferenceRef] [bigint] NULL,
	[ItemState] [int] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[Quotation_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[Quotation_Staging](
	[QuotationItemID] [bigint] NULL,
	[QuotationRef] [bigint] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PartRef] [bigint] NULL,
	[Part_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[ItemState] [int] NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationDate] [datetime] NULL,
	[FiscalYearRef] [bigint] NULL,
	[FiscalYear_Key] [dbo].[udt_surrogate_key] NULL,
	[State] [int] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PaymentMethod] [int] NULL,
	[PurchaseMethod] [int] NULL,
	[TransportType] [int] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [PRC].[StateHistory_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [PRC].[StateHistory_Staging](
	[EntityCode] [int] NULL,
	[RecordID] [bigint] NULL,
	[SourceState] [int] NULL,
	[TargetState] [int] NULL,
	[ChangeDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[DeliveryReturnReport_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[DeliveryReturnReport_Staging](
	[DeliveryReturnItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[DeliveryReturnDate] [datetime] NULL,
	[DeliveryRef] [bigint] NULL,
	[State] [int] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[SettlementType] [int] NULL,
	[ResupplyType] [int] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[DiscrepancyType] [int] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[ContractNumber] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[Fact_DeliveryReturnReport]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[Fact_DeliveryReturnReport](
	[DeliveryReturnItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[DeliveryReturnDate] [datetime] NULL,
	[DeliveryRef] [bigint] NULL,
	[State] [int] NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[SettlementType] [int] NULL,
	[ResupplyType] [int] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[DiscrepancyType] [int] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[ContractNumber] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[Fact_InquiryReport]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[Fact_InquiryReport](
	[InquiryItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[InquiryDate] [datetime] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[EntityUnitRef] [bigint] NULL,
	[State] [int] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationItemCount] [int] NULL,
	[InquiryDeadLineDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[Fact_OrderReport]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[Fact_OrderReport](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Price] [decimal](28, 6) NULL,
	[PriceInOperationalCurrency] [decimal](38, 6) NULL,
	[Tolerance] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[Fact_PurchaseOrderReport]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[Fact_PurchaseOrderReport](
	[PurchaseOrderItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[PurchaseItemRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Tolerance] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationNumber] [nvarchar](50) NULL,
	[QuotationDate] [datetime] NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseOrderDate] [datetime] NULL,
	[PriceInOperationalCurrency] [decimal](38, 6) NULL,
	[OrderDate] [datetime] NULL,
	[ContractNumber] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[Fact_PurchaseRequestReport]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[Fact_PurchaseRequestReport](
	[PurchaseRequestItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[RequestDate] [datetime] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[DemandDate] [datetime] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[PurchaseType] [int] NULL,
	[ContractNumber] [nvarchar](50) NULL,
	[CounterpartRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[Fact_UnionReport]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[Fact_UnionReport](
	[ID] [bigint] NULL,
	[EntityRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Date] [datetime] NULL,
	[SupplierRef] [bigint] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[InquiryReport_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[InquiryReport_Staging](
	[InquiryItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[InquiryDate] [datetime] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[EntityUnitRef] [bigint] NULL,
	[State] [int] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationItemCount] [int] NULL,
	[InquiryDeadLineDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[OrderReport_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[OrderReport_Staging](
	[OrderItemID] [bigint] NULL,
	[OrderRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[OrderDate] [datetime] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[Fee] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[Price] [decimal](28, 6) NULL,
	[PriceInOperationalCurrency] [decimal](38, 6) NULL,
	[Tolerance] [decimal](28, 6) NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[PurchaseOrderReport_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[PurchaseOrderReport_Staging](
	[PurchaseOrderItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[PurchaseItemRef] [bigint] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[Tolerance] [decimal](28, 6) NULL,
	[Fee] [decimal](28, 6) NULL,
	[CurrencyRef] [bigint] NULL,
	[Currency_Key] [dbo].[udt_surrogate_key] NULL,
	[OperationalCurrencyExchangeRate] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[QuotationNumber] [nvarchar](50) NULL,
	[QuotationDate] [datetime] NULL,
	[Price] [decimal](28, 6) NULL,
	[Additions] [decimal](28, 6) NULL,
	[Deductions] [decimal](28, 6) NULL,
	[NetPrice] [decimal](28, 6) NULL,
	[PurchasingDepartmentRef] [bigint] NULL,
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseOrderDate] [datetime] NULL,
	[PriceInOperationalCurrency] [decimal](38, 6) NULL,
	[OrderDate] [datetime] NULL,
	[ContractNumber] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[PurchaseRequestReport_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[PurchaseRequestReport_Staging](
	[PurchaseRequestItemID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[RequestDate] [datetime] NULL,
	[PurchaseItemRef] [bigint] NULL,
	[SupplierRef] [bigint] NULL,
	[Supplier_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[DemandDate] [datetime] NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[PurchasingAgent_Key] [dbo].[udt_surrogate_key] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[State] [int] NULL,
	[UnitRef] [bigint] NULL,
	[Unit_Key] [dbo].[udt_surrogate_key] NULL,
	[PurchaseRequestRef] [bigint] NULL,
	[PurchaseType] [int] NULL,
	[ContractNumber] [nvarchar](50) NULL,
	[CounterpartRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [RPT].[UnionReport_Staging]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [RPT].[UnionReport_Staging](
	[ID] [bigint] NULL,
	[EntityRef] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Date] [datetime] NULL,
	[SupplierRef] [bigint] NULL,
	[PurchaseItemCode] [nvarchar](128) NULL,
	[PurchasingAgentRef] [bigint] NULL,
	[Quantity] [decimal](28, 6) NULL,
	[UnitRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_AccountingOperation]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_AccountingOperation](
	[AccountingOperation_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[AccountingOperationID] [bigint] NULL,
	[Number] [bigint] NULL,
	[Name] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[AccountingOperation_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Bank]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Bank](
	[Bank_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[BankID] [bigint] NULL,
	[BankName] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[Bank_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_BankAccount]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_BankAccount](
	[BankAccount_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[BankAccountID] [bigint] NULL,
	[BankAccountNumber] [nvarchar](50) NULL,
	[BankBranchID] [bigint] NULL,
	[BankBranchCode] [nvarchar](10) NULL,
	[BankBranchName] [nvarchar](255) NULL,
	[BankID] [bigint] NULL,
	[BankCode] [nvarchar](16) NULL,
	[BankName] [nvarchar](255) NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[BankAccount_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Branch]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Branch](
	[Branch_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[BranchID] [bigint] NULL,
	[Code] [nvarchar](64) NULL,
	[Title] [nvarchar](128) NULL,
	[Title_En] [nvarchar](128) NULL,
PRIMARY KEY CLUSTERED 
(
	[Branch_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_CashFlowFactor]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_CashFlowFactor](
	[CashFlowFactor_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CashFlowFactorID] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Name] [nvarchar](128) NULL,
PRIMARY KEY CLUSTERED 
(
	[CashFlowFactor_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_CashFlowFactorGrouping]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_CashFlowFactorGrouping](
	[CashFlowFactorGrouping_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CashFlowFactorGroupingID] [bigint] NOT NULL,
	[Code] [nvarchar](64) NOT NULL,
	[Title] [nvarchar](128) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CashFlowFactorGrouping_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_CashFlowFactorGroupingDetail]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_CashFlowFactorGroupingDetail](
	[CashFlowFactorGroupingDetail_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CashFlowFactorGroupingDetailID] [bigint] NULL,
	[Code] [nvarchar](64) NULL,
	[Title] [nvarchar](128) NULL,
	[ParentRef] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Currency]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Currency](
	[Currency_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[CurrencyID] [bigint] NULL,
	[Title] [nvarchar](128) NULL,
	[Title_En] [nvarchar](128) NULL,
	[Unit] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Currency_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Date]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Date](
	[Date_Key] [int] NOT NULL,
	[FullDateAlternateKey] [nvarchar](10) NOT NULL,
	[CalendarYear] [smallint] NOT NULL,
	[MonthNumberOfYear] [tinyint] NOT NULL,
	[MonthName] [nvarchar](10) NOT NULL,
	[DayOfWeek] [smallint] NOT NULL,
	[DayOfWeekName] [nvarchar](30) NOT NULL,
	[CalendarSeason] [tinyint] NOT NULL,
	[SeasonName] [nvarchar](10) NULL,
	[PersianDateKey] [int] NOT NULL,
	[PersianFullDateAlternateKey] [nvarchar](10) NOT NULL,
	[PersianCalendarYear] [smallint] NOT NULL,
	[PersianMonthNumberOfYear] [tinyint] NOT NULL,
	[PersianMonthName] [nvarchar](10) NOT NULL,
	[PersianDayOfWeek] [smallint] NOT NULL,
	[PersianDayOfWeekName] [nvarchar](30) NOT NULL,
	[PersianCalendarSeason] [tinyint] NOT NULL,
	[PersianSeasonName] [nvarchar](10) NULL,
PRIMARY KEY CLUSTERED 
(
	[Date_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Date_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Date_2](
	[Date_Key] [int] NULL,
	[FullDateAlternateKey] [nvarchar](4000) NULL,
	[CalendarYear] [int] NULL,
	[MonthNumberOfYear] [int] NULL,
	[MonthName] [nvarchar](30) NULL,
	[DayOfWeek] [int] NULL,
	[DayOfWeekName] [nvarchar](30) NULL,
	[CalendarSeason] [int] NOT NULL,
	[SeasonName] [varchar](6) NOT NULL,
	[PersianFullDateAlternateKey] [varchar](10) NULL,
	[PersianDateKey] [int] NULL,
	[PersianCalendarYear] [int] NULL,
	[PersianMonthNumberOfYear] [int] NULL,
	[PersianMonthName] [nvarchar](8) NULL,
	[PersianDayOfWeek] [int] NOT NULL,
	[PersianDayOfWeekName] [nvarchar](8) NOT NULL,
	[PersianCalendarSeason] [int] NOT NULL,
	[PersianSeasonName] [nvarchar](7) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_DL]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_DL](
	[DL_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[DLID] [bigint] NULL,
	[Code] [nvarchar](64) NULL,
	[Title] [nvarchar](512) NULL,
PRIMARY KEY CLUSTERED 
(
	[DL_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_DraftVoucher]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_DraftVoucher](
	[DraftVoucher_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[DraftVoucherID] [bigint] NULL,
	[VoucherRef] [bigint] NULL,
	[VoucherDate] [datetime] NULL,
	[VoucherSequence] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[DraftVoucher_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_DraftVoucherItem]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_DraftVoucherItem](
	[DraftVoucherItem_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[DraftVoucherItemID] [bigint] NULL,
	[ItemType] [int] NULL,
	[ItemRef] [bigint] NULL,
	[ItemNumber] [nvarchar](64) NULL,
	[Description] [nvarchar](512) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_FiscalYear]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_FiscalYear](
	[FiscalYear_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[FiscalYearID] [bigint] NULL,
	[Title] [nvarchar](128) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Group]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Group](
	[Group_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[GroupID] [bigint] NULL,
	[GroupCode] [nvarchar](64) NULL,
	[GroupTitle] [nvarchar](128) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Invoice]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Invoice](
	[Invoice_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[InvoiceID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[InvoiceDate] [datetime] NULL,
	[IssuanceDate] [datetime] NULL,
	[CreationDate] [datetime] NULL,
	[LastModificationDate] [datetime] NULL,
	[LastModifier] [bigint] NULL,
	[State] [int] NULL,
	[Price] [numeric](28, 6) NULL,
	[Version] [binary](8) NULL,
	[Additions] [numeric](28, 6) NULL,
	[Deductions] [numeric](28, 6) NULL,
	[NetPrice] [numeric](30, 6) NULL,
	[Type] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Invoice_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Ledger]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Ledger](
	[Ledger_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[LedgerID] [bigint] NOT NULL,
	[Code] [int] NOT NULL,
	[Title] [nvarchar](128) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Ledger_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Party]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Party](
	[Party_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PartyID] [bigint] NULL,
	[FullName] [nvarchar](101) NULL,
PRIMARY KEY CLUSTERED 
(
	[Party_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_PayableNote]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_PayableNote](
	[PayableNote_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PayableNoteID] [bigint] NULL,
	[SerialNumber] [nvarchar](64) NULL,
	[State] [int] NULL,
	[NoteType] [int] NULL,
	[DueDate] [datetime] NULL,
	[AgreementDate] [datetime] NULL,
	[AccountNumber] [nvarchar](64) NULL,
	[BankBranchName] [nvarchar](64) NULL,
	[Amount] [decimal](28, 6) NOT NULL,
	[Description] [nvarchar](512) NULL,
	[DurationType] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[PayableNote_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Payment]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Payment](
	[Payment_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PaymentID] [bigint] NULL,
	[Number] [nvarchar](64) NULL,
	[Date] [datetime] NULL,
	[Descreption] [nvarchar](512) NULL,
PRIMARY KEY CLUSTERED 
(
	[Payment_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_PaymentDeposit]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_PaymentDeposit](
	[PaymentDeposit_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PaymentDepositID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Date] [datetime] NULL,
	[Description] [nvarchar](512) NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentDeposit_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_PaymentInformation]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_PaymentInformation](
	[PaymentInformaion_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PaymentInformationID] [bigint] NULL,
	[Number] [nvarchar](150) NULL,
	[PaymentInformationDate] [datetime] NULL,
	[PaymentType] [int] NULL,
	[State] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentInformaion_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_PaymentOrder]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_PaymentOrder](
	[PaymentOrder_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PaymentOrderID] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Date] [datetime] NULL,
	[State] [int] NULL,
	[ApproveDate] [datetime] NULL,
	[CreationDate] [datetime] NULL,
	[BasedOnList] [int] NULL,
	[TotalOperationalCurrencyAmount] [numeric](28, 6) NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentOrder_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_PaymentRequest]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_PaymentRequest](
	[PaymentRequest_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PaymentRequestID] [bigint] NULL,
	[Number] [nvarchar](128) NULL,
	[Date] [datetime] NULL,
	[State] [int] NULL,
	[ReferenceCode] [nvarchar](128) NULL,
	[PaymentType] [int] NULL,
	[ReferenceType] [int] NULL,
	[Description] [nvarchar](512) NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentRequest_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_PurchasingDepartment]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_PurchasingDepartment](
	[PurchasingDepartment_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[PurchasingDepartmentID] [bigint] NULL,
	[Number] [nvarchar](100) NULL,
	[Title] [nvarchar](200) NULL,
	[ManagerRef] [bigint] NULL,
	[SupervisorRef] [bigint] NULL,
	[Description] [nvarchar](1024) NULL,
	[State] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[PurchasingDepartment_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Receipt]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Receipt](
	[Receipt_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ReceiptID] [bigint] NULL,
	[Date] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Receipt_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_ReceiptDeposit]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_ReceiptDeposit](
	[ReceiptDeposit_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ReceiptDepositID] [bigint] NULL,
	[Number] [nvarchar](50) NULL,
	[Date] [datetime] NULL,
	[Description] [nvarchar](512) NULL,
PRIMARY KEY CLUSTERED 
(
	[ReceiptDeposit_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_ReceivableNote]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_ReceivableNote](
	[ReceivableNote_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ReceivableNoteID] [bigint] NULL,
	[SerialNumber] [nvarchar](64) NULL,
	[State] [int] NULL,
	[NoteType] [int] NULL,
	[DueDate] [datetime] NULL,
	[AgreementDate] [datetime] NULL,
	[AccountNumber] [nvarchar](64) NULL,
	[BankBranchName] [nvarchar](64) NULL,
PRIMARY KEY CLUSTERED 
(
	[ReceivableNote_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_ReceivableNoteTransaction]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_ReceivableNoteTransaction](
	[ReceivableNoteTransaction_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ReceivableNoteTransactionID] [bigint] NULL,
	[NormalORGuarantee] [int] NULL,
	[State] [int] NULL,
	[DocumentNumber] [nvarchar](50) NULL,
	[DocumentDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[ReceivableNoteTransaction_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_SL]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_SL](
	[SL_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[SLID] [nvarchar](30) NULL,
	[Code] [nvarchar](64) NULL,
	[Title] [nvarchar](128) NULL,
PRIMARY KEY CLUSTERED 
(
	[SL_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_Supplier]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_Supplier](
	[Supplier_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[SupplierID] [bigint] NULL,
	[Type] [int] NULL,
	[Number] [nvarchar](50) NULL,
	[IsActive] [bit] NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_User]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_User](
	[User_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[UserID] [bigint] NULL,
	[Name] [nvarchar](50) NULL,
	[Status] [int] NULL,
	[IsAdministrator] [bit] NULL,
	[IsLocked] [bit] NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[User_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_vmSearchDeposit]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_vmSearchDeposit](
	[vmSearchDeposit_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[ID] [bigint] NULL,
	[EntityType] [int] NULL,
	[EntityRef] [bigint] NULL,
	[DocumentRef] [bigint] NULL,
	[DocumentNumber] [nvarchar](64) NULL,
	[DocumentDate] [datetime] NULL,
	[ApproveState] [int] NULL,
	[Date] [datetime] NULL,
	[Number] [nvarchar](64) NULL,
PRIMARY KEY CLUSTERED 
(
	[vmSearchDeposit_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Dim_VoucherItem]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Dim_VoucherItem](
	[VoucherItem_Key] [dbo].[udt_surrogate_key] IDENTITY(1,1) NOT NULL,
	[VoucherItemID] [bigint] NULL,
	[DLLevel4] [nvarchar](64) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_BrowseAccount]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_BrowseAccount](
	[EventID] [int] IDENTITY(1,1) NOT NULL,
	[SL_Key] [bigint] NULL,
	[VoucherItem_Key] [bigint] NULL,
	[DL_Key] [bigint] NULL,
	[Debit] [numeric](38, 6) NULL,
	[Credit] [numeric](38, 6) NULL,
	[DebitBalance] [numeric](38, 6) NULL,
	[CreditBalance] [numeric](38, 6) NULL,
	[CurrencyDebit] [numeric](38, 6) NULL,
	[CurrencyCredit] [numeric](38, 6) NULL,
	[CurrencyDebitBalance] [numeric](38, 6) NULL,
	[CurrencyCreditBalance] [numeric](38, 6) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow](
	[EventID] [int] IDENTITY(1,1) NOT NULL,
	[Ledger_Key] [bigint] NULL,
	[Branch_Key] [bigint] NULL,
	[CashFlowFactorGrouping_Key] [bigint] NULL,
	[CashFlowFactorGroupingDetail_Key] [bigint] NULL,
	[Group_Key] [bigint] NULL,
	[CashFlowFactor_Key] [bigint] NULL,
	[BankAccount_Key] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[DraftVoucherItem_Key] [bigint] NULL,
	[Receipt_Key] [bigint] NULL,
	[ReceiptDeposit_Key] [bigint] NULL,
	[DraftVoucher_Key] [bigint] NULL,
	[DL_Key] [bigint] NULL,
	[Remaining] [numeric](38, 6) NULL,
	[CurrencyReceipt] [numeric](31, 6) NULL,
	[Receipt] [numeric](38, 6) NULL,
	[Payment] [numeric](38, 6) NULL,
	[ItemDate] [datetime] NULL,
	[BaseDocumentDate] [datetime] NULL,
	[VoucherDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_2](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_Moein]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_Moein](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_Payment]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_Payment](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL,
	[gardeshnaghdinegi] [nvarchar](200) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_Receipt]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_Receipt](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_Sanadhesabdari]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_Sanadhesabdari](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_TaghirModat]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_TaghirModat](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_CashFlow_Transfer]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_CashFlow_Transfer](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[Ledger] [nvarchar](300) NULL,
	[OfficeBranch] [nvarchar](300) NULL,
	[CashFlowGroupCode] [nvarchar](300) NULL,
	[Code] [nvarchar](300) NULL,
	[Title] [nvarchar](300) NULL,
	[GroupCode] [nvarchar](300) NULL,
	[GroupTitle] [nvarchar](300) NULL,
	[CashFlowFactorCode] [nvarchar](300) NULL,
	[CashFlowFactorTitle] [nvarchar](300) NULL,
	[BankName] [nvarchar](300) NULL,
	[BankBranchName] [nvarchar](300) NULL,
	[BankAccountNumber] [nvarchar](200) NULL,
	[Remaining] [decimal](31, 6) NULL,
	[CurrencyReceipt] [decimal](31, 6) NULL,
	[Receipt] [decimal](31, 6) NULL,
	[Payment] [decimal](31, 6) NULL,
	[ItemType2] [int] NULL,
	[ItemDate] [datetime] NULL,
	[ItemDescription] [nvarchar](3000) NULL,
	[BaseDocumentID] [bigint] NULL,
	[CurrencyTitle] [nvarchar](200) NULL,
	[BaseDocumentDate] [datetime] NULL,
	[ItemNumber] [nvarchar](200) NULL,
	[VoucherSequence] [int] NULL,
	[VoucherDate] [datetime] NULL,
	[DLCode] [nvarchar](200) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[InsertedDate] [datetime] NULL,
	[DocumentDate] [datetime] NULL,
	[BankName_Dest] [nvarchar](300) NULL,
	[BankBranchName_Dest] [nvarchar](300) NULL,
	[BankAccountNumber_Dest] [nvarchar](200) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_DraftVoucher]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_DraftVoucher](
	[DraftVoucher_Key] [bigint] IDENTITY(1,1) NOT NULL,
	[DraftVoucherID] [int] NOT NULL,
	[VoucherRef] [int] NULL,
	[Date] [datetime] NULL,
	[DocumentRef] [int] NOT NULL,
	[DocumentNumber] [nvarchar](255) NULL,
	[DraftVoucherNumber] [int] NOT NULL,
	[ItemNumber] [nvarchar](255) NULL,
	[Debit] [decimal](28, 6) NULL,
	[Credit] [decimal](28, 6) NULL,
	[Description] [nvarchar](max) NULL,
	[SLTitle] [nvarchar](255) NULL,
	[GLTitle] [nvarchar](255) NULL,
	[AccountGroupTitle] [nvarchar](255) NULL,
	[DLLevel4Title] [nvarchar](255) NULL,
	[DLLevel5Title] [nvarchar](255) NULL,
 CONSTRAINT [PK_DraftVoucherReport] PRIMARY KEY CLUSTERED 
(
	[DraftVoucher_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_PaymentDocumentDetail]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_PaymentDocumentDetail](
	[PaymentDocumentsDetail_key] [int] IDENTITY(1,1) NOT NULL,
	[ID] [int] NULL,
	[CurrencyRef] [int] NULL,
	[NoteType] [int] NULL,
	[NormalOrGuarantee] [int] NULL,
	[DurationType] [nvarchar](50) NULL,
	[SerialNumber] [nvarchar](50) NULL,
	[SayadNumber] [nvarchar](50) NULL,
	[DueDate] [datetime] NULL,
	[AgreementDate] [datetime] NULL,
	[CounterPartName] [nvarchar](255) NULL,
	[Amount] [decimal](18, 2) NULL,
	[OperationalCurrencyAmount] [decimal](18, 2) NULL,
	[BankAccountNumber] [nvarchar](50) NULL,
	[BankName] [nvarchar](100) NULL,
	[BankBranchName] [nvarchar](100) NULL,
	[LastApprovedStateInReportDate] [int] NULL,
	[LastState] [int] NULL,
	[DocumentNumber] [nvarchar](50) NULL,
	[DocumentDate] [datetime] NULL,
	[PaymentDescription] [nvarchar](500) NULL,
	[PaymentDescriptionEn] [nvarchar](500) NULL,
	[RelatedDocumentID] [int] NULL,
	[PaymentDate] [datetime] NULL,
	[PaymentNumber] [nvarchar](50) NULL,
	[AccountingOperationCode] [nvarchar](50) NULL,
	[AccountingOperationName] [nvarchar](200) NULL,
	[SLCode] [nvarchar](50) NULL,
	[SLTitle] [nvarchar](200) NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentDocumentsDetail_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_PaymentDocumentDetail_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_PaymentDocumentDetail_2](
	[PaymentDocumentsDetail_key] [int] IDENTITY(1,1) NOT NULL,
	[ID] [int] NULL,
	[CurrencyRef] [int] NULL,
	[NoteType] [int] NULL,
	[NormalOrGuarantee] [int] NULL,
	[DurationType] [nvarchar](50) NULL,
	[SerialNumber] [nvarchar](50) NULL,
	[SayadNumber] [nvarchar](50) NULL,
	[DueDate] [datetime] NULL,
	[AgreementDate] [datetime] NULL,
	[CounterPartName] [nvarchar](255) NULL,
	[Amount] [decimal](18, 2) NULL,
	[OperationalCurrencyAmount] [decimal](18, 2) NULL,
	[BankAccountNumber] [nvarchar](50) NULL,
	[BankName] [nvarchar](100) NULL,
	[BankBranchName] [nvarchar](100) NULL,
	[LastApprovedStateInReportDate] [int] NULL,
	[LastState] [int] NULL,
	[DocumentNumber] [nvarchar](50) NULL,
	[DocumentDate] [datetime] NULL,
	[PaymentDescription] [nvarchar](500) NULL,
	[PaymentDescriptionEn] [nvarchar](500) NULL,
	[RelatedDocumentID] [int] NULL,
	[PaymentDate] [datetime] NULL,
	[PaymentNumber] [nvarchar](50) NULL,
	[AccountingOperationCode] [nvarchar](50) NULL,
	[AccountingOperationName] [nvarchar](200) NULL,
	[SLCode] [nvarchar](50) NULL,
	[SLTitle] [nvarchar](200) NULL,
PRIMARY KEY CLUSTERED 
(
	[PaymentDocumentsDetail_key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_PaymentNotice]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_PaymentNotice](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[Payment_Key] [bigint] NULL,
	[DL_Key] [bigint] NULL,
	[PaymentDeposit_Key] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[PaymentDate] [datetime] NULL,
	[PaymentDepositDate] [datetime] NULL,
	[Amount] [numeric](28, 6) NULL,
	[CurrencyAmount] [numeric](28, 6) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_PaymentOrder]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_PaymentOrder](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[PaymentOrder_Key] [bigint] NULL,
	[PaymentRequest_Key] [bigint] NULL,
	[Branch_Key] [bigint] NULL,
	[DL_Key] [bigint] NULL,
	[Party_Key_LastModifier] [bigint] NULL,
	[Party_Key_Createor] [bigint] NULL,
	[Party_Key_Approver] [bigint] NULL,
	[Date] [datetime] NULL,
	[ApproveDate] [datetime] NULL,
	[CreationDate] [datetime] NULL,
	[TotalOperationalCurrencyAmount] [numeric](28, 6) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_PaymentRequest]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_PaymentRequest](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[PaymentRequest_Key] [bigint] NULL,
	[Branch_Key] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[Party_Key_lastModifier] [bigint] NULL,
	[Party_Key_CreatorName] [bigint] NULL,
	[Party_Key_ApproverName] [bigint] NULL,
	[DL_Key] [bigint] NULL,
	[Date] [datetime] NULL,
	[PaymentRequestSum] [numeric](31, 6) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_PurchaseInvoice]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_PurchaseInvoice](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[Invoice_Key] [bigint] NULL,
	[Supplier_Key] [bigint] NULL,
	[FiscalYear_Key] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[User_Key] [bigint] NULL,
	[Branch_Key] [bigint] NULL,
	[Party_Key_Creator] [bigint] NULL,
	[PurchasingDepartment_Key] [bigint] NULL,
	[InvoiceDate] [datetime] NULL,
	[IssuanceDate] [datetime] NULL,
	[CreationDate] [datetime] NULL,
	[LastModificationDate] [datetime] NULL,
	[Price] [numeric](28, 6) NULL,
	[Additions] [numeric](28, 6) NULL,
	[Deductions] [numeric](28, 6) NULL,
	[NetPrice] [numeric](30, 6) NULL,
	[VoucherRef] [bigint] NULL,
	[RefundableAdditions] [numeric](28, 6) NULL,
	[DraftVoucherRef] [bigint] NULL,
	[HasVoucher] [int] NULL,
	[HasDraftVoucher] [int] NULL,
	[TotalNetPrice] [numeric](30, 6) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_ReceivedDocumentDetail]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_ReceivedDocumentDetail](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[ReceivableNote_Key] [bigint] NULL,
	[DL_Key] [bigint] NULL,
	[Bank_Key] [bigint] NULL,
	[ReceivableNoteTransaction_Key] [bigint] NULL,
	[Receipt_Key] [bigint] NULL,
	[AccountingOperation_Key] [bigint] NULL,
	[SL_Key] [bigint] NULL,
	[DueDate] [datetime] NULL,
	[AgreementDate] [datetime] NULL,
	[Amount] [numeric](28, 6) NULL,
	[OperationalCurrencyAmount] [numeric](28, 6) NULL,
	[DocumentDate] [datetime] NULL,
	[ReceiptDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_ReceivedDocumentDetail_2]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_ReceivedDocumentDetail_2](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[ID] [bigint] NULL,
	[NoteType] [int] NULL,
	[NormalOrGuarantee] [int] NULL,
	[SerialNumber] [nvarchar](100) NULL,
	[DueDate] [datetime] NULL,
	[AgreementDate] [datetime] NULL,
	[DLCode] [nvarchar](50) NULL,
	[DLTitle] [nvarchar](200) NULL,
	[Amount] [decimal](28, 6) NULL,
	[OperationalCurrencyAmount] [decimal](28, 6) NULL,
	[AccountNumber] [nvarchar](80) NULL,
	[BankBranchName] [nvarchar](100) NULL,
	[BankName] [nvarchar](60) NULL,
	[LastApprovedStateInReportDate] [int] NULL,
	[LastState] [int] NULL,
	[DocumentNumber] [nvarchar](50) NULL,
	[DocumentDate] [datetime] NULL,
	[ReceiptDate] [datetime] NULL,
	[AccountingOperationCode] [bigint] NULL,
	[AccountingOperationName] [nvarchar](500) NULL,
	[SLCode] [nvarchar](50) NULL,
	[SLTitle] [nvarchar](500) NULL,
	[InsertedDate] [datetime] NULL,
	[ReceivableNote_Key] [bigint] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_ReceivedPaymentInformation]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_ReceivedPaymentInformation](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[PaymentInformaion_Key] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[Branch_Key] [bigint] NULL,
	[Party_Key] [bigint] NULL,
	[PaymentInformationDate] [datetime] NULL,
	[ReceivedTotalAmount] [numeric](31, 6) NULL,
	[PaymentTotalAmount] [numeric](31, 6) NULL,
	[InvoiceID] [bigint] NULL,
	[InvoiceNumber] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_SearchItem]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_SearchItem](
	[EventId] [int] IDENTITY(1,1) NOT NULL,
	[vmSearchDeposit_Key] [bigint] NULL,
	[Currency_Key] [bigint] NULL,
	[BankAccount_Key] [bigint] NULL,
	[Branch_Key] [bigint] NULL,
	[DocumentNumber] [nvarchar](64) NULL,
	[DocumentDate] [datetime] NULL,
	[ItemDate] [datetime] NULL,
	[ItemNumber] [nvarchar](64) NULL,
	[ItemAmount] [numeric](29, 6) NULL,
	[ItemOperationalCurrencyAmount] [numeric](38, 6) NULL,
	[DLTitle] [nvarchar](512) NULL,
PRIMARY KEY CLUSTERED 
(
	[EventId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[Fact_Voucher]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[Fact_Voucher](
	[Voucher_Key] [bigint] IDENTITY(1,1) NOT NULL,
	[VoucherID] [bigint] NOT NULL,
	[Number] [int] NOT NULL,
	[Date] [datetime] NOT NULL,
	[State] [int] NOT NULL,
	[VoucherItemID] [bigint] NOT NULL,
	[Debit] [decimal](28, 6) NULL,
	[Credit] [decimal](28, 6) NULL,
	[Description] [nvarchar](max) NULL,
	[SLTitle] [nvarchar](255) NULL,
	[GLTitle] [nvarchar](255) NULL,
	[AccountGroupTitle] [nvarchar](255) NULL,
	[DLLevel4Title] [nvarchar](255) NULL,
	[DLLevel5Title] [nvarchar](255) NULL,
	[DLLevel6Title] [nvarchar](255) NULL,
 CONSTRAINT [PK_VoucherReport] PRIMARY KEY CLUSTERED 
(
	[Voucher_Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [TRE].[LookupLastState]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[LookupLastState](
	[LookupID] [bigint] NOT NULL,
	[Code] [int] NOT NULL,
	[Value] [nvarchar](100) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [TRE].[LookupOperationType]    Script Date: 9/28/2026 11:42:39 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [TRE].[LookupOperationType](
	[LookupID] [bigint] NOT NULL,
	[Code] [int] NOT NULL,
	[Value] [nvarchar](100) NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fact_EntityRelation_SourceRef]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [IX_Fact_EntityRelation_SourceRef] ON [dbo].[Fact_EntityRelation]
(
	[SourceRef] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fact_EntityRelation_SourceType]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [IX_Fact_EntityRelation_SourceType] ON [dbo].[Fact_EntityRelation]
(
	[SourceType] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fact_EntityRelation_SourceType_SourceRef]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [IX_Fact_EntityRelation_SourceType_SourceRef] ON [dbo].[Fact_EntityRelation]
(
	[SourceRef] ASC,
	[SourceType] ASC
)
INCLUDE([TargetRef],[TargetType]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fact_EntityRelation_TargetRef]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [IX_Fact_EntityRelation_TargetRef] ON [dbo].[Fact_EntityRelation]
(
	[TargetRef] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fact_EntityRelation_TargetType]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [IX_Fact_EntityRelation_TargetType] ON [dbo].[Fact_EntityRelation]
(
	[TargetType] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Fact_EntityRelation_TargetType_TargetRef]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [IX_Fact_EntityRelation_TargetType_TargetRef] ON [dbo].[Fact_EntityRelation]
(
	[TargetRef] ASC,
	[TargetType] ASC
)
INCLUDE([SourceRef],[SourceType]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [Fact_StateHistory_ChangeDate]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [Fact_StateHistory_ChangeDate] ON [dbo].[Fact_StateHistory]
(
	[ChangeDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [Fact_StateHistory_EntityCode]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [Fact_StateHistory_EntityCode] ON [dbo].[Fact_StateHistory]
(
	[EntityCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [Fact_StateHistory_EntityCode_RecordID]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [Fact_StateHistory_EntityCode_RecordID] ON [dbo].[Fact_StateHistory]
(
	[EntityCode] ASC,
	[RecordID] ASC
)
INCLUDE([SourceState],[TargetState],[ChangeDate]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [Fact_StateHistory_RecordID]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [Fact_StateHistory_RecordID] ON [dbo].[Fact_StateHistory]
(
	[RecordID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [Fact_StateHistory_SourceState]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [Fact_StateHistory_SourceState] ON [dbo].[Fact_StateHistory]
(
	[SourceState] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [Fact_StateHistory_TargetState]    Script Date: 9/28/2026 11:42:39 AM ******/
CREATE NONCLUSTERED INDEX [Fact_StateHistory_TargetState] ON [dbo].[Fact_StateHistory]
(
	[TargetState] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [BOM].[BOMDetails] ADD  CONSTRAINT [DF_BOMDetails_InsertDate]  DEFAULT (getdate()) FOR [InsertDate]
GO
ALTER TABLE [BOM].[BOMDetails] ADD  CONSTRAINT [DF_BOMDetails_Current]  DEFAULT ((1)) FOR [Current]
GO
ALTER TABLE [BOM].[BOMDetails_HalfMade] ADD  CONSTRAINT [DF_BOMDetails_HalfMade_InsertDate]  DEFAULT (getdate()) FOR [InsertDate]
GO
ALTER TABLE [BOM].[BOMDetails_HalfMade] ADD  CONSTRAINT [DF_BOMDetails_HalfMade_Current]  DEFAULT ((1)) FOR [Current]
GO
ALTER TABLE [BOM].[Priority] ADD  CONSTRAINT [DF_Priority_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [BOM].[Priority] ADD  CONSTRAINT [DF_Priority_Current]  DEFAULT ((1)) FOR [Current]
GO
ALTER TABLE [BOM].[Priority_2] ADD  CONSTRAINT [DF_Priority_2_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [BOM].[StockParts] ADD  DEFAULT (getdate()) FOR [InsertDate]
GO
ALTER TABLE [dbo].[aaaaaaaa_pr] ADD  CONSTRAINT [DF_aaaaaaaa_pr_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [NTSW].[Dim_DocumentType] ADD  CONSTRAINT [DF_Dim_DocumentType_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [NTSW].[Dim_FloorPart] ADD  CONSTRAINT [DF_Dim_FloorPart_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [NTSW].[Dim_GroupPart] ADD  CONSTRAINT [DF_Dim_GroupPart_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [NTSW].[Dim_Status] ADD  CONSTRAINT [DF_Dim_Status_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [NTSW].[Fact_Documents] ADD  CONSTRAINT [DF_Fact_Documents_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [NTSW].[Fact_ntsw] ADD  CONSTRAINT [DF__Fact_ntsw__Inser__2EB0D91F]  DEFAULT (getdate()) FOR [InsertDate]
GO
ALTER TABLE [PRC].[Fact_CashFlowFactorGrouping] ADD  CONSTRAINT [DF_Fact_CashFlowFactorGrouping_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_2] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_Moein] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_Payment] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_Receipt] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_Sanadhesabdari] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_TaghirModat] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_CashFlow_Transfer] ADD  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [TRE].[Fact_ReceivedDocumentDetail_2] ADD  CONSTRAINT [DF_Fact_ReceivedDocumentDetail_2_InsertedDate]  DEFAULT (getdate()) FOR [InsertedDate]
GO
ALTER TABLE [dbo].[Fact_Sales]  WITH CHECK ADD  CONSTRAINT [FK_Fact_Sales_Dim_Currency] FOREIGN KEY([Currency_Key])
REFERENCES [dbo].[Dim_Currency] ([Currency_Key])
GO
ALTER TABLE [dbo].[Fact_Sales] CHECK CONSTRAINT [FK_Fact_Sales_Dim_Currency]
GO
ALTER TABLE [dbo].[Fact_Sales]  WITH CHECK ADD  CONSTRAINT [FK_Fact_Sales_Dim_State] FOREIGN KEY([OrderItemState_Key])
REFERENCES [dbo].[Dim_State] ([State_Key])
GO
ALTER TABLE [dbo].[Fact_Sales] CHECK CONSTRAINT [FK_Fact_Sales_Dim_State]
GO
ALTER TABLE [dbo].[Fact_Vosouli]  WITH CHECK ADD  CONSTRAINT [FK_Fact_Vosouli_Dim_Account] FOREIGN KEY([Account_Key])
REFERENCES [dbo].[Dim_Account] ([Account_Key])
GO
ALTER TABLE [dbo].[Fact_Vosouli] CHECK CONSTRAINT [FK_Fact_Vosouli_Dim_Account]
GO
ALTER TABLE [dbo].[Fact_Vosouli]  WITH CHECK ADD  CONSTRAINT [FK_Fact_Vosouli_Dim_SalesOffice] FOREIGN KEY([SalesOffice_Key])
REFERENCES [dbo].[Dim_SalesOffice] ([SalesOffice_key])
GO
ALTER TABLE [dbo].[Fact_Vosouli] CHECK CONSTRAINT [FK_Fact_Vosouli_Dim_SalesOffice]
GO
ALTER TABLE [dbo].[Voucher_Data_Staging]  WITH CHECK ADD  CONSTRAINT [FK_Voucher_Data_Staging_Dim_Store] FOREIGN KEY([Store_Key])
REFERENCES [dbo].[Dim_Store] ([Store_key])
GO
ALTER TABLE [dbo].[Voucher_Data_Staging] CHECK CONSTRAINT [FK_Voucher_Data_Staging_Dim_Store]
GO
