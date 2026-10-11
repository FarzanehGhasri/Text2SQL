"""Stored values named in the question (value retrieval, CHESS / CodeS).

A question that names a value («دفتر فروش تهران», «باطل شده») is only answered right when the model knows the
exact stored spelling (and, for dimensions, its key); otherwise it guesses and the result is empty.
The index holds the distinct values of the catalog's text columns, read from the database by the service
(read-only login) - real data, so it lives in data/, never in the vault or in git.

  exact match   - a whole stored value appears in the question (on word boundaries)
  partial match - a 1..MAX_NGRAM word phrase of the question appears inside stored values; a single word only
                  when it is rare (in at most RARE_DF values), so «شرکت» alone matches nothing
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ..text import value_norm


@dataclass(frozen=True)
class ValueSettings:
    min_chars: int = 3
    max_ngram: int = 4
    rare_df: int = 20
    max_lines: int = 8
    per_column: int = 3
    per_value: int = 2              # a bank name repeated in 7 cash-flow tables is shown in at most 2
    exact_weight: float = 3
    partial_weight: float = 1
    sample_max_distinct: int = 25   # columns with this many values or fewer show samples in the DDL
    sample_count: int = 4


STOPWORDS = frozenset(["برای", "این", "آن", "است", "هست", "بود", "شده", "چند", "چه", "کدام", "جمع", "تعداد", "مبلغ",
                       "سال", "ماه", "نام", "اساس", "تفکیک", "نشان", "بده", "چقدر", "همه", "کنار", "بیشترین", "کمترین"])


@dataclass(frozen=True)
class ValueColumn:
    entity: str
    column: str
    key: str | None
    distinct: int
    values: tuple[tuple, ...]       # (value, rows, key value, normalised form or None)


@dataclass(frozen=True)
class ValueIndex:
    columns: tuple[ValueColumn, ...] = ()
    prebuilt: bool = True           # normalised forms stored with the values (format 1)

    @classmethod
    def from_json(cls, data: dict | None) -> "ValueIndex":
        if not data:
            return cls()
        cols = tuple(ValueColumn(c["entity"], c["column"], c.get("key") or None,
                                 c.get("distinct") or len(c.get("values") or []),
                                 tuple(tuple(v) + (None,) * (4 - len(v)) for v in c.get("values") or []))
                     for c in data.get("columns") or [])
        try:
            prebuilt = float(data.get("formatVersion") or 0) >= 1
        except (TypeError, ValueError):
            prebuilt = False
        return cls(cols, prebuilt)


@dataclass(eq=False)
class _Column:
    entity: str
    column: str
    key: str | None
    distinct: int
    values: list = field(default_factory=list)


@dataclass(eq=False)                # identity, like the JavaScript objects
class _Entry:
    col: _Column
    v: str
    rows: int
    key: object
    n: str


@dataclass(frozen=True)
class ValueLine:
    entity: str
    column: str
    key: str | None
    exact: bool
    value: str | None = None        # exact
    key_value: object = None
    phrase: str | None = None       # partial
    count: int = 0
    samples: tuple[str, ...] = ()


class ValueLookup:
    """The allowed columns' values, as one text ('\\n v \\n v \\n') so each question word is one find()."""

    def __init__(self, index: ValueIndex, allowed, settings: ValueSettings = ValueSettings()):
        self.s = settings
        self.cols: list[_Column] = []
        self.entries: list[_Entry] = []
        self.starts: list[int] = []
        self.by_norm: dict[str, list[_Entry]] = {}
        segs, pos = ["\n"], 1
        for c in index.columns:
            table = allowed.get(c.entity)
            if table is None or not any(x.name == c.column for x in table.exposed_columns):
                continue
            col = _Column(c.entity, c.column, c.key, c.distinct)
            self.cols.append(col)
            for v, rows, key, n in c.values:
                normed = n if n is not None else (str(v).strip() if index.prebuilt else value_norm(v))
                if len(normed) < settings.min_chars:
                    continue
                e = _Entry(col, str(v), rows or 0, key, normed)
                col.values.append(e)
                self.entries.append(e)
                self.by_norm.setdefault(normed, []).append(e)
                self.starts.append(pos)
                seg = " " + normed + " \n"
                segs.append(seg)
                pos += len(seg)
        self.text = "".join(segs)

    def _entry_at(self, offset: int) -> int:
        lo, hi = 0, len(self.starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) >> 1
            if self.starts[mid] <= offset:
                lo = mid
            else:
                hi = mid - 1
        return lo

    def containing(self, phrase: str, limit: int) -> list[_Entry]:
        needle = " " + phrase + " "
        out: dict[int, None] = {}
        i = self.text.find(needle)
        while i != -1 and len(out) < limit:
            out[self._entry_at(i)] = None
            i = self.text.find(needle, i + 1)
        return [self.entries[k] for k in out]

    def samples(self) -> dict[str, list[str]]:
        """'entity|column' -> a few values, for low-cardinality columns (status, type, gender...)."""
        return {f"{c.entity}|{c.column}": [x.v for x in c.values[:self.s.sample_count]]
                for c in self.cols if c.distinct <= self.s.sample_max_distinct}

    # ------------------------------------------------------------------ matching
    def match(self, question: str) -> list[ValueLine]:
        s = self.s
        if not self.entries:
            return []
        words = [w for w in value_norm(question).split(" ") if w]
        hits_of = {w: (None if w in STOPWORDS else self.containing(w, s.rare_df + 1)) for w in dict.fromkeys(words)}

        def is_rare(w):
            h = hits_of.get(w)
            return bool(h) and 0 < len(h) <= s.rare_df

        exact: list[_Entry] = []
        exact_set: set[int] = set()
        partial: list[tuple[str, list[_Entry]]] = []
        for n in range(min(8, len(words)), 0, -1):
            for i in range(0, len(words) - n + 1):
                gram = words[i:i + n]
                p = " ".join(gram)
                if len(p) < s.min_chars:
                    continue
                if n > 1 or is_rare(p):
                    for e in self.by_norm.get(p, []):
                        if id(e) not in exact_set:
                            exact_set.add(id(e))
                            exact.append(e)
                # partial: a phrase with a rare word, not part of a value already matched whole
                # («دفتر فروش» inside «دفتر فروش تهران» must not bring «دفتر فروش تبریز»)
                if n > s.max_ngram or any(g[0] == p for g in partial):
                    continue
                if any((" " + e.n + " ").find(" " + p + " ") != -1 for e in exact):
                    continue
                rare = [w for w in gram if is_rare(w)]
                if not rare:
                    continue
                needle = " " + p + " "
                pool = list(dict.fromkeys(e for w in rare for e in hits_of[w]))
                hits = [e for e in pool if id(e) not in exact_set and needle in " " + e.n + " "]
                if hits:
                    partial.append((p, hits))

        lines: list[ValueLine] = []
        per_value: dict[str, int] = {}
        per_column: dict[str, int] = {}

        def take(c: _Column, value_key: str | None) -> bool:
            ck = c.entity + "|" + c.column
            if per_column.get(ck, 0) >= s.per_column:
                return False
            if value_key and per_value.get(value_key, 0) >= s.per_value:
                return False
            per_column[ck] = per_column.get(ck, 0) + 1
            if value_key:
                per_value[value_key] = per_value.get(value_key, 0) + 1
            return True

        # whole values first: longer, then smaller columns (dimensions before facts), then more frequent
        exact.sort(key=lambda e: (-len(e.n), e.col.distinct, -e.rows))
        for e in exact:
            if len(lines) >= s.max_lines:
                break
            if not take(e.col, e.n):
                continue
            lines.append(ValueLine(e.col.entity, e.col.column, e.col.key, True, value=e.v, key_value=e.key))

        # partial: one line per column/phrase with a few samples; a phrase inside a longer found phrase of the
        # same column is not repeated
        groups = []
        for phrase, hits in partial:
            by_col: dict[_Column, list[_Entry]] = {}
            for e in hits:
                by_col.setdefault(e.col, []).append(e)
            for col, col_hits in by_col.items():
                if any(g["col"] is col and phrase in g["phrase"] for g in groups):
                    continue
                col_hits.sort(key=lambda e: -e.rows)
                groups.append({"col": col, "phrase": phrase, "hits": col_hits,
                               "cover": max(len(phrase) / len(e.n) for e in col_hits)})
        groups.sort(key=lambda g: (-len(g["phrase"]), -g["cover"], g["col"].distinct))
        for g in groups:
            if len(lines) >= s.max_lines:
                break
            if not take(g["col"], "phrase:" + g["phrase"]):
                continue
            hits = g["hits"]
            lines.append(ValueLine(g["col"].entity, g["col"].column, g["col"].key, False, phrase=g["phrase"],
                                   count=len(hits), samples=tuple(e.v for e in hits[:s.per_column]),
                                   key_value=hits[0].key if len(hits) == 1 else None))
        return lines
