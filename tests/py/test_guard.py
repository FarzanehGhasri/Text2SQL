"""text2sql.guard must behave exactly like n8n_workflows/code/Security.js.

guard_cases.json is recorded from the real JavaScript node by fixtures/make_guard_fixtures.js
(regenerate with: node tests/py/fixtures/make_guard_fixtures.js).
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from text2sql.guard import EntityDef, GuardPolicy, GuardRejection, SqlGuard, build_entity_ctes

FIXTURES = json.loads((Path(__file__).parent / "fixtures" / "guard_cases.json").read_text(encoding="utf-8"))
SETS = {name: {k: EntityDef.from_dict(v) for k, v in defs.items()} for name, defs in FIXTURES["entitySets"].items()}
CASES = FIXTURES["cases"]


def run(response, defs):
    logs: list[str] = []
    try:
        out = SqlGuard(log=logs.append).secure(response, defs)
    except GuardRejection as e:
        return {"error": e.message}
    return {"json": {"sql": out.sql, "modelSql": out.model_sql, "entities": out.entities,
                     "understood": out.understood, "plan": out.plan, "thinking": out.thinking},
            "logs": logs}


def test_fixture_set_is_large():
    assert len(CASES) >= 300


@pytest.mark.parametrize("case", CASES, ids=[f"{c['id']}-{c['group']}" for c in CASES])
def test_same_as_javascript(case):
    expected = case["expect"]
    if "json" in expected:
        expected = {"json": {k: v for k, v in expected["json"].items() if k != "attempt"}, "logs": expected["logs"]}
    assert run(case["response"], SETS[case["defs"]]) == expected


# ---------------------------------------------------------------- readable checks of the key rules
SALES = SETS["SALES"]


def secure(text, defs=SALES):
    return SqlGuard().secure({"response": text}, defs)


def rejected(text, defs=SALES) -> str:
    with pytest.raises(GuardRejection) as e:
        secure(text, defs)
    assert e.value.message.startswith("⛔")
    return e.value.message


def test_only_allowed_columns_are_exposed_through_entity_ctes():
    out = secure("SELECT * FROM [Fact_Sales]")
    assert out.model_sql == "SELECT TOP 200 * FROM [Fact_Sales]"
    assert out.sql.startswith("WITH [Fact_Sales] AS (SELECT [OrderRef], ")
    assert "FROM [dbo].[Fact_Sales])\nSELECT TOP 200" in out.sql
    assert out.entities == ["fact_sales"]


def test_write_statements_and_tricks_are_blocked():
    assert "فقط SELECT" in rejected("DELETE FROM [Fact_Sales]")
    assert "دستور غیرمجاز" in rejected("SELECT * INTO t FROM [Fact_Sales]")
    assert "دستور غیرمجاز" in rejected("SELECT * FROM [Fact_Sales] WHERE فروشinsert = 1")   # Persian is not \w
    assert "کاراکتر غیرمجاز" in rejected("SELECT * FROM [Fact_Sales] WHERE 1 = 1; SELECT 1")
    assert "کاراکتر غیرمجاز" in rejected("SELECT * FROM [Fact_Sales] -- x")


def test_comma_join_cannot_hide_a_table():
    assert "JOIN صریح" in rejected("SELECT * FROM [Fact_Sales], [Secret]")
    assert "JOIN صریح" in rejected("SELECT * FROM [Fact_Sales] WHERE a IN (SELECT 1 FROM [Fact_Sales] x, [Secret] y)")


def test_unknown_tables_and_shadowing_ctes_are_rejected():
    assert "خارج از حیطه" in rejected("SELECT * FROM [dbo].[Secret]")
    assert "CTE" in rejected("WITH [Fact_Sales] AS (SELECT 1 a) SELECT * FROM [Fact_Sales]")
    # a model CTE never unlocks a qualified physical table
    assert "خارج از حیطه" in rejected("WITH x AS (SELECT 1 a) SELECT * FROM [dbo].[x]")


def test_qualified_names_read_the_entity_cte():
    out = secure("SELECT [dbo].[Fact_Sales].[OrderRef] FROM [SA].[dbo].[Fact_Sales] JOIN dbo.Fact_Sales f ON 1 = 1")
    assert out.model_sql == "SELECT TOP 200 [dbo].[Fact_Sales].[OrderRef] FROM [Fact_Sales] JOIN [Fact_Sales] f ON 1 = 1"


def test_not_supported_reports_the_model_reason():
    msg = rejected("UNDERSTOOD: u\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, 'no weather data' AS Reason")
    assert msg.endswith("قابل پاسخ نیست.\n\nno weather data")


def test_row_cap_and_limit():
    assert secure("SELECT [OrderRef] FROM [Fact_Sales] LIMIT 5").model_sql == "SELECT TOP 5 [OrderRef] FROM [Fact_Sales]"
    guard = SqlGuard(GuardPolicy(row_cap=50))
    assert guard.secure("SELECT 1 FROM [Fact_Sales]", SALES).model_sql == "SELECT TOP 50 1 FROM [Fact_Sales]"


def test_policy_is_data():
    strict = SqlGuard(GuardPolicy(blocked=GuardPolicy().blocked + (r"\bnewid\b",)))
    with pytest.raises(GuardRejection):
        strict.secure("SELECT NEWID() FROM [Fact_Sales]", SALES)


def test_unknown_entity_kind_is_rejected_even_when_it_names_an_object_method():
    # JS looks kinds up on a plain object, so 'constructor' would find Object.prototype.constructor and emit
    # a broken CTE; the port rejects every kind that has no builder (deliberate, safer difference).
    for kind in ("view", "constructor", "toString", "__proto__"):
        defs = {"T": EntityDef(name="T", kind=kind, source="[dbo].[T]")}
        with pytest.raises(GuardRejection, match="پشتیبانی نمی‌شود"):
            build_entity_ctes(defs, ["t"])


def test_entity_order_follows_javascript_object_key_order():
    # Object.keys puts array-index keys first, whatever the insertion order
    defs = {"B": EntityDef(name="B", source="[dbo].[B]"), "7": EntityDef(name="7", source="[dbo].[S]")}
    out = SqlGuard().secure("SELECT * FROM [B] JOIN [7] ON 1 = 1", defs)
    assert out.sql.startswith("WITH [7] AS")


# Found while porting: each of these read a table outside the prompt and was accepted (fixed in both languages).
BYPASSES = [
    "SELECT * FROM [Fact_Sales] somewhere, Dim_Secret",          # alias ending in WHERE hid the comma join
    "SELECT * FROM [Fact_Sales] t_for, Secret",
    "SELECT * FROM [Fact_Sales] f INNER JOIN[dbo].[Secret] x ON 1=1",
    'SELECT * FROM [Fact_Sales] WHERE 1 IN (SELECT 1 FROM"Secret")',
    "SELECT * FROM ([dbo].[Secret] s CROSS JOIN [Fact_Sales] f)",
    "SELECT * FROM [Fact_Sales] f WHERE 1 IN (SELECT 1 FROM (([Secret])))",
    "SELECT * FROM #tmp",
    "SELECT * FROM [Fact_Sales] f JOIN @t x ON 1=1",
]
STILL_FINE = [
    "SELECT * FROM [Fact_Sales] f CROSS JOIN (SELECT * FROM [Fact_Sales]) z",
    "SELECT * FROM ((SELECT [Amount] FROM [Fact_Sales])) z",
    "SELECT [From], SUM([Amount]) FROM [Fact_Sales] f WHERE [Amount] > 0 GROUP BY [From]",
    "SELECT * FROM [Fact_Sales] f WHERE [From] = N'a, b from #x'",
    "SELECT * FROM[Fact_Sales] WHERE [Amount] > 1",
]
_DEFS = {"Fact_Sales": EntityDef("Fact_Sales", "table", "[dbo].[Fact_Sales]", None, (("Amount", None), ("From", None)))}


@pytest.mark.parametrize("sql", BYPASSES)
def test_bypasses_are_rejected(sql):
    with pytest.raises(GuardRejection):
        SqlGuard().secure("SQL:\n" + sql, _DEFS)


@pytest.mark.parametrize("sql", STILL_FINE)
def test_legitimate_queries_still_pass(sql):
    assert SqlGuard().secure("SQL:\n" + sql, _DEFS).sql
