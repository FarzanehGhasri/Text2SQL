---
type: table
domain: procurement
source: "[PRC].[Fact_CashFlowFactorGrouping]"
synonyms:
  - "گروه جریان نقدی"
tags: [catalog, domain/procurement]
---
> گروه‌بندی عوامل جریان نقدی (درختی)

## Columns
Show: `yes` = the model may use it · `hidden` = never sent to the model · `review` = sent, but a domain expert should check it.

| Column | Type | Description | Show |
|---|---|---|---|
| `RecId` | int | شناسه رکورد | hidden |
| `CashFlowFactorGroupingID` | int | شناسه نقد جریان فاکتور گروه‌بندی | yes |
| `CashFlowFactorGroupingCode` | int | کد نقد جریان فاکتور گروه‌بندی | yes |
| `CashFlowFactorGroupingTitle` | nvarchar | عنوان نقد جریان فاکتور گروه‌بندی | yes |
| `CashFlowFactorGroupingDetailID` | int | شناسه نقد جریان فاکتور گروه‌بندی جزئیات | yes |
| `CashFlowFactorGroupingDetailCode` | nvarchar | کد نقد جریان فاکتور گروه‌بندی جزئیات | yes |
| `CashFlowFactorGroupingDetailTitle` | nvarchar | عنوان نقد جریان فاکتور گروه‌بندی جزئیات | yes |
| `ParentRef` | int |  | hidden |
| `Left` | int |  | hidden |
| `Right` | int |  | hidden |
| `InsertedDate` | datetime | تاریخ درج در ورهاوس | hidden |

## Links to other tables
One line per foreign key: `this column` → a link to the other table → `its key column`.

_none yet_
