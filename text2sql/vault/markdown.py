"""Small Markdown readers for Obsidian notes: front matter (Properties), ## sections, list items, tables.

Only the subset the vault uses - and the forms Obsidian's Properties editor writes (`key: value`,
`key: [a, b]`, block lists). No YAML library: notes are plain, and a library would accept far more
than we can check.
"""
from __future__ import annotations

import json
import re

_FRONT = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?")
_ITEM = re.compile(r"^\s*[-*]\s+")
_KV = re.compile(r"^([A-Za-z_][\w-]*):\s*(.*)$")
_LIST_ITEM = re.compile(r"^\s+-\s*(.*)$")
_HEADING2 = re.compile(r"^##\s+(.+?)\s*$")
_LINK = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")


def scalar(raw: str):
    s = raw.strip()
    if s.startswith('"'):
        return json.loads(s)
    if len(s) >= 2 and s.startswith("'") and s.endswith("'"):
        return s[1:-1].replace("''", "'")
    if s in ("true", "false"):
        return s == "true"
    return s


def _split_inline(s: str) -> list[str]:
    """'"a", "b, c", d' -> ['"a"', '"b, c"', 'd']"""
    out, cur, quote, i = [], "", None, 0
    while i < len(s):
        ch = s[i]
        if quote:
            cur += ch
            if ch == "\\" and quote == '"' and i + 1 < len(s):
                i += 1
                cur += s[i]
            elif ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            cur += ch
        elif ch == ",":
            out.append(cur)
            cur = ""
        else:
            cur += ch
        i += 1
    out.append(cur)
    return [x.strip() for x in out if x.strip()]


def front_matter(text: str) -> tuple[dict, str]:
    """(properties, body after the front matter)"""
    m = _FRONT.match(text)
    if not m:
        return {}, text
    props: dict = {}
    list_key = None
    for line in re.split(r"\r?\n", m.group(1)):
        item = _LIST_ITEM.match(line)
        if item and list_key:
            props[list_key].append(scalar(item.group(1)))
            continue
        kv = _KV.match(line)
        if not kv:
            continue
        key, value = kv.group(1), kv.group(2)
        list_key = None
        if value == "":
            props[key] = []
            list_key = key
        elif value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            props[key] = [scalar(x) for x in _split_inline(inner)] if inner else []
        else:
            props[key] = scalar(value)
    return props, text[m.end():]


def sections(body: str) -> dict[str, list[str]]:
    """{'': lines before the first ##, 'Columns': [...], ...}"""
    out: dict[str, list[str]] = {"": []}
    cur = ""
    for line in re.split(r"\r?\n", body):
        h = _HEADING2.match(line)
        if h:
            cur = h.group(1)
            out[cur] = []
        else:
            out[cur].append(line)
    return out


def items(lines: list[str] | None) -> list[str]:
    return [_ITEM.sub("", l).strip() for l in (lines or []) if _ITEM.match(l)]


def links(s: str) -> list[str]:
    return [m.group(1).strip() for m in _LINK.finditer(s)]


def quote_text(lines: list[str]) -> str:
    """The note's description: its > quote lines, joined."""
    parts = [re.sub(r"^>\s?", "", l).strip() for l in lines if re.match(r"^>\s?", l)]
    return " ".join(p for p in parts if p)


def unwrap_code(s: str) -> str:
    m = re.match(r"^`(.*)`$", s.strip())
    return m.group(1) if m else s.strip()


def table_rows(lines: list[str] | None) -> list[list[str]]:
    """Data rows of the first Markdown table (header and |---| skipped), cells unescaped."""
    rows = [l for l in (lines or []) if l.strip().startswith("|")]
    out = []
    for line in rows[2:]:
        t = re.sub(r"\|$", "", re.sub(r"^\|", "", line.strip()))
        out.append([c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", t)])
    return out
