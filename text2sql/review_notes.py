"""Review notes for the Obsidian inbox (obsidian/Inbox/n8n): one Markdown file per question.

Ported from the n8n Code node "Obsidian note"; the files are the same, byte for byte, with one deliberate
difference: the answered note says "Then run `python -m text2sql learn`" instead of
"Then run `node scripts/learn-from-inbox.js`".
  answered_note - a question that got an answer: the reviewer ticks ✅ or ❌; the data `learn` needs
                  (question, SQL, tables) rides along in a hidden Obsidian comment, base64 JSON
  failed_note   - a question that got no answer, with a to-do list
Which note to write (and whether to write one) is the caller's decision; no user name or e-mail is written.
"""
from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone

from . import jsre
from .text import js_trim

__all__ = ["NoteFile", "answered_note", "failed_note", "ANSWER_LINES"]

ANSWER_LINES = 25   # lines of the answer copied into the note
LEARN_COMMAND = "python -m text2sql learn"


@dataclass(frozen=True)
class NoteFile:
    name: str       # e.g. "2026-10-10 142233 answered question.md"
    markdown: str


_SPACES = jsre.compile(r"\s+")
_THINK = jsre.compile(r"<think>[\s\S]*?</think>\s*")
_SURROGATE = re.compile("[\ud800-\udfff]")


def _js_slice(s: str, start: int, end: int) -> str:
    """String.slice in UTF-16 code units (a cut emoji leaves a lone surrogate, as in JavaScript)."""
    return s.encode("utf-16-le", "surrogatepass")[2 * start:2 * end].decode("utf-16-le", "surrogatepass")


def _iso(now: datetime) -> str:
    """Date.toISOString up to the seconds, in UTC: 2026-10-10T14:22:33. A naive datetime is taken as UTC."""
    utc = now.replace(tzinfo=timezone.utc) if now.tzinfo is None else now.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S")


def _file_name(now: datetime, kind: str) -> str:
    return f"{_iso(now).replace('T', ' ').replace(':', '')} {kind} question.md"


def _js_json(v: object) -> str:
    """JSON.stringify for strings and lists of strings (lone surrogates escaped like JavaScript)."""
    text = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
    return _SURROGATE.sub(lambda m: f"\\u{ord(m.group()):04x}", text)


def _utf8_text(s: str) -> str:
    """What the note file holds: a lone surrogate becomes U+FFFD, like Buffer.from(s, 'utf8')."""
    return _SURROGATE.sub("�", s)


# ---------------------------------------------------------------- parts both notes share
def _title(question: str) -> str:
    return _js_slice(_SPACES.sub(" ", question), 0, 120) or "(no question)"


def _tables(selected_entities: list[str], why: dict[str, list[str]]) -> str:
    lines = [f"- [[{n}]] - {'، '.join('' if x is None else str(x) for x in (why.get(n) or []))}"
             for n in selected_entities]
    return "\n".join(lines) or "- (none)"


def _answer_text(answer: str) -> str:
    """The answer without the model's <think> block."""
    return js_trim(_THINK.sub("", answer or ""))


def _domains(domains: list[str]) -> str:
    return f"[{', '.join(domains)}]"


# ---------------------------------------------------------------- the notes
def answered_note(*, question: str, understood: str, answer: str, model_sql: str, sql: str,
                  selected_entities: list[str], why: dict[str, list[str]], used_entities: list[str],
                  domains: list[str], now: datetime) -> NoteFile:
    """A note with ✅ / ❌ for a reviewer; `python -m text2sql learn` reads the base64 data at the end."""
    data = {
        "question": question,
        "model_sql": model_sql or "",
        "sql": sql or "",
        "entities": list(selected_entities),
        "used": list(used_entities),
        "domains": list(domains),
    }
    payload = base64.b64encode(_js_json(data).encode("utf-8", "surrogatepass")).decode("ascii")
    answer_lines = "\n".join(_answer_text(answer).split("\n")[:ANSWER_LINES])
    markdown = f"""---
type: answered-question
status: to-review
date: {_iso(now)[:10]}
domains: {_domains(domains)}
---
# {_title(question)}

Is this answer right? Tick ONE box. Then run `{LEARN_COMMAND}` (How-to → Review answers).
- [ ] ✅ correct
- [ ] ❌ wrong

**Understood as:** {understood or '-'}

## Answer
{answer_lines}

## Tables the model was given
{_tables(selected_entities, why)}

## If it is wrong
- A needed table is missing above? Add the user's word to `synonyms_fa` of that table.
- Wrong number (sum, filter, status)? Add or fix a metric in the catalog.

%% text2sql {payload} %%
"""
    return NoteFile(_file_name(now, "answered"), _utf8_text(markdown))


def failed_note(*, question: str, answer: str, selected_entities: list[str], why: dict[str, list[str]],
                domains: list[str], low_confidence: bool, now: datetime) -> NoteFile:
    """A note for a question that got no answer: what the model was given and what to fix."""
    markdown = f"""---
type: failed-question
status: open
date: {_iso(now)[:10]}
domains: {_domains(domains)}
low_confidence: {'true' if low_confidence else 'false'}
---
# {_title(question)}

**Answer sent:** {_answer_text(answer).split(chr(10))[0]}

## Tables the model was given
{_tables(selected_entities, why)}

## What to do
- [ ] Wrong or missing table? Add the user's word to `synonyms_fa` of the right table
- [ ] Right table, wrong SQL? Add a metric, a hint or a query-bank example
- [ ] Really not answerable? Nothing to fix
- [ ] Then delete this note
"""
    return NoteFile(_file_name(now, "failed"), _utf8_text(markdown))
