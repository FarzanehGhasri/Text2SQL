"""Obsidian notes -> Catalog. The note format (written for people, edited in Obsidian):

Catalog/<domain>/<domain>.md   type: domain
    > description
    ## Who may see it          - `AD group`: *   |   - `AD group`: [[Table]], [[Table]]
    ## Rules for the model     - rule   |   - [[Table]]: rule sent only with that table
    ## Metrics                 ### name / - Also called: a، b / - Formula: `sql` / - Always filter: `sql` / - Note: text
    ## Examples                ### question + ```sql block
    ## Tables                  - [[Table]]   (order = importance; a table note not listed here is not used)
Catalog/<domain>/<Table>.md    type: table, properties source / core / synonyms / patterns
    > description
    ## Columns                 | Column | Type | Description | Show (yes / hidden / review) |
    ## Links to other tables   - `Column` → [[Other]] `KeyColumn` (inferred)
Catalog/Rules for every question.md   type: rules       ## Rules: - rule
Catalog/Query bank.md                 type: query-bank  ## Examples: ### question / - id: `x` · status: verified / ```sql

parse_catalog() never raises on a bad note: it returns the problems with the note they are in, so the
service can keep the last good catalog and show the problem in Obsidian.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from ..model import Catalog, Column, Domain, Example, Hint, Join, Metric, Table
from ..text import locale_key
from . import markdown as md

NOTE_TYPES = ("domain", "table", "rules", "query-bank")


@dataclass(frozen=True)
class Problem:
    note: str           # path relative to the Catalog folder, e.g. "sales/Fact_Sales.md"
    message: str
    severity: str = "error"   # error = the catalog is not used; warning = works, but worth fixing


class _Collector:
    def __init__(self) -> None:
        self.problems: list[Problem] = []

    def at(self, note: str):
        return lambda message: self.problems.append(Problem(note, message))


# ---------------------------------------------------------------- table notes
def _columns(lines, err) -> tuple[Column, ...]:
    cols = []
    for cells in md.table_rows(lines):
        cells = (cells + ["", "", "", ""])[:4]
        name, type_, desc, show = cells
        if not name:
            continue
        name = md.unwrap_code(name)
        s = (show or "yes").lower()
        if s not in ("yes", "hidden", "review"):
            err(f'column {name}: Show must be yes, hidden or review (not "{show}")')
        cols.append(Column(name=name, type=type_ or "", description_fa=desc,
                           exposed=s != "hidden", review=s == "review"))
    return tuple(cols)


_LINK_LINE = re.compile(r"^`([^`]+)`\s*(?:→|->)\s*\[\[([^\]|#]+)[^\]]*\]\]\s*`([^`]+)`(.*)$")


def _links(lines, from_table, err) -> tuple[Join, ...]:
    out = []
    for it in md.items(lines):
        m = _LINK_LINE.match(it)
        if not m:
            err(f'cannot read the link "{it}" - write: `Column` → [[Table]] `KeyColumn`')
            continue
        words = [w.strip() for w in re.findall(r"\(([^)]+)\)", m.group(4))]
        join_type = next((w for w in words if w != "inferred"), "INNER")
        out.append(Join(from_table, m.group(1).strip(), m.group(2).strip(), m.group(3).strip(),
                        join_type, "inferred" in words))
    return tuple(out)


def _table(name, domain, text, err) -> tuple[Table, tuple[Join, ...], str | None]:
    props, body = md.front_matter(text)
    sec = md.sections(body)
    if "Columns" not in sec:
        err('has no "## Columns" section')
    table = Table(
        name=name,
        domain=domain,
        source=str(props.get("source") or ""),
        kind=str(props.get("kind") or "table"),
        core=props.get("core") is True,
        description_fa=md.quote_text(sec[""]),
        synonyms_fa=tuple(str(s) for s in props.get("synonyms") or []),
        columns=_columns(sec.get("Columns"), err),
        patterns_fa=tuple(str(s) for s in props.get("patterns") or []),
        sql=props.get("sql") or None,
    )
    return table, _links(sec.get("Links to other tables"), name, err), props.get("domain")


# ---------------------------------------------------------------- domain notes
def _permissions(lines, err) -> dict[str, tuple[str, ...]]:
    out = {}
    for it in md.items(lines):
        m = re.match(r"^`([^`]+)`\s*:\s*(.*)$", it) or re.match(r"^([^:]+):\s*(.*)$", it)
        if not m:
            err(f'cannot read the access line "{it}" - write: `NLSQL-sales`: *')
            continue
        v = m.group(2).strip()
        if v == "*":
            out[m.group(1).strip()] = ("*",)
        else:
            names = md.links(v) or [s.strip() for s in v.split(",") if s.strip()]
            out[m.group(1).strip()] = tuple(names)
    return out


_SCOPED = re.compile(r"^((?:\[\[[^\]]+\]\]\s*,?\s*)+):\s*(.*)$")


def _hints(lines) -> tuple[Hint, ...]:
    out = []
    for it in md.items(lines):
        m = _SCOPED.match(it)
        out.append(Hint(m.group(2), tuple(md.links(m.group(1)))) if m else Hint(it))
    return tuple(out)


def _metrics(lines, err) -> tuple[Metric, ...]:
    found: list[dict] = []
    for line in lines or []:
        h = re.match(r"^###\s+(.+?)\s*$", line)
        if h:
            found.append({"name_fa": h.group(1), "synonyms_fa": ()})
            continue
        it = re.match(r"^\s*[-*]\s+([^:]+):\s*(.*)$", line)
        if not it or not found:
            continue
        m = found[-1]
        key, value = it.group(1).strip().lower(), it.group(2).strip()
        if key == "also called":
            m["synonyms_fa"] = tuple(s.strip() for s in re.split(r"[،,]", value) if s.strip())
        elif key == "formula":
            m["sql"] = md.unwrap_code(value)
        elif key == "always filter":
            m["filter"] = md.unwrap_code(value)
        elif key == "note":
            m["note_fa"] = value
        else:
            err(f'metric «{m["name_fa"]}»: unknown line "{key}" (use Also called, Formula, Always filter, Note)')
    for m in found:
        if not m.get("sql"):
            err(f'metric «{m["name_fa"]}» has no "- Formula:" line')
    return tuple(Metric(name_fa=m["name_fa"], sql=m.get("sql", ""), synonyms_fa=m["synonyms_fa"],
                        filter=m.get("filter", ""), note_fa=m.get("note_fa", "")) for m in found)


def _examples(lines, err, id_prefix: str | None) -> tuple[Example, ...]:
    """### question, optional '- id: `x` · status: y' line, ```sql block. Domain examples get ids <domain>#n."""
    found: list[dict] = []
    in_sql, sql = False, []
    for line in lines or []:
        if in_sql:
            if line.strip().startswith("```"):
                found[-1]["sql"] = "\n".join(sql).strip()
                in_sql = False
            else:
                sql.append(line)
            continue
        h = re.match(r"^###\s+(.+?)\s*$", line)
        if h:
            found.append({"q": h.group(1), "sql": ""})
            continue
        if not found:
            continue
        meta = re.match(r"^\s*[-*]\s+id:\s*`?([^`·\s]+)`?\s*(?:·\s*status:\s*(\w+))?", line)
        if meta:
            found[-1]["id"] = meta.group(1)
            found[-1]["status"] = meta.group(2) or ""
        elif line.strip().startswith("```"):
            in_sql, sql = True, []
    out = []
    for i, e in enumerate(found, start=1):
        if not e["sql"]:
            err(f"example «{e['q']}» has no ```sql block")
        ex_id = e.get("id") or (f"{id_prefix}#{i}" if id_prefix else "")
        if not ex_id:
            err(f"example «{e['q']}» has no '- id:' line")
        out.append(Example(id=ex_id, q=e["q"], sql=e["sql"], status=e.get("status", "")))
    return tuple(out)


# ---------------------------------------------------------------- the whole catalog
def parse_catalog(notes: dict[str, str]) -> tuple[Catalog, list[Problem]]:
    """notes: {path relative to Catalog/: text}. Returns the catalog and every problem found."""
    c = _Collector()
    tables: dict[str, tuple[str, str]] = {}
    domains, rules, bank = [], [], []
    for path, text in notes.items():
        name = path.split("/")[-1][:-3] if path.endswith(".md") else path
        props, body = md.front_matter(text)
        kind = props.get("type")
        if kind == "domain":
            domains.append((path, text, props))
        elif kind == "table":
            if name in tables:
                c.at(path)(f"two table notes named {name}")
            tables[name] = (path, text)
        elif kind == "rules":
            rules += md.items(md.sections(body).get("Rules"))
        elif kind == "query-bank":
            bank += _examples(md.sections(body).get("Examples"), c.at(path), None)

    used: set[str] = set()
    out = []
    for path, text, props in sorted(domains, key=lambda d: locale_key(str(d[2].get("domain") or ""))):
        err = c.at(path)
        domain = str(props.get("domain") or "")
        if not domain:
            err('has no "domain:" property')
            continue
        sec = md.sections(md.front_matter(text)[1])
        dom_tables, dom_joins = [], []
        for n in md.links("\n".join(sec.get("Tables") or [])):
            if n not in tables:
                err(f"lists [[{n}]] under Tables, but there is no table note named {n}")
                continue
            used.add(n)
            t_path, t_text = tables[n]
            t_err = c.at(t_path)
            table, joins, says = _table(n, domain, t_text, t_err)
            if says and says != domain:
                t_err(f'says "domain: {says}" but is listed in [[{domain}]]')
            dom_tables.append(table)
            dom_joins += joins
        out.append(Domain(
            domain=domain,
            description_fa=md.quote_text(sec[""]),
            shared=props.get("shared") is True,
            hints=_hints(sec.get("Rules for the model")),
            permissions=_permissions(sec.get("Who may see it"), err),
            tables=tuple(dom_tables),
            joins=tuple(dom_joins),
            examples=_examples(sec.get("Examples"), err, domain),
            metrics=_metrics(sec.get("Metrics"), err),
        ))
    for n, (t_path, _) in tables.items():
        if n not in used:
            c.at(t_path)('is not listed under "## Tables" in any domain note, so the model never sees it')
    if not out:
        c.at("Catalog/")("no domain notes found (type: domain)")
    return Catalog(domains=tuple(out), rules=tuple(rules), bank=tuple(bank)), c.problems
