"""The value index: distinct stored values of the catalog's text columns, read from the warehouse.

Which columns: exposed text columns that hold names, not codes/numbers/dates/keys and not free text (except a
small lookup table whose only text column is its "description" - the HR dimensions). Same rule as before.

How (database view): one bounded query per column with the READ-ONLY login, TOP (max+1) so a free-text-like
column is detected and skipped without moving its data; one failing column (renamed, no permission) is logged
and skipped, the others still load. Real data (customer, supplier and staff names): stored in data/values.json,
never in the vault or git. Refreshed every Settings -> Values -> refresh_hours.
"""
from __future__ import annotations

import csv
import io
import json
import logging
import os
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from .model import Catalog, Column, Table
from .retrieval.values import ValueIndex
from .text import value_norm

log = logging.getLogger(__name__)

FORMAT_VERSION = 1
TEXT_TYPES = {"nvarchar", "varchar", "nchar", "char"}
NOT_A_VALUE = re.compile(r"code|number|serial|sayad|shomare|date|_key$|^key$|ref$|_en$|شماره|کد|تاریخ", re.I)
NOT_A_VALUE_DESC = re.compile(r"^\s*(کد|شماره|کلید)")
FREE_TEXT = re.compile(r"desc|decription|descreption|specification|شرح|توضیحات", re.I)
LOOKUP_MAX_COLUMNS = 3


@dataclass(frozen=True)
class ValueColumn:
    entity: str
    source: str
    column: str
    key: str | None          # the dimension key other tables join to: a value can be given as its key


def _candidate(c: Column) -> bool:
    return (c.exposed and (c.type or "").lower() in TEXT_TYPES and not NOT_A_VALUE.search(c.name)
            and not NOT_A_VALUE_DESC.search(c.description_fa or ""))


def value_columns(catalog: Catalog) -> list[ValueColumn]:
    keys: dict[str, str | None] = {}
    for j in catalog.joins:
        k = keys.get(j.to_table, "<unset>")
        keys[j.to_table] = j.to_column if k in ("<unset>", j.to_column) else None
    out = []
    for t in catalog.tables:
        if (t.kind or "table") != "table" or not t.source:
            continue
        candidates = [c for c in t.columns if _candidate(c)]
        for c in candidates:
            free = FREE_TEXT.search(c.name) or FREE_TEXT.search(c.description_fa or "")
            if not free or (len(candidates) == 1 and len(t.columns) <= LOOKUP_MAX_COLUMNS):
                out.append(ValueColumn(t.name, t.source, c.name, keys.get(t.name) or None))
    return out


def _ident(s: str) -> str:
    return "[" + s.replace("]", "]]") + "]"


def column_query(vc: ValueColumn, max_distinct: int) -> str:
    """Distinct values of one column, most frequent first; the key only when the value maps to one key."""
    c = _ident(vc.column)
    key = (f"CASE WHEN COUNT(DISTINCT {_ident(vc.key)}) = 1 THEN CAST(MIN({_ident(vc.key)}) AS nvarchar(100)) END"
           if vc.key else "CAST(NULL AS nvarchar(100))")
    return (f"SELECT TOP ({max_distinct + 1}) CAST({c} AS nvarchar(400)) AS value, COUNT_BIG(*) AS [rows], {key} AS key_value "
            f"FROM {vc.source} WHERE {c} IS NOT NULL AND LTRIM(RTRIM(CAST({c} AS nvarchar(400)))) <> N'' "
            f"GROUP BY {c} ORDER BY COUNT_BIG(*) DESC OPTION (MAXDOP 1)")


def build_index(rows: Iterable[dict], catalog: Catalog, max_per_column: int = 5000) -> dict:
    """rows: {entity, column, value, rows, key_value} -> the index JSON (same format as before)."""
    exposed = {(t.name, c.name) for t in catalog.tables for c in t.exposed_columns}
    key_of = {(v.entity, v.column): v.key for v in value_columns(catalog)}
    by_col: dict[tuple, dict] = {}
    n_rows = 0
    for r in rows:
        n_rows += 1
        entity, column = str(r.get("entity") or "").strip(), str(r.get("column") or "").strip()
        value = str("" if r.get("value") is None else r.get("value")).strip()
        if not entity or not column or not value or (entity, column) not in exposed:
            continue    # a stale export never puts a hidden column's data in a prompt
        vals = by_col.setdefault((entity, column), {})
        n = int(float(r.get("rows") or 0))
        kv = r.get("key_value")
        key = None if kv in ("", None) else str(kv).strip()
        prev = vals.get(value)
        vals[value] = [value, prev[1] + n, prev[2] if prev and prev[2] == key else None] if prev else [value, n, key]
    columns = []
    for (entity, column), vals in sorted(by_col.items()):
        values = sorted(vals.values(), key=lambda v: (-v[1], v[0]))
        with_norm = [v if value_norm(v[0]) == v[0] else [*v, value_norm(v[0])] for v in values[:max_per_column]]
        columns.append({"entity": entity, "column": column, "key": key_of.get((entity, column)),
                        "distinct": len(values), "values": with_norm})
    return {"valueIndex": True, "formatVersion": FORMAT_VERSION, "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceRows": n_rows, "columns": columns}


def read_csv(path: Path) -> list[dict]:
    """SSMS 'Save Results As... CSV' of the old sql/extract_values.sql (header: entity,column,value,rows,key_value)."""
    text = Path(path).read_text(encoding="utf-8-sig")
    return [{k.strip().lower(): v for k, v in row.items()} for row in csv.DictReader(io.StringIO(text))]


class ValueStore:
    """data/values.json, loaded once and refreshed from the database in the background."""

    def __init__(self, folder: Path, runner=None, max_distinct: int = 5000):
        self.path = folder / "values.json"
        self.runner = runner
        self.max_distinct = max_distinct
        self._index = ValueIndex()
        self._lock = threading.Lock()
        self._loaded_at = 0.0
        self.last_error = ""
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                self._index = ValueIndex.from_json(json.loads(self.path.read_text(encoding="utf-8")))
                self._loaded_at = self.path.stat().st_mtime
            except (OSError, ValueError) as e:
                self.last_error = f"values.json unreadable: {e}"

    def current(self) -> ValueIndex:
        return self._index

    def age_hours(self) -> float | None:
        return (time.time() - self._loaded_at) / 3600 if self._loaded_at else None

    def save(self, index_json: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(index_json, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, self.path)
        with self._lock:
            self._index = ValueIndex.from_json(index_json)
            self._loaded_at = time.time()

    def refresh(self, catalog: Catalog) -> str:
        """Reads every value column from the database. Returns a one-line summary."""
        if self.runner is None:
            return "no database configured (TEXT2SQL_DB) - value index not refreshed"
        rows, skipped, failed = [], [], []
        cols = value_columns(catalog)
        for vc in cols:
            try:
                got = self.runner.run_trusted(column_query(vc, self.max_distinct))
            except Exception as e:  # noqa: BLE001 - one bad column must not stop the rest
                failed.append(f"{vc.entity}.{vc.column}: {str(e)[:120]}")
                continue
            if len(got) > self.max_distinct:
                skipped.append(f"{vc.entity}.{vc.column}")
                continue
            rows += [{"entity": vc.entity, "column": vc.column, **r} for r in got]
        self.save(build_index(rows, catalog))
        for f in failed:
            log.warning("value column failed: %s", f)
        self.last_error = f"{len(failed)} column(s) failed" if failed else ""
        return (f"{len(cols)} columns, {len(rows)} values" + (f", {len(skipped)} skipped (too many values)" if skipped else "")
                + (f", {len(failed)} failed" if failed else ""))
