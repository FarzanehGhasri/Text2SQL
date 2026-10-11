"""text2sql.answer gives exactly the text the n8n nodes "Format Answer" and "ErrorFormat" give.

The expected text comes from the real JavaScript nodes: fixtures/answer_cases.json.gz, written by
`node tests/py/fixtures/make_answer_fixtures.js`.
"""
from __future__ import annotations

import gzip
import json
import math
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import pytest

from text2sql.answer import (ChartSettings, _js_round, chart_type, format_answer, format_error, js_json, js_string,
                             locale_number, markdown_table)

FIXTURES = json.loads(gzip.decompress((Path(__file__).parent / "fixtures" / "answer_cases.json.gz").read_bytes()).decode("utf-8"),
                      object_hook=lambda o: float(o["$js"]) if set(o) == {"$js"} else o)   # -0, NaN, Infinity
ANSWER_CASES = FIXTURES["format_answer"]
ERROR_CASES = FIXTURES["format_error"]


def _truthy(v) -> bool:
    """JavaScript truthiness for JSON values (objects and arrays are always truthy)."""
    return isinstance(v, (dict, list)) or v not in (None, "", 0, False)


def _raw_error(item: dict) -> str:
    """What the n8n adapter of ErrorFormat reads: (e.error && (e.error.message || e.error)) || e.message || ''."""
    err = item.get("error")
    raw = None
    if _truthy(err):
        msg = err.get("message") if isinstance(err, dict) else None
        raw = msg if _truthy(msg) else err
    if not _truthy(raw):
        raw = item.get("message") if _truthy(item.get("message")) else ""
    return js_string(raw)


# ---------------------------------------------------------------- every case, against the JavaScript node
def test_fixture_counts():
    assert len(ANSWER_CASES) >= 150 and len(ERROR_CASES) >= 40


@pytest.mark.parametrize("case", ANSWER_CASES, ids=[c["id"] for c in ANSWER_CASES])
def test_format_answer_matches_js(case):
    assert format_answer(case["rows"], case["question"] or "", case["thinking"]) == case["answer"]


@pytest.mark.parametrize("case", ERROR_CASES, ids=[c["id"] for c in ERROR_CASES])
def test_format_error_matches_js(case):
    see_details = bool(((case["auth"] or {}).get("can") or {}).get("seeDetails"))
    assert format_error(_raw_error(case["input"]), see_details) == case["answer"]


def test_numbers_match_js():
    """toLocaleString('en-US'), Math.round(x * 100) / 100 and JSON.stringify on 3000+ numbers."""
    bad = []
    for c in FIXTURES["numbers"]:
        v = c["value"]
        got = (locale_number(v), js_json(_js_round(float(v) * 100) / 100), js_json(v), js_string(v))
        if got != (c["locale"], c["chart"], c["json"], c["string"]):
            bad.append((v, got, c))
    assert not bad, bad[:5]


# ---------------------------------------------------------------- readable examples
def _chart_config(answer: str) -> dict:
    url = answer[answer.index("](") + 2:answer.rindex(")")]
    return json.loads(parse_qs(urlsplit(url).query)["c"][0])


def test_table_and_pie_for_a_few_offices():
    answer = format_answer([{"Name": "A", "Total": 10}, {"Name": "B", "Total": 5}], "فروش هر دفتر")
    assert answer.startswith("| Name | Total |\n| --- | --- |\n| A | 10 |\n| B | 5 |\n\n![فروش هر دفتر](http://localhost:3001/chart?c=")
    config = _chart_config(answer)
    assert config["type"] == "pie" and config["data"]["datasets"][0]["data"] == [10, 5]
    assert answer.endswith("&w=640&h=480&backgroundColor=white&version=4&devicePixelRatio=2)\n")


def test_no_rows_and_thinking():
    assert format_answer([], "q") == "نتیجه‌ای یافت نشد."
    assert format_answer([{}], "q", " plan \n") == "<think>\nplan\n</think>\n\nنتیجه‌ای یافت نشد."


def test_numbers_like_javascript():
    assert [locale_number(v) for v in (1234567, 2.675, 1.005, 0.125, -0.125, -0.0, 1e21, 10.0, -1234.5)] == \
        ["1,234,567", "2.68", "1.01", "0.13", "-0.13", "-0", "1,000,000,000,000,000,000,000", "10", "-1,234.5"]
    assert js_json({"a": [10.0, -0.0, 0.25, 1e21, 1e-7, None, True, "فروش"]}) == \
        '{"a":[10,0,0.25,1e+21,1e-7,null,true,"فروش"]}'


def test_python_values_do_not_leak():
    rows = [{"Name": "A", "Active": True, "V": None, "Big": 10.0}, {"Name": "B", "Active": False, "V": 2, "Big": 3.5}]
    table = markdown_table(rows, ["Name", "Active", "V", "Big"])
    assert "| A | true |  | 10 |" in table and "| B | false | 2 | 3.5 |" in table
    assert "True" not in table and "None" not in table


def test_column_order_is_javascript_object_order():
    # Object.keys puts integer-like keys first; a Python dict keeps insertion order
    answer = format_answer([{"Name": "A", "2024": 1}, {"Name": "B", "2024": 2}], "")
    assert answer.startswith("| 2024 | Name |")


def test_chart_type_from_the_question():
    assert chart_type("نمودار دایره‌ای", 30, True) == "pie"
    assert chart_type("sales trend", 3, False) == "line"
    assert chart_type("pipeline status", 3, False) == "pie"      # no \bline\b
    assert chart_type("x", 7, False) == "bar"
    assert chart_type("x", 7, False, ChartSettings(auto_chart=False)) is None


def test_url_is_encode_uri_component():
    answer = format_answer([{"L": "a (1)!", "V": 1}, {"L": "b*'~", "V": 2}], "q")
    url = answer[answer.index("](") + 2:answer.rindex(")")]
    assert "a%20(1)!" in url and "b*'~" in url and "+" not in url
    assert unquote(url).count('"labels":["a (1)!","b*\'~"]') == 1


def test_capped_result_says_so():
    many = [{"Name": f"n{i}", "Total": i} for i in range(200)]
    assert "به 200 ردیف محدود شده" in format_answer(many, "")


def test_errors():
    assert format_error("⛔ شما دسترسی ندارید. [line 3]", False) == "⛔ شما دسترسی ندارید."
    assert format_error("Invalid column name 'Foo'. [line 12]", True) == "Invalid column name 'Foo'."
    assert format_error("Invalid column name 'Foo'.", False).startswith("⛔ در پردازش درخواست شما خطایی رخ داد")
    assert format_error("", True).startswith("⛔ در پردازش")


def test_js_round():
    assert [_js_round(x) for x in (2.5, -2.5, 0.49999999999999994, -0.4)] == [3, -2, 0, 0]
    assert math.copysign(1, _js_round(-0.4)) == -1
