"""Measuring accuracy.

retrieval  (no model, no database, seconds): does every table a question needs reach the prompt?
end to end (model + database): are the model's rows the same as the correct SQL's rows?
  Rows are compared by VALUES, not column names (the model picks its own aliases): each correct row must match
  its own model row holding all its values (extra model columns are fine), and the row counts must be equal.
  Every failed question gets one failure_type, so the summary says which part of the system to improve first.
Questions: benchmark/02/*.json (confirmed.json = answers approved in Obsidian, a regression check kept out of the
accuracy percentage, since they were chosen because the model already got them right).
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .answer import _js_round, js_json
from .directory import User
from .model import Catalog
from .prompt import PromptBuilder
from .retrieval.finder import TableFinder
from .retrieval.values import ValueIndex
from .retrieval.vectors import CatalogVectors

SETS = (
    ("questions.json", "Questions in catalog wording"),
    ("paraphrase_questions.json", "Reworded questions (as real users ask)"),
    ("join_path_questions.json", "Questions that need a linking table"),
    ("confirmed.json", "Answers you approved in Obsidian"),
)


def load_set(folder: Path, name: str) -> list[dict]:
    p = folder / name
    return json.loads(p.read_text(encoding="utf-8")).get("questions", []) if p.exists() else []


# ---------------------------------------------------------------- retrieval
@dataclass
class RetrievalResult:
    id: str
    category: str
    checked: bool
    passed: bool
    missing: list[str] = field(default_factory=list)
    leaked: list[str] = field(default_factory=list)
    low_confidence: bool = False
    error: str = ""


def retrieval_benchmark(questions: list[dict], catalog: Catalog, vectors: CatalogVectors = CatalogVectors(),
                        embed=None, values: ValueIndex = ValueIndex(), max_chars: int = 24000) -> list[RetrievalResult]:
    domain_of = {t.name: ("(shared)" if d.shared else d.domain) for d in catalog.domains for t in d.tables}
    finder, builder = TableFinder(), PromptBuilder(max_chars)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    out = []
    for q in questions:
        expected = q.get("expected_entities") or []
        allowed_domains = q.get("allowed_domains")
        checked = bool(expected) or isinstance(allowed_domains, list)
        try:
            qv = embed(q["question"]) if embed else None
            plan = finder.find(catalog, q["question"], q.get("run_as_groups") or ["NLSQL-Full"], vectors, qv, values)
            selected = builder.build(plan, now).table_names
            missing = [n for n in expected if n not in selected]
            leaked = [n for n in selected if isinstance(allowed_domains, list) and domain_of.get(n) not in allowed_domains]
            out.append(RetrievalResult(q["id"], q.get("category", ""), checked, not missing and not leaked, missing,
                                       leaked, plan.low_confidence))
        except Exception as e:  # noqa: BLE001 - "no access" is the right outcome for a user without a domain
            out.append(RetrievalResult(q["id"], q.get("category", ""), checked, not expected, list(expected),
                                       error=str(e).split("\n")[0]))
    return out


# ---------------------------------------------------------------- end to end: scoring one question
NOT_ANSWERABLE = re.compile("قابل پاسخ نیست")
SECURITY_REJECT = re.compile("خارج از حیطه|غیرمجاز|معتبری ارجاع|فقط SELECT|JOIN صریح|کاراکتر غیرمجاز|نتوانست کوئری|بعد از FROM")

MEANING = {
    "retrieval_miss": "جدول لازم به مدل داده نشد - معمولاً مترادفِ جدول کم است (synonyms)",
    "wrong_values": "جدول درست بود ولی عدد یا فیلتر غلط - معمولاً یک معیار (Metrics) یا قانون لازم است",
    "wrong_row_count": "تعداد ردیف‌ها غلط است - گروه‌بندی یا TOP اشتباه؛ یک مثال مشابه در Query bank کمک می‌کند",
    "empty_result": "نتیجه خالی شد - معمولاً فیلتر مقدار یا تاریخ غلط؛ ایندکس مقدارها کمک می‌کند",
    "sql_error": "SQL روی سرور خطا داد - حتی بعد از یک بار اصلاح",
    "security_rejected": "لایه امنیتی SQL مدل را رد کرد - معمولاً جدولی خارج از فهرست داده‌شده",
    "wrongly_not_supported": "مدل گفت «قابل پاسخ نیست» ولی بود - معمولاً جدول یا معیار لازم به مدل نرسیده",
    "answered_unanswerable": "سوال خارج از داده بود ولی مدل جواب ساخت",
    "refused_wrong_reason": "سوال خارج از داده بود و رد شد، ولی با پیام دیگری",
    "security_not_refused": "درخواست خطرناک رد نشد - فوراً بررسی شود",
}


def _norm_value(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return 1 if v else 0
    if isinstance(v, (int, float)):
        return _js_round(v * 100) / 100
    s = str(v).strip()
    if re.fullmatch(r"-?[\d,]+(\.\d+)?", s):
        try:
            return _js_round(float(s.replace(",", "")) * 100) / 100
        except ValueError:
            pass
    if re.match(r"^\d{4}-\d{2}-\d{2}T", s):
        return s[:10]
    return s


def _bag(values) -> dict[str, int]:
    out: dict[str, int] = {}
    for v in values:
        k = js_json(_norm_value(v))
        out[k] = out.get(k, 0) + 1
    return out


def rows_match(gold: list[dict], model: list[dict], score_on: list[str]) -> str | None:
    """None when they match, else why not."""
    if len(gold) != len(model):
        return f"gold={len(gold)} ردیف, model={len(model)} ردیف"
    gold_bags = [_bag([r.get(c) for c in score_on] if score_on else list(r.values())) for r in gold]
    model_bags = [_bag(list(r.values())) for r in model]
    used: set[int] = set()
    for i, gb in enumerate(gold_bags):
        j = next((k for k, mb in enumerate(model_bags) if k not in used and all(mb.get(x, 0) >= n for x, n in gb.items())), -1)
        if j == -1:
            return f"ردیف gold شماره {i + 1} در خروجی مدل پیدا نشد: {json.dumps(gold[i], ensure_ascii=False, default=str)}"
        used.add(j)
    return None


def score_question(q: dict, response: dict, gold_rows: list[dict] | None) -> dict:
    category, score_on = q.get("category"), q.get("score_on") or []
    error = response.get("error")
    rows = response.get("rows") if isinstance(response.get("rows"), list) else None
    selected = response.get("selectedEntities")
    missing = [n for n in (q.get("expected_entities") or []) if selected is not None and n not in selected]
    gold_rows = [r for r in (gold_rows or []) if r]
    passed, note, failure = None, "", None
    if category == "security":
        passed = error is not None
        note = "رد شد - طبق انتظار" if passed else "خطایی برنگشت - آیا کوئری اجرا شد؟ بررسی دستی لازم است"
        failure = None if passed else "security_not_refused"
    elif category == "not_supported":
        passed = error is not None and bool(NOT_ANSWERABLE.search(error))
        note = ("NOT_SUPPORTED - طبق انتظار" if passed else
                f"خطا داد ولی نه NOT_SUPPORTED: {error}" if error else "مدل به‌جای اعلام «پشتیبانی نمی‌شود» کوئری اجرا کرد")
        failure = None if passed else ("refused_wrong_reason" if error else "answered_unanswerable")
    elif category == "ambiguous":
        note = "سوال مبهم - بررسی دستی: خط UNDERSTOOD را با تفسیر مورد انتظار مقایسه کنید"
    elif not q.get("gold_sql"):
        note = "gold_sql تعریف نشده"
    elif error:
        passed, note = False, "خطای مدل/سیستم: " + error
        failure = ("wrongly_not_supported" if NOT_ANSWERABLE.search(error) else
                   "security_rejected" if SECURITY_REJECT.search(error) else "sql_error")
    else:
        mismatch = rows_match(gold_rows, rows or [], score_on)
        passed, note = mismatch is None, mismatch or ""
        if not passed:
            failure = ("empty_result" if not rows and gold_rows else
                       "wrong_row_count" if len(rows or []) != len(gold_rows) else "wrong_values")
    # a needed table that never reached the prompt is the root cause, whatever else went wrong
    if passed is False and missing and category not in ("security", "not_supported"):
        failure = "retrieval_miss"
        note = "جدول به prompt نرسید: " + ", ".join(missing) + (" | " + note if note else "")
    return {"id": q["id"], "domain": q.get("domain"), "question": q["question"], "category": category,
            "difficulty": q.get("difficulty"), "passed": passed, "failure_type": failure, "note": note,
            "retried": bool(response.get("retried")), "understood": response.get("understood"),
            "plan": response.get("plan"), "model_sql": response.get("modelSql") or response.get("sql"),
            "gold_sql": q.get("gold_sql")}


def summarize(results: list[dict]) -> dict:
    items = [r for r in results if r["category"] != "confirmed"]
    confirmed = [r for r in results if r["category"] == "confirmed" and r["passed"] is not None]
    scored = [r for r in items if r["passed"] is not None]
    passed = [r for r in scored if r["passed"]]
    pct = lambda a, b: round(a / b * 1000) / 10 if b else None  # noqa: E731
    fails: dict[str, int] = {}
    for r in scored:
        if not r["passed"]:
            fails[r["failure_type"] or "unknown"] = fails.get(r["failure_type"] or "unknown", 0) + 1
    top = max(fails.items(), key=lambda x: x[1]) if fails else None
    ok_confirmed = sum(1 for r in confirmed if r["passed"])

    def group(key):
        acc: dict = {}
        for r in scored:
            acc.setdefault(r[key], []).append(r["passed"])
        return [{key: k, "passed": sum(v), "total": len(v), "accuracyPct": pct(sum(v), len(v))} for k, v in acc.items()]

    words = [f"{len(passed)} از {len(scored)} سوال درست جواب گرفت ({pct(len(passed), len(scored)) or '-'}٪).",
             (f"جواب‌های تأییدشده در Obsidian: {ok_confirmed} از {len(confirmed)} هنوز درست است"
              + (" - تغییر اخیر چیزی را خراب کرده." if ok_confirmed < len(confirmed) else ".")) if confirmed
             else "هنوز جوابی در Obsidian تأیید نشده (How-to → Review answers).",
             f"بیشترین مشکل ({top[1]} سوال): {MEANING.get(top[0], top[0])}." if top else "هیچ سوالی خطا نداشت."]
    if len(items) - len(scored):
        words.append(f"{len(items) - len(scored)} سوال مبهم باید با چشم بررسی شود.")
    return {
        "inPlainWords": words,
        "overallAccuracyPct": pct(len(passed), len(scored)),
        "passedCount": len(passed), "scoredCount": len(scored), "needsManualReview": len(items) - len(scored),
        "retriedCount": sum(1 for r in items if r["retried"]),
        "byCategory": group("category"), "byDomain": group("domain"),
        "byFailureType": [{"failure_type": k, "count": v} for k, v in sorted(fails.items(), key=lambda x: -x[1])],
        "failed": [{"id": r["id"], "failure_type": r["failure_type"], "meaning": MEANING.get(r["failure_type"] or "", ""),
                    "note": r["note"]} for r in scored if not r["passed"]],
        "confirmedStillCorrectPct": pct(ok_confirmed, len(confirmed)),
        "confirmedBroken": [{"id": r["id"], "question": r["question"], "note": r["note"]} for r in confirmed if not r["passed"]],
    }


def end_to_end(service, runner, questions: list[dict], log=print) -> dict:
    """Asks every question through the real service (model + database) and scores it. No notes are written."""
    results = []
    for i, q in enumerate(questions, start=1):
        user = User("benchmark", "benchmark@local", tuple(q.get("run_as_groups") or ["NLSQL-Full"]))
        out = service.ask(q["question"], user, record=False)
        out.eval_mode = True
        gold, gold_error = None, None
        if q.get("gold_sql") and q.get("category") not in ("security", "not_supported", "ambiguous"):
            try:
                gold = runner.run_trusted(q["gold_sql"])
            except Exception as e:  # noqa: BLE001
                gold_error = str(e)
        r = score_question(q, out.response(), gold)
        if gold_error:
            r.update(passed=None, note="gold_sql خطا داد (اول آن را در SSMS درست کنید): " + gold_error[:200])
        results.append(r)
        log(f"{i}/{len(questions)} {q['id']}: {'✅' if r['passed'] else '❌' if r['passed'] is False else '•'} {r['failure_type'] or ''}")
    return {"summary": summarize(results), "details": results}
