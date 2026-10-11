"""text2sql.review_notes writes exactly the Obsidian notes the n8n node "Obsidian note" writes.

The expected notes come from the real JavaScript node (with a fixed clock): fixtures/answer_cases.json.gz, written by
`node tests/py/fixtures/make_answer_fixtures.js`. One deliberate difference: the answered note tells the reviewer
to run `python -m text2sql learn` instead of `node scripts/learn-from-inbox.js`.
"""
from __future__ import annotations

import base64
import gzip
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from text2sql.review_notes import NoteFile, answered_note, failed_note

CASES = json.loads(gzip.decompress((Path(__file__).parent / "fixtures" / "answer_cases.json.gz").read_bytes()).decode("utf-8"))["notes"]
JS_LEARN = "Then run `node scripts/learn-from-inbox.js`"
PY_LEARN = "Then run `python -m text2sql learn`"


def _now(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def _js_str(v) -> str:
    return "" if v in (None, "", 0, False) else str(v)


def _note_for(case: dict) -> NoteFile:
    """The node's inputs (Webhook, BuildPrompt, Security json) as plain arguments."""
    nodes = case["nodes"]
    question = _js_str(((nodes.get("Webhook") or {}).get("body") or {}).get("question"))
    bp = nodes.get("BuildPrompt") or {}
    retrieval = bp.get("retrieval") or {}
    common = dict(question=question, answer=_js_str(case["inputs"]["answer"]),
                  selected_entities=bp.get("selectedEntities") or [], why=retrieval.get("why") or {},
                  domains=retrieval.get("activeDomains") or [], now=_now(case["now"]))
    if case["kind"] == "failed":
        return failed_note(**common, low_confidence=bool(retrieval.get("lowConfidence")))
    sec = nodes.get("Security") or {}
    return answered_note(**common, understood=sec.get("understood") or "", model_sql=sec.get("modelSql") or "",
                         sql=sec.get("sql") or "", used_entities=sec.get("entities") or [])


def test_fixture_counts():
    assert len(CASES) >= 40
    assert {c["kind"] for c in CASES} == {"answered", "failed"}


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_note_matches_js(case):
    note = _note_for(case)
    expected = case["markdown"]
    if case["kind"] == "answered":
        assert expected.count(JS_LEARN) == 1
        expected = expected.replace(JS_LEARN, PY_LEARN)      # the one deliberate difference
    assert note.name == case["name"]
    assert note.markdown.encode("utf-8") == expected.encode("utf-8")


# ---------------------------------------------------------------- readable examples
NOW = datetime(2026, 10, 10, 14, 22, 33, tzinfo=timezone.utc)


def _answered(**kw) -> NoteFile:
    args = dict(question="فروش خالص هر دفتر", understood="u", answer="<think>plan</think>\n| a |\n| --- |\n| 1 |",
                model_sql="SELECT 1", sql="WITH x AS (SELECT 1) SELECT 1", selected_entities=["Fact_Sales"],
                why={"Fact_Sales": ["synonym", "metric"]}, used_entities=["Fact_Sales"], domains=["sales"], now=NOW)
    return answered_note(**{**args, **kw})


def test_answered_note():
    note = _answered()
    assert note.name == "2026-10-10 142233 answered question.md"
    md = note.markdown
    assert md.startswith("---\ntype: answered-question\nstatus: to-review\ndate: 2026-10-10\ndomains: [sales]\n---\n")
    assert "\n- [ ] ✅ correct\n- [ ] ❌ wrong\n" in md and PY_LEARN in md
    assert "<think>" not in md and "## Answer\n| a |\n| --- |\n| 1 |\n" in md
    assert "- [[Fact_Sales]] - synonym، metric" in md
    payload = md.split("%% text2sql ")[1].split(" %%")[0]
    assert json.loads(base64.b64decode(payload)) == {
        "question": "فروش خالص هر دفتر", "model_sql": "SELECT 1", "sql": "WITH x AS (SELECT 1) SELECT 1",
        "entities": ["Fact_Sales"], "used": ["Fact_Sales"], "domains": ["sales"]}
    assert list(json.loads(base64.b64decode(payload))) == ["question", "model_sql", "sql", "entities", "used", "domains"]


def test_failed_note():
    note = failed_note(question="فروش  هر دفتر\nفروش", answer="⛔ این سوال قابل پاسخ نیست.\nجزئیات",
                       selected_entities=[], why={}, domains=[], low_confidence=True, now=NOW)
    assert note.name == "2026-10-10 142233 failed question.md"
    assert "\nlow_confidence: true\n" in note.markdown
    assert "# فروش هر دفتر فروش\n" in note.markdown
    assert "**Answer sent:** ⛔ این سوال قابل پاسخ نیست.\n" in note.markdown
    assert "## Tables the model was given\n- (none)\n" in note.markdown


def test_file_name_is_utc():
    tehran = timezone(timedelta(hours=3, minutes=30))
    note = _answered(now=datetime(2026, 10, 11, 2, 0, 5, tzinfo=tehran))
    assert note.name == "2026-10-10 223005 answered question.md"
    assert "\ndate: 2026-10-10\n" in note.markdown


def test_empty_question_and_long_answer():
    note = _answered(question="  ", answer="\n".join(f"l{i}" for i in range(40)))
    assert "\n#  \n" in note.markdown                     # whitespace collapses to one space, as in the node
    assert "l24\n\n## Tables" in note.markdown and "l25" not in note.markdown
    assert "# (no question)\n" in _answered(question="").markdown
