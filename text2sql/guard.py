"""SQL guard: turns an LLM reply into one read-only T-SQL query that can only read allowed catalog columns.

Port of n8n_workflows/code/Security.js with identical behaviour (proved by tests/py/test_guard.py against
fixtures recorded from the real JavaScript node). Layout follows the JS:
  0. GuardPolicy  - the security lists and numbers as data, separate from the logic (open/closed)
  1. pure steps   - one responsibility each: read the reply, split the envelope, cut out the SQL,
                    read-only checks, row cap, reference resolution, entity CTEs
  2. SqlGuard     - the order of the steps
Every step rejects by raising GuardRejection whose message starts with '⛔' (shown to the user as is).

Every regex goes through text2sql.jsre so \\b \\w \\d \\s $ and case-insensitivity behave like JavaScript;
a Persian letter glued to a keyword («فروشinsert») must still leave a word boundary before the keyword.
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, field
from typing import Callable, Iterable, Mapping

from . import jsre
from .text import js_trim

I = re.IGNORECASE

# JavaScript's `.` stops at every line terminator, Python's only at \n
_DOT = r"[^\n\r\u2028\u2029]"


# ==================== errors and data ====================
class GuardRejection(Exception):
    """The query is refused; .message is the Persian text shown to the user (starts with ⛔)."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _reject(message: str):
    raise GuardRejection(message)


@dataclass(frozen=True)
class EntityDef:
    """What the model was shown for one catalog entity (BuildPrompt's entityDefs entry)."""
    name: str
    kind: str = "table"
    source: str | None = None
    sql: str | None = None
    columns: tuple[tuple[str, str | None], ...] = ()   # (name, alias)

    @classmethod
    def from_dict(cls, d: Mapping) -> "EntityDef":
        """From the JS BuildPrompt shape {name, kind, source, sql, columns: [{name, alias}]}."""
        return cls(name=d.get("name"), kind=d.get("kind"), source=d.get("source"), sql=d.get("sql"),
                   columns=tuple((c.get("name"), c.get("alias")) for c in (d.get("columns") or [])))


@dataclass(frozen=True)
class GuardPolicy:
    """Security lists as data: a new rule is a new entry here, not new code."""
    row_cap: int = 200                    # mandatory row cap for every query
    response_keys: tuple[str, ...] = ("result", "response", "answer", "text", "output", "message", "content")
    think_keys: tuple[str, ...] = ("thinking", "reasoning", "reasoning_content", "thoughts")
    # JavaScript regex sources, matched case-insensitively. DBCC can run admin/DoS commands; APPLY can call
    # arbitrary (non-catalog) functions; INTO would write; xp_/sp_ and OPEN* reach outside the database.
    blocked: tuple[str, ...] = (
        r"\binsert\b", r"\bupdate\b", r"\bdelete\b", r"\bdrop\b",
        r"\btruncate\b", r"\balter\b", r"\bcreate\b", r"\bmerge\b",
        r"\bexec\b", r"\bexecute\b", r"\bgrant\b", r"\brevoke\b",
        r"\bbackup\b", r"\brestore\b", r"\bshutdown\b", r"\bwaitfor\b",
        r"\binto\b", r"\bxp_\w+", r"\bsp_\w+", r"openrowset", r"opendatasource",
        r"\bdbcc\b", r"\bapply\b", r"\bopenxml\b",
    )
    # statement separator and comments: no second statement, nothing hidden from the checks
    forbidden_tokens: tuple[str, ...] = (";", "--", "/*")


@dataclass(frozen=True)
class Envelope:
    body: str
    understood: str
    thinking: str
    plan: str


@dataclass(frozen=True)
class GuardedSql:
    sql: str            # final query: entity CTEs + model query
    model_sql: str      # model query after LIMIT/TOP/qualified-name rewriting
    entities: list[str] = field(default_factory=list)   # referenced entities, lower-cased, first-seen order
    understood: str = ""
    plan: str = ""
    thinking: str = ""


# ==================== JavaScript semantics the guard depends on ====================
_ARRAY_INDEX = re.compile(r"0|[1-9][0-9]*", re.ASCII)   # used with fullmatch


def _js_keys(obj: Mapping) -> list:
    """Object.keys order: array-index keys ascending first, then the rest in insertion order."""
    keys = list(obj.keys())
    idx = [k for k in keys if isinstance(k, str) and _ARRAY_INDEX.fullmatch(k) and int(k) < 2 ** 32 - 1]
    seen = set(idx)
    rest = [k for k in keys if k not in seen]
    return sorted(idx, key=int) + rest


def _utf16_len(s: str) -> int:
    return len(s.encode("utf-16-le", "surrogatepass")) // 2


def _utf16_slice(s: str, n: int) -> str:
    """s.slice(0, n) on UTF-16 code units (may cut an emoji in half, like JavaScript)."""
    return s.encode("utf-16-le", "surrogatepass")[:2 * n].decode("utf-16-le", "surrogatepass")


_JSON_ESC = {'"': '\\"', "\\": "\\\\", "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t"}


def _js_quote(s: str) -> str:
    out = []
    for ch in s:
        o = ord(ch)
        if ch in _JSON_ESC:
            out.append(_JSON_ESC[ch])
        elif o < 0x20 or 0xD800 <= o <= 0xDFFF:
            out.append("\\u%04x" % o)
        else:
            out.append(ch)
    return '"' + "".join(out) + '"'


def _js_number(x: float) -> str:
    """Number.prototype.toString for a finite double."""
    if x == 0:
        return "0"
    if x != x or math.isinf(x):
        return "null"
    sign = "-" if x < 0 else ""
    mant, _, exp = repr(abs(float(x))).partition("e")       # shortest round-trip digits, like JS
    int_part, _, frac = mant.partition(".")
    all_digits = int_part + frac
    lead = len(all_digits) - len(all_digits.lstrip("0"))
    digits = all_digits.strip("0")
    n = len(int_part) + int(exp or 0) - lead               # value = 0.<digits> * 10^n
    k = len(digits)
    if k <= n <= 21:
        return sign + digits + "0" * (n - k)
    if 0 < n <= 21:
        return sign + digits[:n] + "." + digits[n:]
    if -6 < n <= 0:
        return sign + "0." + "0" * (-n) + digits
    e = n - 1
    tail = ("." + digits[1:]) if k > 1 else ""
    return sign + digits[0] + tail + "e" + ("+" if e >= 0 else "-") + str(abs(e))


def _js_stringify(v) -> str:
    """JSON.stringify for JSON-shaped Python values (dict/list/str/number/bool/None)."""
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, int):
        return _js_number(float(v)) if abs(v) >= 2 ** 53 else str(v)
    if isinstance(v, float):
        return _js_number(v)
    if isinstance(v, str):
        return _js_quote(v)
    if isinstance(v, Mapping):
        return "{" + ",".join(_js_quote(str(k)) + ":" + _js_stringify(v[k]) for k in _js_keys(v)) + "}"
    if isinstance(v, (list, tuple)):
        return "[" + ",".join(_js_stringify(x) for x in v) + "]"
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def _js_replace(pattern: re.Pattern, s: str, replacement: str, count: int = 0) -> str:
    """String.prototype.replace with a regex and a replacement *string*: $$ $& $` $' $n are expanded
    (an entity name containing '$&' must be substituted exactly as JavaScript does)."""
    def expand(m: re.Match) -> str:
        out, i, groups = [], 0, pattern.groups
        while i < len(replacement):
            ch = replacement[i]
            nxt = replacement[i + 1:i + 2]
            if ch != "$" or not nxt:
                out.append(ch)
                i += 1
            elif nxt == "$":
                out.append("$"); i += 2
            elif nxt == "&":
                out.append(m.group(0)); i += 2
            elif nxt == "`":
                out.append(s[:m.start()]); i += 2
            elif nxt == "'":
                out.append(s[m.end():]); i += 2
            elif nxt.isdigit() and nxt.isascii():
                two = replacement[i + 1:i + 3]
                if len(two) == 2 and two.isdigit() and two.isascii() and 1 <= int(two) <= groups:
                    out.append(m.group(int(two)) or ""); i += 3
                elif 1 <= int(nxt) <= groups:
                    out.append(m.group(int(nxt)) or ""); i += 2
                else:
                    out.append("$"); i += 1
            else:
                out.append("$"); i += 1
        return "".join(out)
    return pattern.sub(expand, s, count=count)


def _re(pattern: str, flags: int = 0) -> re.Pattern:
    return jsre.compile(pattern, flags)


# ==================== 1. pure steps ====================
# ---------- 1-1. text of the API reply ----------
def extract_response_text(res: str | Mapping, policy: GuardPolicy = GuardPolicy()) -> str:
    raw = ""
    if isinstance(res, str):
        raw = res
    elif isinstance(res, Mapping):
        for k in policy.response_keys:
            v = res.get(k)
            if isinstance(v, str) and js_trim(v):
                raw = v
                break
        if not raw:
            # unknown API shape: the first substantial string field
            raw = next((v for v in (res[k] for k in _js_keys(res))
                        if isinstance(v, str) and _utf16_len(js_trim(v)) > 5), "")
    if not raw:
        _reject("⛔ ساختار پاسخ API شناخته نشد: " + _utf16_slice(_js_stringify(res), 300))
    return raw


# ---------- 1-2. reasoning/thinking and the UNDERSTOOD / PLAN / SQL envelope ----------
# PLAN text is never read as SQL, even when the model drops the SQL: label (it may say "with" or "select").
_THINK_TAG = _re(r"<think>([\s\S]*?)<\/think>", I)
_UNDERSTOOD = _re(r"UNDERSTOOD:\s*(" + _DOT + "+)", I)
_UNDERSTOOD_END = _re(r"\b(?:PLAN|SQL)\s*:", I)
_UNDERSTOOD_LINE = _re(r"UNDERSTOOD:" + _DOT + "*", I)          # /UNDERSTOOD:.*$/im
_HAS_PLAN = _re(r"(^|\n)[ \t>*#]*PLAN[ \t*]*:", I)
_SQL_LABEL_LINE = _re(r"(^|\n)[ \t>*#]*SQL[ \t*]*:[ \t*]*", I)    # label at line start (markdown ** or #)
_SQL_LABEL_INLINE = _re(r"()\bSQL\s*:\s*", I)                    # old one-line shape, only without PLAN
_PLAN = _re(r"(^|\n)[ \t>*#]*PLAN[ \t*]*:[ \t*]*([\s\S]*)$", I)
_PLAN_LABEL = _re(r"^[ \t>*#]*PLAN[ \t*]*:[ \t*]*", I)
_SQL_LINE = _re(r"\n\s*(select|with)\b", I)


def parse_envelope(res: str | Mapping, text: str, policy: GuardPolicy = GuardPolicy()) -> Envelope:
    raw = text
    thinking = ""
    if isinstance(res, Mapping):
        for k in policy.think_keys:
            v = res.get(k)
            if isinstance(v, str) and js_trim(v):
                thinking += js_trim(v) + "\n"
                break
    think_tag = _THINK_TAG.search(raw)
    if think_tag:
        thinking += js_trim(think_tag.group(1))
        raw = js_trim(raw.replace(think_tag.group(0), "", 1))

    understood = ""
    understood_match = _UNDERSTOOD.search(raw)
    if understood_match:
        understood = js_trim(_UNDERSTOOD_END.split(understood_match.group(1))[0])

    has_plan = _HAS_PLAN.search(raw) is not None
    sql_label = _SQL_LABEL_LINE.search(raw) or (None if has_plan else _SQL_LABEL_INLINE.search(raw))
    sql_marker = sql_label.start() + len(sql_label.group(1)) if sql_label else -1
    plan = ""
    before = raw[:sql_marker] if sql_marker != -1 else raw
    plan_match = _PLAN.search(before)
    if plan_match:
        plan = js_trim(plan_match.group(2))

    if sql_marker != -1:
        leftover = js_trim(_UNDERSTOOD_LINE.sub("", before, count=1))
        if leftover:
            thinking = (thinking + "\n" if thinking else "") + leftover
        raw = js_trim(raw[sql_marker + len(sql_label.group(0)) - len(sql_label.group(1)):])
    else:
        # no SQL label: drop the UNDERSTOOD and PLAN text so extract_sql only sees the rest
        if plan_match:
            # PLAN runs until the first line that starts with SELECT or WITH
            plan_start = len(before) - len(plan_match.group(0)) + len(plan_match.group(1))
            rest = raw[plan_start:]
            sql_line = _SQL_LINE.search(rest)
            cut = sql_line.start() if sql_line else -1
            plan = js_trim(_PLAN_LABEL.sub("", rest if cut == -1 else rest[:cut], count=1))
            thinking = (thinking + "\n" if thinking else "") + "PLAN:\n" + plan
            raw = raw[:plan_start] + ("" if cut == -1 else rest[cut:])
        if understood_match:
            raw = raw.replace(understood_match.group(0), "", 1)
        raw = js_trim(raw)
    return Envelope(body=raw, understood=understood, thinking=thinking, plan=plan)


# ---------- 1-3. the SQL out of the model's prose ----------
_SQLKW = _re(r"^\s*(select|from|where|group|order|having|join|inner|left|right|full|cross|outer|on|and|or"
             r"|union|with|as|top|case|when|then|else|end|\)|,)", I)
_PERSIAN = _re(r"[؀-ۿ]")
_BRACKETED = _re(r"\[[^\]]*\]")
_DQUOTED = _re(r'"[^"]*"')
_SQUOTED = _re(r"'(?:[^']|'')*'")
_FENCE_SQL = _re(r"```sql\s*([\s\S]*?)```", I)
_FENCE = _re(r"```\s*([\s\S]*?)```")
_FIRST_STATEMENT = _re(r"\b(select|with)\b[\s\S]*", I)
_BLANK_LINE = _re(r"\n\s*\n")
_TRAILING_SEMI = _re(r";+\s*$")


def _without_quoted_parts(line: str) -> str:
    return _SQUOTED.sub("", _DQUOTED.sub("", _BRACKETED.sub("", line)))


def is_persian_prose(line: str) -> bool:
    """A line is the model's Persian explanation only if Persian letters remain after removing [..], ".."
    and '..' parts: Persian column names and aliases on their own lines must survive."""
    return _PERSIAN.search(_without_quoted_parts(line)) is not None


def extract_sql(body: str) -> str:
    fence = _FENCE_SQL.search(body) or _FENCE.search(body)
    if fence:
        sql = js_trim(fence.group(1))
    else:
        m = _FIRST_STATEMENT.search(body)
        sql = js_trim(m.group(0)) if m else js_trim(body)
        sql = js_trim(_BLANK_LINE.split(sql)[0])
    sql = js_trim("\n".join(l for l in sql.split("\n") if not is_persian_prose(l) or _SQLKW.search(l)))
    sql = js_trim(_TRAILING_SEMI.sub("", sql, count=1))
    if not sql:
        _reject("⛔ مدل نتوانست کوئری تولید کند. لطفاً سوال را واضح‌تر بپرسید.")
    return sql


# ---------- 1-4. the model's "not supported" answer ----------
# The prompt asks for SELECT 'NOT_SUPPORTED' AS Status, '<reason>' AS Reason when the schema lacks the data.
# It references no entity, so it would fail later with a misleading message; tell the user the reason.
_NOT_SUPPORTED = _re(r"^\s*select\s+(?:top\s+\d+\s+)?'NOT_SUPPORTED'", I)
_NOT_SUPPORTED_REASON = _re(r"'NOT_SUPPORTED'\s+as\s+\[?status\]?\s*,\s*'((?:[^']|'')*)'", I)


def reject_if_not_supported(sql: str, understood: str) -> None:
    if not _NOT_SUPPORTED.search(sql):
        return
    m = _NOT_SUPPORTED_REASON.search(sql)
    reason = js_trim(m.group(1).replace("''", "'")) if m else ""
    _reject("⛔ این سوال با داده‌هایی که به آن دسترسی دارید قابل پاسخ نیست."
            + ("\n\n" + reason if reason else ("\n\n" + understood if understood else "")))


# ---------- 1-5. safety net: LIMIT n -> TOP n (T-SQL has no LIMIT) ----------
_LIMIT = _re(r"\blimit\s+(\d+)\s*;?\s*$", I)
_LIMIT_DROP = _re(r"\blimit\s+\d+\s*;?\s*$", I)
_SELECT_TOP = _re(r"^\s*select\s+top\b", I)
_SELECT = _re(r"^\s*select\b", I)


def limit_to_top(sql: str) -> str:
    lim = _LIMIT.search(sql)
    if not lim:
        return sql
    out = js_trim(_LIMIT_DROP.sub("", sql, count=1))
    if not _SELECT_TOP.search(out):
        out = _js_replace(_SELECT, out, f"SELECT TOP {lim.group(1)}", count=1)
    return out


# ---------- 1-6. SELECT only, no forbidden statement or character ----------
_READ_START = _re(r"^\s*(select|with)\b", I)
_FROM = _re(r"\bfrom\b", I)
_FROM_BOUNDARY = _re(r"\s*(where|group\s+by|order\s+by|having|union|except|intersect|for\b)\b", I)  # .match(s, i)
_WORD_CHAR = _re(r"\w")
_TABLE_SOURCE = _re(r"\b(?:from|join)\b\s*((?:\(\s*)*)", I)
_SUBQUERY_START = _re(r"^(?:select|with|values)\b", I)
_NAME_START = _re(r"^(?:\[|\"|[A-Za-z_])")


def blank_names(s: str) -> str:
    """[..], ".." and '..' emptied: FROM inside a column name such as [From] or inside a string is not a FROM."""
    s = re.sub(r"\[[^\]]*\]", "[x]", s)
    s = re.sub(r'"[^"]*"', '"x"', s)
    return re.sub(r"'(?:[^']|'')*'", "''", s)


def has_unchecked_table_source(sql: str) -> bool:
    """After FROM/JOIN only a table name or a subquery may follow. «FROM ([Secret] s CROSS JOIN ...)», «FROM #temp»,
    «FROM @t», «FROM ::fn» escaped the reference check, which only reads the name right after FROM/JOIN."""
    t = blank_names(sql)
    for m in _TABLE_SOURCE.finditer(t):
        rest = t[m.end():]
        if (not _SUBQUERY_START.search(rest)) if m.group(1) else (not _NAME_START.search(rest)):
            return True
    return False


def has_implicit_comma_join(sql: str) -> bool:
    """A comma join (FROM a, b) escapes the reference check, which only looks after FROM/JOIN.
    Scan each FROM up to its first clause boundary at the same parenthesis depth; a comma there rejects."""
    s = blank_names(sql)
    for m in _FROM.finditer(s):
        i = m.end()
        depth, quote = 0, None
        while i < len(s):
            ch = s[i]
            if quote:
                if ch == quote:
                    quote = None
                i += 1
                continue
            if ch in ("'", '"'):
                quote = ch
                i += 1
                continue
            if ch == "[":
                e = s.find("]", i)
                i = len(s) if e == -1 else e + 1
                continue
            if ch == "(":
                depth += 1
                i += 1
                continue
            if ch == ")":
                if depth == 0:
                    break
                depth -= 1
                i += 1
                continue
            if depth == 0:
                if ch == ",":
                    return True
                # only at the start of a word: the alias «somewhere» or «t_for» is not WHERE / FOR
                # (that let «FROM [Fact_Sales] somewhere, Secret» through)
                if (i == 0 or not _WORD_CHAR.match(s[i - 1])) and _FROM_BOUNDARY.match(s, i):
                    break
            i += 1
    return False


def assert_read_only(sql: str, policy: GuardPolicy = GuardPolicy()) -> None:
    if not _READ_START.search(sql):
        _reject("⛔ عملیات مجاز نیست: فقط SELECT.")
    for p in policy.blocked:
        if _re(p, I).search(sql):
            _reject("⛔ عملیات مجاز نیست: دستور غیرمجاز.")
    if any(t in sql for t in policy.forbidden_tokens):
        _reject("⛔ عملیات مجاز نیست: کاراکتر غیرمجاز.")
    if has_implicit_comma_join(sql):
        _reject("⛔ فقط سینتکس JOIN صریح مجاز است (نه کاما در FROM).")
    if has_unchecked_table_source(sql):
        _reject("⛔ بعد از FROM یا JOIN فقط نام جدول یا یک زیرکوئری (SELECT ...) مجاز است.")


# ---------- 1-7. mandatory row cap ----------
_SELECT_WORD = _re(r"select\b", I)          # .match(s, i)
_SELECT_TOP_WORD = _re(r"select\s+top\b", I)
_IDENT_CHAR = _re(r"[A-Za-z0-9_\]]")


def inject_top(s: str, n: int) -> str:
    """TOP n on the outermost SELECT; a query that already has TOP keeps it."""
    if _SELECT_TOP.search(s):
        return s
    if _SELECT.search(s):
        return _js_replace(_SELECT, s, f"SELECT TOP {n}", count=1)
    # WITH ...: the first SELECT at depth 0 is the main query
    depth, quote = 0, None
    for i, ch in enumerate(s):
        if quote:
            if ch == quote:
                quote = None
            continue
        if ch in ("'", '"'):
            quote = ch
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif depth == 0 and ch in ("s", "S") and _SELECT_WORD.match(s, i):
            before = " " if i == 0 else s[i - 1]
            if _IDENT_CHAR.search(before):
                continue
            if _SELECT_TOP_WORD.match(s, i):
                return s
            return s[:i] + f"SELECT TOP {n}" + s[i + 6:]
    return s


# ---------- 1-8. only the entities the model was shown ----------
# quoted identifiers "..." are accepted as well as [...]
IDENT = r'(?:\[[^\]]+\]|"[^"]+"|[A-Za-z0-9_]+)'
_STRIP_BRACKETS = _re(r"^\[|\]$")
_STRIP_DQUOTES = _re(r'^"|"$')
_CTE = _re(r"(?:\bwith\b|,)\s*(" + IDENT + r")\s+as\s*\(", I)
# «JOIN[dbo].[Secret]» and «FROM"Secret"» (no whitespace) are references too
_REF = _re(r"\b(?:from|join)(?:\s+|(?=[\[\"]))(" + IDENT + r"(?:\." + IDENT + r"){0,2})", I)
_PART = _re(IDENT)                    # a dot inside [...] is not a separator
_STARTS_WORD = _re(r"^\w")
_ENDS_WORD = _re(r"\w$")
_JS_REGEX_SPECIAL = set(".*+?^${}()|[]\\")


def strip_quotes(t: str) -> str:
    return _STRIP_DQUOTES.sub("", _STRIP_BRACKETS.sub("", t))


def model_cte_names(sql: str) -> set[str]:
    """Lower-cased names of the CTEs the model defined in its own WITH."""
    return {strip_quotes(m.group(1)).lower() for m in _CTE.finditer(sql)}


def _escape(text: str) -> str:
    # literal text; same characters as the JS escapeRe, plus anything Python would read specially
    return "".join("\\" + c if c in _JS_REGEX_SPECIAL else re.escape(c) for c in text)


def resolve_references(sql: str, entity_defs: Mapping[str, EntityDef],
                       log: Callable[[str], None] = lambda _m: None) -> tuple[str, list[str]]:
    """Every FROM/JOIN must name an allowed catalog entity (or a one-part model CTE).

    Multi-part names ([schema].[table], [db].[schema].[table]) are never a model CTE (CTEs are one-part):
    an entity like Fact_Invoice reads [PRC].[Fact_Invoice_2] while an older physical [PRC].[Fact_Invoice]
    exists, and WITH [Fact_Sales] AS (...) SELECT * FROM [dbo].[Fact_Sales] would otherwise read any table.
    A qualified name whose last part is an allowed entity is rewritten to that entity's CTE; else rejected.
    Returns the rewritten SQL and the referenced entity names (lower-cased, first-seen order).
    """
    allowed = {n.lower() for n in _js_keys(entity_defs)}
    cte_names = model_cte_names(sql)

    # a model CTE named like a catalog entity would replace (shadow) it with any source the model likes
    if any(cn in allowed for cn in cte_names):
        _reject("⛔ نام‌گذاری غیرمجاز: نام CTE با یک موجودیت کاتالوگ تداخل دارد.")

    referenced: dict[str, None] = {}        # ordered set
    qualified: dict[str, str] = {}          # multi-part text -> [entity]
    for m in _REF.finditer(sql):
        parts = _PART.findall(m.group(1))
        last = strip_quotes(parts[-1])
        nm = last.lower()
        if len(parts) == 1 and nm in cte_names:
            continue                         # the model's own harmless CTE
        if nm not in allowed:
            _reject("⛔ اجرای این دستور خارج از حیطه دسترسی شماست.")
        if len(parts) > 1:
            qualified[m.group(1)] = f"[{last}]"
        referenced[nm] = None
    if not referenced:
        _reject("⛔ کوئری تولیدشده به هیچ موجودیت معتبری ارجاع ندارد.")

    # every occurrence (FROM/JOIN and column prefixes like [PRC].[Fact_Invoice].[NetPrice]) becomes the CTE
    # name; longest first so a three-part name is never half replaced; identifier boundaries are kept so
    # dbo.Fact_Employee does not touch dbo.Fact_EmployeeX. Case-sensitive, like the JS.
    out = sql
    for text, repl in sorted(qualified.items(), key=lambda kv: -_utf16_len(kv[0])):
        pattern = ((r"(?<![\w.\]])" if _STARTS_WORD.search(text) else "") + _escape(text)
                   + (r"(?!\w)" if _ENDS_WORD.search(text) else ""))
        out = _js_replace(_re(pattern), out, repl)
        log("QUALIFIED NAME REWRITTEN | " + text + " -> " + repl)
    return out, list(referenced)


# ---------- 1-9. one CTE per referenced entity, exposing only its allowed columns ----------
# Each kind has its own builder; a new kind is a new entry. An unknown kind is rejected, never assumed a table.
def _table_cte(d: EntityDef, name: str) -> str:
    if not d.source:
        _reject(f"⛔ منبع موجودیت [{name}] در کاتالوگ تعریف نشده است.")
    cols = [f"[{c}] AS [{a}]" if a else f"[{c}]" for c, a in (d.columns or ())]
    return f"[{d.name}] AS (SELECT {', '.join(cols)} FROM {d.source})"


def _virtual_cte(d: EntityDef, name: str) -> str:
    if not d.sql:
        _reject(f"⛔ تعریف موجودیت [{name}] در کاتالوگ ناقص است.")
    return f"[{d.name}] AS (\n{d.sql}\n)"


CTE_BUILDERS: dict[str, Callable[[EntityDef, str], str]] = {"table": _table_cte, "virtual": _virtual_cte}


def build_entity_ctes(entity_defs: Mapping[str, EntityDef], referenced: Iterable[str],
                      builders: Mapping[str, Callable[[EntityDef, str], str]] = CTE_BUILDERS) -> list[str]:
    wanted = set(referenced)
    parts = []
    for name in _js_keys(entity_defs):
        if name.lower() not in wanted:
            continue
        d = entity_defs[name]
        builder = builders.get(d.kind or "table")
        if builder is None:
            _reject(f"⛔ نوع موجودیت [{name}] («{d.kind}») پشتیبانی نمی‌شود.")
        parts.append(builder(d, name))
    return parts


# ---------- 1-10. catalog CTEs merged with the model's own WITH ----------
_WITH = _re(r"^\s*with\b", I)


def merge_with_model_sql(cte_parts: list[str], sql: str) -> str:
    prefix = "WITH " + ",\n".join(cte_parts)
    return prefix + _WITH.sub(",\n", sql, count=1) if _WITH.search(sql) else prefix + "\n" + sql


# ==================== 2. composition ====================
class SqlGuard:
    def __init__(self, policy: GuardPolicy = GuardPolicy(), log: Callable[[str], None] | None = None):
        self.policy = policy
        self.log = log or (lambda _m: None)

    def secure(self, response: str | dict, entity_defs: dict[str, EntityDef]) -> GuardedSql:
        envelope = parse_envelope(response, extract_response_text(response, self.policy), self.policy)
        sql = extract_sql(envelope.body)
        reject_if_not_supported(sql, envelope.understood)
        sql = limit_to_top(sql)
        assert_read_only(sql, self.policy)
        sql = inject_top(sql, self.policy.row_cap)

        model_sql, referenced = resolve_references(sql, entity_defs, self.log)
        final_sql = merge_with_model_sql(build_entity_ctes(entity_defs, referenced), model_sql)
        return GuardedSql(sql=final_sql, model_sql=model_sql, entities=referenced,
                          understood=envelope.understood, plan=envelope.plan, thinking=envelope.thinking)
