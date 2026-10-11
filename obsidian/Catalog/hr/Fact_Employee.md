---
type: table
domain: hr
source: "[HR].[Fact_Employee]"
core: true
synonyms:
  - "کارمند"
  - "پرسنل"
  - "کارکنان"
  - "نیرو"
tags: [catalog, domain/hr, core]
---
> کارمندان با مشخصات سازمانی

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Employee_Key` | udt_surrogate_key | کلید کارمندان با مشخصات سازمانی | yes |
| `NationalCode` | nvarchar | کد ملی | yes |
| `FirstName` | nvarchar | نام | yes |
| `LastName` | nvarchar | نام خانوادگی | yes |
| `Gender_Key` | udt_surrogate_key | کلید اتصال به جنسیت | yes |
| `MaritalStatus_Key` | udt_surrogate_key | کلید اتصال به وضعیت تاهل | yes |
| `BirthDate` | datetime | تاریخ تولد | yes |
| `PersonelyCode` | nvarchar | کد پرسنلی | yes |
| `StartDate` | datetime | تاریخ شروع | yes |
| `EndDate` | datetime | تاریخ پایان | yes |
| `ServiceArea_Key` | udt_surrogate_key | کلید اتصال به محل‌های خدمت | yes |
| `ContractType_Key` | udt_surrogate_key | کلید اتصال به انواع قرارداد | yes |
| `Company_Key` | udt_surrogate_key | کلید اتصال به شرکت‌ها | yes |
| `Department_Key` | udt_surrogate_key | کلید اتصال به واحدهای سازمانی | yes |
| `SubDepartment_Key` | udt_surrogate_key | کلید اتصال به زیرواحدها | yes |
| `Job_Key` | udt_surrogate_key | کلید اتصال به شغل‌ها | yes |
| `JobPost_Key` | udt_surrogate_key | کلید اتصال به پست‌های سازمانی | yes |
| `Education_Key` | udt_surrogate_key | کلید اتصال به مدارک تحصیلی | yes |
| `PersonStatus_Key` | udt_surrogate_key | کلید اتصال به وضعیت پرسنلی | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Gender_Key` → [[Dim_Gender]] `Gender_Key` (inferred)
- `MaritalStatus_Key` → [[Dim_MaritalStatus]] `Marital_Key` (inferred)
- `ServiceArea_Key` → [[Dim_ServiceArea]] `ServiceArea_Key` (inferred)
- `ContractType_Key` → [[Dim_ContractType]] `Contract_Key` (inferred)
- `Company_Key` → [[Dim_Company]] `Company_Key` (inferred)
- `Department_Key` → [[Dim_Department]] `Department_Key` (inferred)
- `SubDepartment_Key` → [[Dim_SubDepartment]] `SubDepartment_Key` (inferred)
- `Job_Key` → [[Dim_Job]] `Job_Key` (inferred)
- `JobPost_Key` → [[Dim_JobPost]] `JobPost_Key` (inferred)
- `Education_Key` → [[Dim_Education]] `Education_Key` (inferred)
- `PersonStatus_Key` → [[Dim_PersonStatus]] `PersonStatus_Key` (inferred)
