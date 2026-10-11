"""Learns from the answers a reviewer ticked in Obsidian - nobody writes SQL.

For every "answered question" note in Inbox/Review ticked ✅ correct:
  - the question and the model's SQL become a verified example in Catalog/Query bank.md (the model sees it for
    similar questions from the next question on - no restart);
  - the question and the exact query that ran become a "confirmed" question in benchmark/02/confirmed.json
    (the end-to-end benchmark then warns when a later change breaks it);
  - the note is deleted.
❌ wrong notes stay (they say what to fix); unticked notes are left alone; both boxes ticked = skipped.
"""
from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .retrieval.examples import example_tables
from .text import question_key
from .vault.source import load_catalog, read_notes
from .vault.catalog_notes import parse_catalog
from .vault.validator import validate

ROW_CAP_TOP = re.compile(r"^(\s*SELECT\s+)TOP\s+200\s+", re.I)
BANK_NOTE = "Query bank.md"


@dataclass(frozen=True)
class ReviewNote:
    verdict: str | None            # correct | wrong | both | None (not ticked)
    data: dict


def parse_note(text: str) -> ReviewNote | None:
    if not re.search(r"^type: answered-question$", text, re.M):
        return None
    m = re.search(r"%% text2sql ([A-Za-z0-9+/=]+) %%", text)
    if not m:
        return None
    try:
        data = json.loads(base64.b64decode(m.group(1)).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    ok = bool(re.search(r"^- \[[xX]\] ✅", text, re.M))
    wrong = bool(re.search(r"^- \[[xX]\] ❌", text, re.M))
    return ReviewNote("both" if ok and wrong else "correct" if ok else "wrong" if wrong else None, data)


def _stamp(file_name: str) -> str:
    """'2026-10-10 142233 answered question.md' -> '20261010_142233'"""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2}) (\d{6})", file_name)
    return f"{m.group(1)}{m.group(2)}{m.group(3)}_{m.group(4)}" if m else "x"


def bank_entry(q: str, ex_id: str, sql: str) -> str:
    return f"### {q}\n- id: `{ex_id}` · status: verified\n```sql\n{sql}\n```\n"


@dataclass
class Result:
    learned: list[tuple[str, str, str]] = field(default_factory=list)   # (file, id, question)
    wrong: list[str] = field(default_factory=list)
    unticked: int = 0
    skipped: list[str] = field(default_factory=list)


def learn(inbox: Path, catalog_dir: Path, confirmed_path: Path, dry_run: bool = False) -> Result:
    r = Result()
    if not inbox.is_dir():
        return r
    catalog, problems = load_catalog(catalog_dir)
    if problems:
        raise RuntimeError(f"fix the catalog notes first ({problems[0].note}: {problems[0].message})")
    real_name = {t.name.lower(): t.name for t in catalog.tables}
    bank_path = catalog_dir / BANK_NOTE
    bank_text = bank_path.read_text(encoding="utf-8")
    confirmed = (json.loads(confirmed_path.read_text(encoding="utf-8")) if confirmed_path.exists()
                 else {"description": "", "questions": []})
    known = {question_key(e.q) for e in catalog.bank} | {question_key(q["question"]) for q in confirmed["questions"]}
    notes = read_notes(catalog_dir)
    to_delete = []

    for f in sorted(p for p in inbox.iterdir() if p.suffix == ".md"):
        note = parse_note(f.read_text(encoding="utf-8"))
        if note is None:
            continue
        if note.verdict is None:
            r.unticked += 1
            continue
        if note.verdict == "both":
            r.skipped.append(f"{f.name}: both boxes ticked")
            continue
        if note.verdict == "wrong":
            r.wrong.append(f.name)
            continue
        d = note.data
        question, model_sql, sql = d.get("question"), d.get("model_sql"), d.get("sql")
        if not question or not model_sql or not sql:
            r.skipped.append(f"{f.name}: the note has no SQL")
            continue
        if question_key(question) in known:
            r.skipped.append(f"{f.name}: already learned")
            to_delete.append(f)
            continue
        ex_id = f"conf_{_stamp(f.name)}"
        trial_text = bank_text.rstrip("\n") + "\n\n" + bank_entry(question, ex_id, ROW_CAP_TOP.sub(r"\1", model_sql, 1))
        trial, _ = parse_catalog({**notes, BANK_NOTE: trial_text})
        bad = [p for p in validate(trial) if p.severity == "error" and ex_id in p.message]
        if bad:
            r.skipped.append(f"{f.name}: {bad[0].message}")
            continue
        bank_text = trial_text
        notes[BANK_NOTE] = bank_text
        tables = list(dict.fromkeys(real_name[n.lower()] for n in [*d.get("used", []), *example_tables(model_sql)]
                                    if n.lower() in real_name))
        confirmed["questions"].append({"id": ex_id, "domain": (d.get("domains") or ["mixed"])[0], "category": "confirmed",
                                       "difficulty": "real", "question": question, "expected_entities": tables,
                                       "gold_sql": sql, "score_on": []})
        known.add(question_key(question))
        to_delete.append(f)
        r.learned.append((f.name, ex_id, question))

    if not dry_run:
        if r.learned:
            bank_path.write_text(bank_text, encoding="utf-8")
            confirmed_path.write_text(json.dumps(confirmed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        for f in to_delete:
            f.unlink()
    return r
