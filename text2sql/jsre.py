"""Regular expressions that behave like JavaScript's.

The SQL guard and the retrieval rules were written (and security-reviewed) as JavaScript regexes.
Python's defaults differ in ways that matter for security:
  - \\b and \\w: Python treats Persian letters as word characters, JavaScript does not. «فروشinsert» has a
    word boundary before "insert" in JavaScript; a plain Python \\binsert\\b would miss it.
  - \\s: JavaScript also matches non-breaking and other Unicode spaces.
  - $: without MULTILINE, Python also matches before a final newline; JavaScript only at the very end.
compile() fixes all three: ASCII \\b \\w \\d, JavaScript \\s, and $ -> \\Z outside MULTILINE.
"""
from __future__ import annotations

import functools
import re

from .text import JS_WHITESPACE

I = re.IGNORECASE
M = re.MULTILINE


def _translate(pattern: str, multiline: bool) -> str:
    out = []
    i = 0
    in_class = False
    while i < len(pattern):
        ch = pattern[i]
        if ch == "\\" and i + 1 < len(pattern):
            nxt = pattern[i + 1]
            if nxt == "s":
                out.append(JS_WHITESPACE if in_class else f"[{JS_WHITESPACE}]")
            elif nxt == "S" and not in_class:
                out.append(f"[^{JS_WHITESPACE}]")
            else:
                out.append(pattern[i:i + 2])
            i += 2
            continue
        if in_class:
            if ch == "]":
                in_class = False
            out.append(ch)
        elif ch == "[":
            in_class = True
            out.append(ch)
            if pattern[i + 1:i + 2] == "^":
                out.append("^")
                i += 1
            if pattern[i + 1:i + 2] == "]":       # literal ] right after [ or [^
                out.append("\\]")
                i += 1
        elif ch == "$" and not multiline:
            out.append(r"\Z")
        else:
            out.append(ch)
        i += 1
    return "".join(out)


@functools.lru_cache(maxsize=512)
def compile(pattern: str, flags: int = 0) -> re.Pattern:  # noqa: A001 - mirrors re.compile
    return re.compile(_translate(pattern, bool(flags & re.MULTILINE)), flags | re.ASCII)
