"""The answer the user sees: query rows -> Markdown table + chart image (QuickChart), and error -> message.

Ported from the n8n Code nodes "Format Answer" and "ErrorFormat"; the text is the same, byte for byte.
  format_answer - think block (the model's reasoning) + Markdown table + chart image link
  format_error  - a message written for users (⛔ ...) as it is; a technical message only for who may see it

The JavaScript did a few things Python does differently by default, so they are spelled out here:
  numbers in the table  - toLocaleString('en-US'): 1,234,567 and at most 2 decimals, half away from zero
  the chart config      - JSON.stringify: no spaces, Persian not escaped, 10 not 10.0, -0 -> 0
  the chart URL         - encodeURIComponent
  lengths and slices    - counted in UTF-16 code units, like JavaScript strings
  row values            - True/False/None are shown as JavaScript shows true/false/null
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Callable
from urllib.parse import quote

from . import jsre
from .text import js_trim

__all__ = ["ChartSettings", "format_answer", "format_error", "markdown_table", "chart_columns", "chart_type",
           "chart_points", "pie_chart", "line_chart", "bar_chart", "CHART_BUILDERS", "chart_url", "chart_for"]

_PALETTE = ("#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948",
            "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC", "#86BCB6", "#D37295")


@dataclass(frozen=True)
class ChartSettings:
    auto_chart: bool = True        # draw a chart even when the user did not ask for one
    max_table: int = 50            # rows shown in the table
    max_chart: int = 20            # points in a chart (lowered per chart type below)
    chart_limits: dict[str, int] = field(default_factory=lambda: {"pie": 8, "line": 15, "bar": 20})
    row_cap: int = 200             # the SQL guard's row cap: a result this long was probably cut
    # QuickChart as the user's browser sees it (the browser loads the image, not the server)
    base_url: str = "http://localhost:3001"
    palette: tuple[str, ...] = _PALETTE


DEFAULT_SETTINGS = ChartSettings()

_MISSING = object()   # a column the row does not have (JavaScript's undefined, which is not null)


# ---------------------------------------------------------------- JavaScript semantics
def _utf16(s: str) -> bytes:
    return s.encode("utf-16-le", "surrogatepass")


def js_len(s: str) -> int:
    """String.length: UTF-16 code units (an emoji counts 2)."""
    return len(_utf16(s)) // 2


def js_slice(s: str, start: int, end: int) -> str:
    """String.slice(start, end) in UTF-16 code units; a cut emoji leaves a lone surrogate, as in JavaScript."""
    return _utf16(s)[2 * start:2 * end].decode("utf-16-le", "surrogatepass")


def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _js_number_string(x: int | float) -> str:
    """Number.prototype.toString / JSON.stringify for a number (JSON gives null for NaN and Infinity)."""
    if isinstance(x, int):
        if abs(x) < 10 ** 21:
            return str(x)
        x = float(x)
    if math.isnan(x):
        return "NaN"
    if math.isinf(x):
        return "Infinity" if x > 0 else "-Infinity"
    if x == 0:
        return "0"                                         # also -0
    sign = "-" if x < 0 else ""
    _, digit_tuple, exp = Decimal(repr(abs(x))).normalize().as_tuple()
    digits = "".join(map(str, digit_tuple))                # shortest round-trip digits, like JavaScript
    k = len(digits)
    n = k + exp                                            # value = 0.digits * 10**n
    if k <= n <= 21:
        out = digits + "0" * (n - k)
    elif 0 < n <= 21:
        out = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        out = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        out = digits[0] + ("." + digits[1:] if k > 1 else "") + "e" + ("+" if e >= 0 else "-") + str(abs(e))
    return sign + out


def js_string(v: Any) -> str:
    """String(v)."""
    if v is None:
        return "null"
    if v is _MISSING:
        return "undefined"
    if isinstance(v, bool):
        return "true" if v else "false"
    if _is_number(v):
        return _js_number_string(v)
    if isinstance(v, str):
        return v
    if isinstance(v, (list, tuple)):
        return ",".join("" if x is None or x is _MISSING else js_string(x) for x in v)
    if isinstance(v, dict):
        return "[object Object]"
    return str(v)


_JSON_ESCAPES = {'"': '\\"', "\\": "\\\\", "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t"}
_JSON_SPECIAL = re.compile('["\\\\\x00-\x1f\ud800-\udfff]')


def _json_string(s: str) -> str:
    return '"' + _JSON_SPECIAL.sub(lambda m: _JSON_ESCAPES.get(m.group(), f"\\u{ord(m.group()):04x}"), s) + '"'


def js_json(v: Any) -> str:
    """JSON.stringify(v) for plain data (dict keys keep their order)."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if _is_number(v):
        return "null" if isinstance(v, float) and not math.isfinite(v) else _js_number_string(v)
    if isinstance(v, str):
        return _json_string(v)
    if isinstance(v, (list, tuple)):
        return "[" + ",".join(js_json(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ",".join(_json_string(str(k)) + ":" + js_json(x) for k, x in v.items()) + "}"
    raise TypeError(f"cannot serialise {type(v).__name__}")


def encode_uri_component(s: str) -> str:
    return quote(s, safe="-_.!~*'()")


def _js_round(x: float) -> float:
    """Math.round: halves go up (towards +infinity)."""
    if not math.isfinite(x):
        return x
    f = math.floor(x)
    r = f + 1 if x - f >= 0.5 else f
    return -0.0 if r == 0 and (x < 0 or math.copysign(1, x) < 0) else float(r)


def _js_keys(row: dict) -> list[str]:
    """Object.keys: integer-like keys first, in ascending order, then the others in insertion order."""
    def is_index(k: str) -> bool:
        return k.isascii() and k.isdigit() and (k == "0" or k[0] != "0") and int(k) < 2 ** 32 - 1
    keys = [str(k) for k in row]
    return sorted((k for k in keys if is_index(k)), key=int) + [k for k in keys if not is_index(k)]


def _cell(row: dict, col: str) -> Any:
    return row.get(col, _MISSING)


# ---------------------------------------------------------------- helpers
_DECIMAL_NUMBER = jsre.compile(r"^-?\d+(\.\d+)?$")
_ISO_DATETIME = jsre.compile(r"^\d{4}-\d{2}-\d{2}T")
_NEWLINE = re.compile(r"\r?\n")
_SPACES = jsre.compile(r"\s+")
_LIST_PUNCT = re.compile(r"[\[\],;]")


def md_safe(s: Any) -> str:
    """Text with | or a line break would break the Markdown table."""
    return _NEWLINE.sub(" ", js_string(s).replace("|", "\\|"))


def _color_at(i: int, settings: ChartSettings) -> str:
    return settings.palette[i % len(settings.palette)]


def to_num(v: Any) -> float | None:
    """A number, or a numeric string like '1,234.5'; anything else is None."""
    if v is None or v is _MISSING or v == "":
        return None
    if _is_number(v):
        return float(v) if math.isfinite(v) else None
    s = js_trim(js_string(v)).replace(",", "")
    if not _DECIMAL_NUMBER.search(s):
        return None
    n = float(s)
    return n if math.isfinite(n) else None


def locale_number(v: int | float) -> str:
    """Number.prototype.toLocaleString('en-US'); non-integers with at most 2 decimals."""
    if isinstance(v, float):
        if math.isnan(v):
            return "NaN"
        if math.isinf(v):
            return "∞" if v > 0 else "-∞"
    if isinstance(v, int):
        return format(v, ",")
    d = Decimal(repr(v))                                   # the shortest decimal, as ICU rounds it
    if v.is_integer():
        return format(d, ",.0f")
    text = format(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ",f")
    return text.rstrip("0").rstrip(".")


def fmt_cell(v: Any) -> str:
    if v is None or v is _MISSING:
        return ""
    if _is_number(v):
        return locale_number(v)
    s = js_string(v)
    if _ISO_DATETIME.search(s):
        return js_slice(s, 0, 10)
    return md_safe(s)


def clean(v: Any) -> str:
    s = "" if v is None or v is _MISSING else js_string(v)
    return js_trim(_SPACES.sub(" ", _LIST_PUNCT.sub(" ", s)))


def safe_title(v: Any) -> str:
    s = "" if v is None or v is _MISSING else js_string(v)
    return js_slice(clean(s.replace(":", " ")), 0, 70)


# ---------------------------------------------------------------- 1. Markdown table
def markdown_table(rows: list[dict], cols: list[str], settings: ChartSettings = DEFAULT_SETTINGS) -> str:
    shown = rows[:settings.max_table]
    md = "| " + " | ".join(md_safe(c) for c in cols) + " |\n"
    md += "| " + " | ".join("---" for _ in cols) + " |\n"
    for r in shown:
        md += "| " + " | ".join(fmt_cell(_cell(r, c)) for c in cols) + " |\n"
    if len(rows) >= settings.row_cap:
        md += (f"\n_نتیجه به {settings.row_cap} ردیف محدود شده و ممکن است ردیف‌های بیشتری وجود داشته باشد؛ "
               "برای نتیجه کامل سوال را محدودتر بپرسید (مثلاً «۲۰ مورد اول» یا یک بازه زمانی)._\n")
    elif len(rows) > len(shown):
        md += f"\n_{len(rows)} ردیف یافت شد، {len(shown)} ردیف اول نمایش داده شده._\n"
    return md


# ---------------------------------------------------------------- 2. which column is the value, which the label
@dataclass(frozen=True)
class ChartColumns:
    value_col: str | None
    label_cols: list[str]
    is_temporal: bool


_TEMPORAL = jsre.compile(r"date|month|year|day|quarter|week|period|تاریخ|ماه|سال|روز|فصل|هفته|دوره", jsre.I)


def chart_columns(rows: list[dict], cols: list[str]) -> ChartColumns:
    numeric = [c for c in cols
               if any(to_num(_cell(r, c)) is not None for r in rows)
               and all(_cell(r, c) is None or to_num(_cell(r, c)) is not None for r in rows)]
    value_col = numeric[-1] if numeric else None
    label_cols = [c for c in cols if c != value_col][:3]
    is_temporal = any(_TEMPORAL.search(c) for c in label_cols)
    return ChartColumns(value_col, label_cols, is_temporal)


# ---------------------------------------------------------------- 3. chart type: what the user asked, else the data's shape
_ASKS_PIE = jsre.compile(r"دایره|پای|کیک|سهم|\bpie\b", jsre.I)
_ASKS_LINE = jsre.compile(r"خطی|روند|تغییرات|\btrend\b|\bline\b", jsre.I)
_ASKS_BAR = jsre.compile(r"میله|ستون|\bbar\b|\bcolumn\b", jsre.I)
_ASKS_CHART = jsre.compile(r"نمودار|چارت|\bchart\b|\bgraph\b|رسم", jsre.I)


def chart_type(question: str, row_count: int, is_temporal: bool,
               settings: ChartSettings = DEFAULT_SETTINGS) -> str | None:
    if _ASKS_PIE.search(question):
        return "pie"
    if _ASKS_LINE.search(question):
        return "line"
    if _ASKS_BAR.search(question):
        return "bar"
    if _ASKS_CHART.search(question) or settings.auto_chart:
        if is_temporal:
            return "line"
        if row_count <= 6:
            return "pie"
        return "bar"
    return None


# ---------------------------------------------------------------- points: one per row
@dataclass(frozen=True)
class Point:
    label: str
    value: float


def chart_points(rows: list[dict], columns: ChartColumns, cap: int) -> list[Point]:
    """One point per row (in the query's ORDER BY order); [] when a label repeats."""
    data = []
    for r in rows:
        label = js_slice(" ".join(x for x in (clean(fmt_cell(_cell(r, c))) for c in columns.label_cols) if x), 0, 40)
        num = to_num(_cell(r, columns.value_col))
        data.append(Point(label, _js_round((0.0 if num is None else num) * 100) / 100))
    data = [d for d in data if d.label][:cap]
    return data if len({d.label for d in data}) == len(data) else []


# ---------------------------------------------------------------- 4. Chart.js config per type
@dataclass(frozen=True)
class Chart:
    config: dict
    width: int
    height: int


def _title_plugin(title: str) -> dict:
    return {"display": True, "text": title, "font": {"size": 18}}


def pie_chart(data: list[Point], title: str, value_col: str,
              settings: ChartSettings = DEFAULT_SETTINGS) -> Chart | None:
    """None when fewer than two slices are positive."""
    positive = [d for d in data if d.value > 0]
    if len(positive) < 2:
        return None
    return Chart({
        "type": "pie",
        "data": {
            "labels": [d.label for d in positive],
            "datasets": [{"data": [d.value for d in positive],
                          "backgroundColor": [_color_at(i, settings) for i in range(len(positive))]}],
        },
        "options": {"plugins": {"title": _title_plugin(title),
                                "legend": {"position": "right", "labels": {"font": {"size": 13}}}}},
    }, 640, 480)


def line_chart(data: list[Point], title: str, value_col: str,
               settings: ChartSettings = DEFAULT_SETTINGS) -> Chart:
    labels = [d.label for d in data]
    return Chart({
        "type": "line",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": safe_title(value_col),
                "data": [d.value for d in data],
                "borderColor": _color_at(0, settings),
                "backgroundColor": _color_at(0, settings),
                "pointBackgroundColor": [_color_at(i, settings) for i in range(len(labels))],
                "pointRadius": 4,
                "tension": 0.25,
                "fill": False,
            }],
        },
        "options": {
            "plugins": {"title": _title_plugin(title), "legend": {"display": False}},
            "scales": {"x": {"ticks": {"font": {"size": 13}}},
                       "y": {"title": {"display": True, "text": safe_title(value_col)}, "beginAtZero": True}},
        },
    }, min(1200, max(650, len(data) * 70)), 460)


def bar_chart(data: list[Point], title: str, value_col: str,
              settings: ChartSettings = DEFAULT_SETTINGS) -> Chart:
    labels = [d.label for d in data]
    # horizontal bars read better with long or many labels
    avg_label_len = sum(js_len(label) for label in labels) / len(labels)
    horizontal = len(data) > 8 or avg_label_len > 14
    value_axis = {"title": {"display": True, "text": safe_title(value_col)}, "beginAtZero": True}
    scales = ({"x": value_axis, "y": {"ticks": {"autoSkip": False, "font": {"size": 13}}}} if horizontal
              else {"x": {"ticks": {"font": {"size": 12}}}, "y": value_axis})
    return Chart({
        "type": "bar",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": safe_title(value_col),
                "data": [d.value for d in data],
                "backgroundColor": [_color_at(i, settings) for i in range(len(labels))],
                "borderRadius": 4,
            }],
        },
        "options": {
            "indexAxis": "y" if horizontal else "x",
            "plugins": {"title": _title_plugin(title), "legend": {"display": False}},
            "scales": scales,
        },
    }, 760 if horizontal else min(1300, max(650, len(data) * 80)),
        min(1200, max(420, len(data) * 38 + 110)) if horizontal else 460)


CHART_BUILDERS: dict[str, Callable[..., Chart | None]] = {"pie": pie_chart, "line": line_chart, "bar": bar_chart}


# ---------------------------------------------------------------- 5. chart image URL
def chart_url(chart: Chart, settings: ChartSettings = DEFAULT_SETTINGS) -> str:
    params = {
        "c": js_json(chart.config),
        "w": str(chart.width),
        "h": str(chart.height),
        "backgroundColor": "white",
        "version": "4",
        "devicePixelRatio": "2",
    }
    qs = "&".join(f"{encode_uri_component(k)}={encode_uri_component(v)}" for k, v in params.items())
    return f"{settings.base_url}/chart?{qs}"


@dataclass(frozen=True)
class ChartPart:
    markdown: str   # the image link, or ''
    note: str       # '' unless the chart shows only the first rows


def chart_for(question: str, rows: list[dict], cols: list[str],
              settings: ChartSettings = DEFAULT_SETTINGS) -> ChartPart:
    columns = chart_columns(rows, cols)
    kind = chart_type(question, len(rows), columns.is_temporal, settings)
    cap = min(settings.max_chart, (settings.chart_limits.get(kind) if kind else None) or settings.max_chart)
    note = (f"\n_نمودار برای خوانایی بیشتر به {cap} ردیف اول محدود شده است (از مجموع {len(rows)} ردیف)._\n"
            if len(rows) > cap and kind else "")
    if not kind or not columns.value_col or not columns.label_cols or len(rows) < 2:
        return ChartPart("", note)
    data = chart_points(rows, columns, cap)
    if len(data) < 2:
        return ChartPart("", note)
    title = (safe_title(question)
             or safe_title(f"{columns.value_col} بر اساس {' و '.join(columns.label_cols)}"))
    chart = CHART_BUILDERS[kind](data, title, columns.value_col, settings)
    return ChartPart(f"\n![{title}]({chart_url(chart, settings)})\n" if chart else "", note)


# ---------------------------------------------------------------- the answer
def format_answer(rows: list[dict], question: str, thinking: str = "",
                  settings: ChartSettings = DEFAULT_SETTINGS) -> str:
    """The Markdown answer for Open WebUI. An empty row ({}) is not a row."""
    rows = [r for r in rows if r]
    thinking = js_trim(thinking or "")
    think_block = f"<think>\n{thinking}\n</think>\n\n" if thinking else ""
    if not rows:
        return think_block + "نتیجه‌ای یافت نشد."
    cols = _js_keys(rows[0])
    chart = chart_for(question or "", rows, cols, settings)
    return think_block + markdown_table(rows, cols, settings) + chart.note + chart.markdown


# ---------------------------------------------------------------- errors
GENERIC_ERROR = ("⛔ در پردازش درخواست شما خطایی رخ داد.\n\n"
                 "لطفاً سوال را به شکل دیگری بپرسید. اگر تکرار شد با واحد فناوری اطلاعات تماس بگیرید.")
_LINE_SUFFIX = jsre.compile(r"\s*\[line \d+\]\s*$", jsre.I)


def strip_line_suffix(message: str) -> str:
    """The raw error message without n8n's ' [line N]' suffix."""
    return js_trim(_LINE_SUFFIX.sub("", message or "", count=1))


def format_error(error_text: str, see_details: bool) -> str:
    """Messages written for users (⛔ ...) are always shown; technical ones only with see_details."""
    raw = strip_line_suffix(error_text)
    return raw if raw.startswith("⛔") or (see_details and raw) else GENERIC_ERROR
