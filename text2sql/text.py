"""Persian text normalisation and ordering helpers shared by every component.

Ported unchanged from the n8n code, so retrieval keeps exactly the same behaviour:
  norm        - one spelling for the same Persian text (ی/ي, ک/ك, digits, half-space, diacritics)
  lex_norm    - norm + drop the plural suffix «ها/های», for keyword matching only
  value_norm  - lex_norm without punctuation, for matching stored values
  question_key- "are these two questions the same?"
  locale_key  - sort key equal to JavaScript's String.localeCompare for table names and example ids
"""
from __future__ import annotations

import re

_ZWNJ = "\u200c"
_INVISIBLE = re.compile("[\u200b\u200d-\u200f\u202a-\u202e\ufeff]")
_DIACRITICS = re.compile("[\u064b-\u0652\u0670]")
# JavaScript's \s and String.trim, so whitespace is handled exactly as before
JS_WHITESPACE_CHARS = ("\t\n\v\f\r \u00a0\u1680" + "".join(chr(c) for c in range(0x2000, 0x200B))
                       + "\u2028\u2029\u202f\u205f\u3000\ufeff")
JS_WHITESPACE = "\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"   # regex class body
_SPACES = re.compile(f"[{JS_WHITESPACE}]+")
_TRANS = str.maketrans({"ي": "ی", "ى": "ی", "ك": "ک",
                        **{chr(0x06F0 + i): str(i) for i in range(10)},
                        **{chr(0x0660 + i): str(i) for i in range(10)}})

PLURAL_TOKENS = frozenset({"ها", "های", "هایی"})
_PUNCT = re.compile(r"[؟?!.,،؛:;«»\"'()\[\]{}\-_/\\]")


def js_trim(s: str) -> str:
    return s.strip(JS_WHITESPACE_CHARS)


def norm(s: object) -> str:
    t = "" if s is None else str(s)
    t = t.replace(_ZWNJ, " ")
    t = _INVISIBLE.sub("", t)
    t = t.translate(_TRANS)
    t = _DIACRITICS.sub("", t)
    t = t.lower()
    return js_trim(_SPACES.sub(" ", t))


def _drop_plural(t: str) -> str:
    if len(t) >= 5 and t.endswith("های"):
        return t[:-3]
    if len(t) >= 5 and t.endswith("ها"):
        return t[:-2]
    return t


def lex_norm(s: object) -> str:
    return " ".join(_drop_plural(t) for t in norm(s).split(" ") if t not in PLURAL_TOKENS)


def value_norm(s: object) -> str:
    return js_trim(_SPACES.sub(" ", _PUNCT.sub(" ", lex_norm(s))))


question_key = value_norm


# ---------------------------------------------------------------- JavaScript localeCompare
# ICU root collation for the characters in table names and example ids (measured with node):
#   space < _ < - < , < . < # < digits < letters; letters compare case-insensitively first,
#   then lowercase before uppercase.
_PRIMARY = {" ": 0, "_": 1, "-": 2, ",": 3, ".": 4, "#": 5}


def _primary(c: str) -> int:
    if c in _PRIMARY:
        return _PRIMARY[c]
    if c.isdigit() and c.isascii():
        return 10 + int(c)
    if c.isascii() and c.isalpha():
        return 20 + ord(c.lower()) - 97
    return 100 + ord(c)


def locale_key(s: str) -> tuple:
    return (tuple(_primary(c) for c in s), tuple(1 if c.isupper() else 0 for c in s))
