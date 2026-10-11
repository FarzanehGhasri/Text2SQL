"""The system checks itself and writes the result, in plain words, to Obsidian: Inbox/System check.md.

Runs inside the service whenever the catalog notes change (and from `python -m text2sql check`). No model, no
database. It says:
  - notes with a mistake (the model keeps the last good catalog until they are fixed);
  - catalog warnings (unreviewed columns, tables without synonyms);
  - for the benchmark questions: does every needed table reach the prompt - with meaning search when the
    embeddings service answers - and for each miss, which table and what to add.
A ✅ here does not prove the SQL is right; the ✅ / ❌ on answered questions is for that.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .benchmark import SETS, load_set, retrieval_benchmark
from .vault.validator import validate


def render(*, problems, warnings, embedding: str, sets, now: datetime) -> str:
    lines = ["---", "type: system-check", f"date: {now.strftime('%Y-%m-%d %H:%M')}", "---", "# System check", "",
             "> Written by the text2sql service itself whenever a note changes - no model, no database.",
             "> It checks that the right tables reach the model. A ✅ here does not prove the SQL is right;",
             "> that is what your ✅ / ❌ on answered questions is for.", ""]
    if problems:
        lines += ["## ⛔ Catalog notes with a mistake - your last edit has NOT reached the model yet", "",
                  "The model keeps using the last good version until these are fixed (then it updates by itself).", ""]
        lines += [f"- [[{p.note.rsplit('/', 1)[-1][:-3]}]]: {p.message}" for p in problems[:30]] + [""]
    lines += ["## Finding the right tables", "", f"Meaning search (embeddings): {embedding}", ""]
    for label, questions, results in sets:
        checked = [r for r in results if r.checked]
        ok = sum(r.passed for r in checked)
        lines.append(f"- {'✅' if ok == len(checked) else '⚠️'} {label}: **{ok} of {len(checked)}**")
    ns = [r for _, _, rs in sets for r in rs if r.category == "not_supported"]
    if ns:
        flagged = sum(r.low_confidence for r in ns)
        lines.append(f"- {'✅' if flagged == len(ns) else '⚠️'} \"Not answerable\" questions recognised: **{flagged} of {len(ns)}**")
    misses = [(q, r) for _, qs, rs in sets for q, r in zip(qs, rs) if r.checked and not r.passed]
    if misses:
        lines += ["", "## Questions whose table was not found", "",
                  "For each: open the table note and add a word the question uses to its `synonyms`.", ""]
        for q, r in misses[:30]:
            what = f"error: {r.error}" if r.error else "needs " + ", ".join(f"[[{n}]]" for n in r.missing + r.leaked)
            lines.append(f"- «{q['question']}» - {what}")
    if warnings:
        lines += ["", f"## Worth fixing ({len(warnings)})", "", "The catalog works; these make answers better.", ""]
        lines += [f"- [[{w.note.rsplit('/', 1)[-1][:-3]}]]: {w.message}" for w in warnings[:40]]
    return "\n".join(lines) + "\n"


def run_check(service, benchmark_dir: Path, out: Path | None) -> str:
    catalog = service.catalog.current()
    vectors = service.vectors.current(catalog)
    embed = (lambda t: service.vectors.embed_question(t)) if not vectors.empty else None
    sets = []
    for name, label in SETS:
        qs = load_set(benchmark_dir, name)
        if qs:
            sets.append((label, qs, retrieval_benchmark(qs, catalog, vectors, embed, service.values.current(),
                                                        service.settings.current().max_prompt_chars)))
    warnings = [p for p in validate(catalog) if p.severity == "warning"]
    text = render(problems=service.catalog.problems, warnings=warnings,
                  embedding="on (bge-m3)" if embed else "off - the embeddings service did not answer; keyword search only",
                  sets=sets, now=datetime.now(timezone.utc))
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
    return text
