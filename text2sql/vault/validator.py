"""Catalog rules checked before a catalog is used. Each rule: (context) -> [Problem]; add a rule = add a function.

error   - would make retrieval or the SQL guard misbehave (a table defined twice, a link or example naming
          something that does not exist, a source that is not a table). The catalog is not used.
warning - works, but worth fixing (unreviewed columns, tables without synonyms). Shown in the System check.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..model import Catalog, Column, Domain, Table
from .catalog_notes import Problem

# Names are written unquoted by the model and matched by the guard with [A-Za-z0-9_]+.
ENTITY_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
SOURCE = re.compile(r"^(?:\[[^\]\[]+\]\.){1,2}\[[^\]\[]+\]$")      # [schema].[table] or [db].[schema].[table]
KINDS = {"table", "virtual"}
STATUSES = {"draft", "verified"}
_COLUMN_REF = re.compile(r"\[([^\]]+)\]\.\[([^\]]+)\]")
_TABLE_REF = re.compile(r"\b(?:from|join)\s+\[([^\]]+)\]", re.I | re.A)

DOMAIN_NOTE = "{d}/{d}.md"
TABLE_NOTE = "{d}/{t}.md"
BANK_NOTE = "Query bank.md"


def _dn(d: Domain) -> str:
    return DOMAIN_NOTE.format(d=d.domain)


def _tn(t: Table) -> str:
    return TABLE_NOTE.format(d=t.domain, t=t.name)


@dataclass
class Context:
    catalog: Catalog
    schema: dict | None = None
    tables: dict[str, Table] = field(default_factory=dict)        # lower name -> first definition
    duplicates: list[tuple[Table, Table]] = field(default_factory=list)

    def __post_init__(self) -> None:
        for t in self.catalog.tables:
            key = t.name.lower()
            if key in self.tables:
                self.duplicates.append((t, self.tables[key]))
            else:
                self.tables[key] = t

    def column(self, table: str, column: str) -> Column | None:
        t = self.tables.get(table.lower())
        return next((c for c in t.columns if c.name.lower() == column.lower()), None) if t else None


def err(note, message):
    return Problem(note, message, "error")


def warn(note, message):
    return Problem(note, message, "warning")


# ---------------------------------------------------------------- rules
def domain_shape(ctx: Context):
    for d in ctx.catalog.domains:
        if not d.permissions:
            yield err(_dn(d), '"Who may see it" is empty - nobody could see this domain')


def table_shape(ctx: Context):
    for t in ctx.catalog.tables:
        where = f"table {t.name}"
        if not ENTITY_NAME.match(t.name):
            yield err(_tn(t), f"{where}: the note name must be letters, digits and _ (it is the name the model writes)")
            continue
        if t.kind not in KINDS:
            yield err(_tn(t), f'{where}: unknown kind "{t.kind}"')
        if t.kind == "table" and not SOURCE.match(t.source or ""):
            yield err(_tn(t), f'{where}: source "{t.source}" must look like [schema].[table]')
        if t.kind == "virtual" and not t.sql:
            yield err(_tn(t), f'{where}: a virtual table needs "sql"')
        if not t.columns:
            yield err(_tn(t), f"{where}: has no columns")
            continue
        seen = set()
        for c in t.columns:
            if c.name.lower() in seen:
                yield err(_tn(t), f"{where}: duplicate column {c.name}")
            seen.add(c.name.lower())
        if not any(c.exposed for c in t.columns):
            yield err(_tn(t), f"{where}: every column is hidden")


def unique_names(ctx: Context):
    # retrieval keys tables by name across all domains and the guard compares names case-insensitively
    for t, first in ctx.duplicates:
        yield err(_tn(t), f"table {t.name} is already defined in {first.domain} (names are global and case-insensitive)")


def core_tables(ctx: Context):
    for d in ctx.catalog.domains:
        cores = [t for t in d.tables if t.core]
        if len(cores) > 1:
            yield err(_dn(d), f"more than one core table: {', '.join(t.name for t in cores)}")
        if not cores and not d.shared:
            yield warn(_dn(d), "no core table - questions for this domain get no guaranteed anchor table")
        if cores and d.shared:
            yield err(_dn(d), "a shared domain must not have a core table (it would be added to every prompt)")


def permission_targets(ctx: Context):
    for d in ctx.catalog.domains:
        names = {t.name for t in d.tables}
        for group, granted in d.permissions.items():
            for n in granted:
                if n != "*" and n not in names:
                    yield err(_dn(d), f'group "{group}" is given unknown table "{n}"')


def joins(ctx: Context):
    for d in ctx.catalog.domains:
        for j in d.joins:
            label = f"link {j.from_table}.{j.from_column} -> {j.to_table}.{j.to_column}"
            note = TABLE_NOTE.format(d=d.domain, t=j.from_table)
            ok = True
            for table, col in ((j.from_table, j.from_column), (j.to_table, j.to_column)):
                if table.lower() not in ctx.tables:
                    yield err(note, f"{label}: table {table} does not exist")
                    ok = False
                    continue
                column = ctx.column(table, col)
                if column is None:
                    yield err(note, f"{label}: column {table}.{col} does not exist")
                    ok = False
                elif not column.exposed:
                    # the guard builds each table from its shown columns only: this link could never run
                    yield err(note, f"{label}: column {table}.{col} is hidden")
                    ok = False
            if not ok:
                continue
            a, b = ctx.tables[j.from_table.lower()], ctx.tables[j.to_table.lower()]
            da = next(x for x in ctx.catalog.domains if x.domain == a.domain)
            db = next(x for x in ctx.catalog.domains if x.domain == b.domain)
            if da is not db and not da.shared and not db.shared:
                yield warn(note, f'{label}: crosses into domain "{db.domain}" - users without that domain lose '
                                 "this link (move the dimension to the shared domain)")


def _sql_problems(ctx: Context, sql: str, note: str, label: str):
    """An example is copied almost word for word: one naming a missing table teaches the model to fail."""
    for m in _TABLE_REF.finditer(sql):
        if m.group(1).lower() not in ctx.tables:
            yield err(note, f"{label}: references unknown table [{m.group(1)}]")
    for m in _COLUMN_REF.finditer(sql):
        if m.group(1).lower() not in ctx.tables:
            continue  # already reported, or an alias
        col = ctx.column(m.group(1), m.group(2))
        if col is None:
            yield err(note, f"{label}: references unknown column [{m.group(1)}].[{m.group(2)}]")
        elif not col.exposed:
            yield err(note, f"{label}: uses hidden column [{m.group(1)}].[{m.group(2)}]")


def examples(ctx: Context):
    for d in ctx.catalog.domains:
        for i, ex in enumerate(d.examples, start=1):
            yield from _sql_problems(ctx, ex.sql, _dn(d), f"example {i} «{ex.q}»")


def query_bank(ctx: Context):
    ids, questions = set(), set()
    for ex in ctx.catalog.bank:
        label = f"example {ex.id}"
        if ex.id in ids:
            yield err(BANK_NOTE, f"{label}: duplicate id")
        ids.add(ex.id)
        key = re.sub(r"\s+", " ", ex.q).strip()
        if key in questions:
            yield err(BANK_NOTE, f"{label}: the question appears twice")
        questions.add(key)
        if ex.status and ex.status not in STATUSES:
            yield err(BANK_NOTE, f"{label}: status must be draft or verified")
        if not re.search(r"\b(?:from|join)\s+\[", ex.sql, re.I | re.A):
            yield err(BANK_NOTE, f"{label}: reads no [Table]")
        yield from _sql_problems(ctx, ex.sql, BANK_NOTE, label)


def metrics(ctx: Context):
    for d in ctx.catalog.domains:
        names = set()
        for m in d.metrics:
            label = f"metric {m.name_fa}"
            if m.name_fa in names:
                yield err(_dn(d), f"{label}: duplicate name")
            names.add(m.name_fa)
            text = f"{m.sql} {m.filter}"
            if not _COLUMN_REF.search(text):
                yield err(_dn(d), f"{label}: write columns as [Table].[Column]")
            for mm in _COLUMN_REF.finditer(text):
                if mm.group(1).lower() not in ctx.tables:
                    yield err(_dn(d), f"{label}: unknown table [{mm.group(1)}]")
                    continue
                col = ctx.column(mm.group(1), mm.group(2))
                if col is None:
                    yield err(_dn(d), f"{label}: unknown column [{mm.group(1)}].[{mm.group(2)}]")
                elif not col.exposed:
                    yield err(_dn(d), f"{label}: hidden column [{mm.group(1)}].[{mm.group(2)}]")


def patterns(ctx: Context):
    from .. import jsre
    for t in ctx.catalog.tables:
        for p in t.patterns_fa:
            try:
                jsre.compile(p)
            except Exception as e:  # noqa: BLE001 - any compile error is the finding
                yield err(_tn(t), f"invalid pattern {p!r}: {e}")


def hints(ctx: Context):
    for d in ctx.catalog.domains:
        for i, h in enumerate(d.hints, start=1):
            for n in h.entities or ():
                if n.lower() not in ctx.tables:
                    yield err(_dn(d), f"rule {i}: unknown table {n}")


def review_flags(ctx: Context):
    for t in ctx.catalog.tables:
        for c in t.columns:
            if c.review and c.exposed:
                yield warn(_tn(t), f"{t.name}.{c.name} is still Show = review and is sent to the model: {c.description_fa}")


def synonyms(ctx: Context):
    for t in ctx.catalog.tables:
        if not t.synonyms_fa:
            yield warn(_tn(t), f"{t.name} has no synonyms - keyword search only sees its name and description")


def database_schema(ctx: Context):
    """Only with a schema file (SSMS "Generate Scripts"): every source table and column must exist."""
    if not ctx.schema:
        return
    for t in ctx.catalog.tables:
        if t.kind != "table" or not SOURCE.match(t.source or ""):
            continue
        key = ".".join(re.findall(r"\[[^\]]+\]", t.source)[-2:]).lower()   # ignore an optional [database]
        real = ctx.schema.get(key)
        if not real:
            yield err(_tn(t), f"{t.name}: source {t.source} does not exist in the database schema")
            continue
        for c in t.columns:
            rc = real["columns"].get(c.name.lower())
            if not rc:
                yield err(_tn(t), f"{t.name}.{c.name} does not exist in {t.source}")
            elif c.type and c.type.lower() != rc["type"].lower():
                yield warn(_tn(t), f"{t.name}.{c.name}: note says type {c.type}, database says {rc['type']}")


RULES = (domain_shape, table_shape, unique_names, core_tables, permission_targets, joins, examples,
         query_bank, metrics, patterns, hints, review_flags, synonyms, database_schema)


def validate(catalog: Catalog, schema: dict | None = None, rules=RULES) -> list[Problem]:
    ctx = Context(catalog, schema)
    return [p for rule in rules for p in rule(ctx)]


# ---------------------------------------------------------------- SSMS schema script
def read_schema_file(path: Path) -> dict:
    """SSMS "Generate Scripts" output (UTF-16 with BOM or UTF-8) -> {'[schema].[table]': {name, columns}}."""
    raw = Path(path).read_bytes()
    text = raw[2:].decode("utf-16-le") if raw[:2] == b"\xff\xfe" else raw.decode("utf-8-sig")
    text = text.replace("\r\n", "\n")
    tables = {}
    for m in re.finditer(r"^CREATE TABLE \[([^\]]+)\]\.\[([^\]]+)\]\(\n([\s\S]*?)^\)(?: ON |\s*$)", text, re.M):
        schema, table, body = m.groups()
        cols = {c.group(1).lower(): {"name": c.group(1), "type": c.group(2)}
                for c in re.finditer(r"^\s*\[([^\]]+)\]\s+(?:\[[^\]]+\]\.)?\[([^\]]+)\]", body, re.M)}
        tables[f"[{schema}].[{table}]".lower()] = {"name": f"[{schema}].[{table}]", "columns": cols}
    return tables
