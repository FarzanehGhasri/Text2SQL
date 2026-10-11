"""The catalog, as read from the Obsidian vault. Plain immutable data - no I/O, no behaviour.

Names follow the vault notes (and the old catalog JSON), so a reader of a note recognises every field:
  Domain     one domain note  (Catalog/<domain>/<domain>.md): access, rules, metrics, examples, its tables
  Table      one table note   (Catalog/<domain>/<Table>.md): description, synonyms, columns, links
  Catalog    every domain + "Rules for every question" + the query bank, as one snapshot
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Column:
    name: str
    type: str = ""
    description_fa: str = ""
    exposed: bool = True          # False = "hidden": never shown to the model, never selectable
    review: bool = False          # shown, but a domain expert should check it
    alias: str | None = None
    synonyms_fa: tuple[str, ...] = ()


@dataclass(frozen=True)
class Join:                        # foreign key: from_table.from_column -> to_table.to_column
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    type: str = "INNER"
    inferred: bool = False


@dataclass(frozen=True)
class Table:
    name: str
    domain: str
    source: str                   # physical object, e.g. [dbo].[Fact_Sales]
    kind: str = "table"
    core: bool = False            # always in the prompt when its domain is active
    description_fa: str = ""
    synonyms_fa: tuple[str, ...] = ()
    columns: tuple[Column, ...] = ()
    patterns_fa: tuple[str, ...] = ()
    sql: str | None = None        # for kind "virtual"

    @property
    def exposed_columns(self) -> tuple[Column, ...]:
        return tuple(c for c in self.columns if c.exposed)


@dataclass(frozen=True)
class Hint:                       # a business rule for the model; entities = only when those tables are in the prompt
    text: str
    entities: tuple[str, ...] | None = None


@dataclass(frozen=True)
class Metric:
    name_fa: str
    sql: str
    synonyms_fa: tuple[str, ...] = ()
    filter: str = ""
    note_fa: str = ""


@dataclass(frozen=True)
class Example:
    id: str
    q: str
    sql: str
    status: str = ""              # query bank: draft | verified


@dataclass(frozen=True)
class Domain:
    domain: str
    description_fa: str = ""
    shared: bool = False          # shared dimensions (common): never competes, always usable
    hints: tuple[Hint, ...] = ()
    permissions: dict[str, tuple[str, ...]] = field(default_factory=dict)   # AD group -> ('*',) or table names
    tables: tuple[Table, ...] = ()
    joins: tuple[Join, ...] = ()
    examples: tuple[Example, ...] = ()
    metrics: tuple[Metric, ...] = ()


@dataclass(frozen=True)
class Catalog:
    domains: tuple[Domain, ...]
    rules: tuple[str, ...] = ()           # "Rules for every question"
    bank: tuple[Example, ...] = ()        # "Query bank"

    @property
    def tables(self) -> tuple[Table, ...]:
        return tuple(t for d in self.domains for t in d.tables)

    @property
    def joins(self) -> tuple[Join, ...]:
        return tuple(j for d in self.domains for j in d.joins)
