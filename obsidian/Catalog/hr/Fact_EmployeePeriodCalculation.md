---
type: table
domain: hr
source: "[HR].[Fact_EmployeePeriodCalculation]"
synonyms:
  - "کارکرد"
  - "حضور و غیاب"
  - "اضافه کار"
  - "مرخصی"
  - "غیبت"
tags: [catalog, domain/hr]
---
> کارکرد ماهانه هر کارمند: حضور، غیبت، مرخصی، اضافه‌کار

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `Employee_Key` | udt_surrogate_key | کلید اتصال به کارمندان با مشخصات سازمانی | yes |
| `Period_Key` | udt_surrogate_key | کلید اتصال به دوره‌های زمانی | yes |
| `WorkingYear_Key` | udt_surrogate_key | کلید اتصال به سال‌های کاری | yes |
| `AbsenceCount` | int | تعداد غیبت | yes |
| `DelayCount` | int | تعداد تأخیر | yes |
| `HurryCount` | int | تعداد تعجیل | yes |
| `TotalAlowedWorkDeficit` | int | کسری کار مجاز (دقیقه) | yes |
| `TotalShifts` | int | تعداد شیفت | yes |
| `FunctionalityCountInDay` | int | روزهای کارکرد | yes |
| `PresenceCountInDay` | int | روزهای حضور | yes |
| `DeficitAccruedHolidayInMinutes` | int | کسری تعطیلی ذخیره (دقیقه) | yes |
| `DeficitAccruedHolidayInDay` | int | کسری تعطیلی ذخیره (روز) | yes |
| `AccruedHolidayInMinutes` | int | تعطیلی ذخیره‌شده (دقیقه) | yes |
| `AccruedHolidayInDay` | int | تعطیلی ذخیره‌شده (روز) | yes |
| `PrecenseAmount` | int | حضور (دقیقه) | yes |
| `AbsenceWorkDeficitAmount` | int | کسری کار ناشی از غیبت (دقیقه) | yes |
| `DelayWorkDeficitAmount` | int | کسری کار ناشی از تأخیر (دقیقه) | yes |
| `HurryWorkDeficitAmount` | int | کسری کار ناشی از تعجیل (دقیقه) | yes |
| `TotalWorkDeficitAmount` | int | جمع کسری کار (دقیقه) | yes |
| `TotalFunctionalityAmount` | int | جمع کارکرد (دقیقه) | yes |
| `Vacation_Key` | udt_surrogate_key | کلید اتصال به انواع مرخصی | yes |
| `TotalvacationAmount` | int | جمع مرخصی (دقیقه) | yes |
| `TotalvacationCount` | int | تعداد مرخصی | yes |
| `Mission_Key` | udt_surrogate_key | کلید اتصال به انواع مأموریت | yes |
| `TotalMissionAmount` | int | جمع مأموریت (دقیقه) | yes |
| `TotalMissionInHoliday` | int | مأموریت در تعطیلی | yes |
| `TotalNormalExtraWorkAmount` | int | اضافه‌کار عادی (دقیقه) | yes |
| `TotalExtraWorkAmount` | int | جمع اضافه‌کار (دقیقه) | yes |
| `ConsideredWork` | int | کار محاسبه‌شده | yes |
| `TotalFunctionalityCountInDay` | int | جمع روزهای کارکرد | yes |
| `TotalAccuredHoliday` | int | جمع تعطیلی ذخیره | yes |
| `TotalPeriodDayCount` | int | تعداد روز دوره | yes |
| `FunctionalityAmount` | int | کارکرد (دقیقه) | yes |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

- `Employee_Key` → [[Fact_Employee]] `Employee_Key` (inferred)
- `Period_Key` → [[HR_Dim_TimePeriod]] `Period_Key` (inferred)
- `WorkingYear_Key` → [[HR_Dim_WorkingYear]] `WorkingYear_Key` (inferred)
- `Vacation_Key` → [[Dim_Vacation]] `Vacation_Key` (inferred)
- `Mission_Key` → [[Dim_Mission]] `Mission_Key` (inferred)
