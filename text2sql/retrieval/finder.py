"""Find the tables (and examples, values, metrics) a question needs - the plan the prompt is written from.

Steps, in order (find()):
  1. access      tables the user's AD groups may read (domain notes, "Who may see it")
  2. score       keywords (name, synonyms, columns) + meaning (embeddings)
  3. metrics     a metric named in the question («فروش خالص») -> its exact formula; its tables count as matched
  4. confidence  nothing really matched -> "probably not answerable"
  5. values      stored values named in the question; calendar patterns («۱۴۰۳» -> Dim_Date)
  6. domains     at most 3 domains close to the best one
  7. tables      matched + core + referenced dimensions + link tables between matched tables
  8. examples    the most similar examples of the query bank
Every chosen table carries plain reasons (why); scores only order tables.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ..model import Catalog, Domain, Hint, Join, Table
from ..text import norm
from .examples import choose_examples, example_pool, link_example_tables, rank_examples
from .graph import Bridge, Domains, complete_join_paths, select_domains, select_tables
from .scoring import (MetricHit, RetrievalSettings, Scored, boost, match_metrics, metric_bonus, pattern_bonus,
                      population, score_tables)
from .values import ValueIndex, ValueLine, ValueLookup, ValueSettings
from .vectors import CatalogVectors, Vector

log = logging.getLogger(__name__)


class AccessDenied(Exception):
    """The user's groups give no table at all."""


# ---------------------------------------------------------------- the plan
@dataclass(frozen=True)
class PromptColumn:
    name: str
    alias: str | None
    type: str
    description_fa: str
    samples: tuple[str, ...] | None


@dataclass(frozen=True)
class PromptTable:
    name: str
    kind: str
    source: str | None
    sql: str | None
    description_fa: str
    columns: tuple[PromptColumn, ...]


@dataclass(frozen=True)
class PlanExample:
    id: str
    q: str
    sql: str
    tables: tuple[str, ...]
    sem: float | None
    lex: float


@dataclass(frozen=True)
class PlanMetric:
    name_fa: str
    sql: str
    filter: str
    note_fa: str
    tables: tuple[str, ...]


@dataclass(frozen=True)
class Plan:
    question: str
    low_confidence: bool
    tables: tuple[PromptTable, ...]               # most important first; the prompt takes them top-down
    joins: tuple[Join, ...]
    domain_hints: tuple[str, ...]
    scoped_hints: tuple[Hint, ...]
    rules: tuple[str, ...]
    examples: tuple[PlanExample, ...]
    values: tuple[ValueLine, ...]
    metrics: tuple[PlanMetric, ...]
    retrieval: dict = field(default_factory=dict)  # top_score, active_domains, why, scores, ... (logs, notes)


# ---------------------------------------------------------------- step 1
def resolve_access(catalog: Catalog, groups: list[str]) -> tuple[dict[str, Table], dict[str, Domain]]:
    """(allowed tables in catalog order, table -> its domain). Group names compare after normalisation.
    Table names are global: a duplicate keeps the first (the validator reports it before deployment)."""
    group_set = {norm(g) for g in groups}
    allowed: dict[str, Table] = {}
    domain_of: dict[str, Domain] = {}
    seen: dict[str, str] = {}
    for d in catalog.domains:
        names, everything = set(), False
        for g, granted in d.permissions.items():
            if norm(g) not in group_set:
                continue
            for n in granted:
                if n == "*":
                    everything = True
                else:
                    names.add(n)
        if not everything and not names:
            continue
        for t in d.tables:
            if not everything and t.name not in names:
                continue
            if t.name.lower() in seen:
                log.warning("DUPLICATE TABLE | %s in %s ignored, already defined in %s", t.name, d.domain,
                            domain_of[seen[t.name.lower()]].domain)
                continue
            seen[t.name.lower()] = t.name
            allowed[t.name] = t
            domain_of[t.name] = d
    return allowed, domain_of


def explain(order, scored: list[Scored], metrics: list[MetricHit], values: list[ValueLine], bridges: list[Bridge],
            linked, domains: Domains, joins: list[Join]) -> dict[str, list[str]]:
    """Plain reasons per table, for the logs and the Obsidian review note."""
    by_name = {r.table.name: r for r in scored}
    why = {}
    for name in order:
        r = by_name.get(name)
        reasons = list(r.hits) if r else []
        if r and r.sem > 0:
            reasons.append("معنای نزدیک به سوال")
        reasons += [f"معیار «{h.metric.name_fa}»" for h in metrics if name in h.entities]
        reasons += [f"مقدار «{l.value if l.exact else l.phrase}»" for l in values if l.entity == name]
        if r and r.pat:
            reasons.append("تاریخ یا سال شمسی در سوال")
        if r and r.table.core and domains.is_active(domains.by_table[name]):
            reasons.append(f"جدول اصلی حوزه {domains.by_table[name].domain}")
        bridge = next((b for b in bridges if b.name == name), None)
        if bridge:
            reasons.append(f"واسط بین {bridge.path[0]} و {bridge.path[-1]}")
        link = next((l for l in linked if l.name == name), None)
        if link:
            reasons.append(f"جدولِ مثال مشابه {link.example}")
        if not reasons:
            src = next((j for j in joins if j.to_table == name and j.from_table != name and j.from_table in order), None)
            reasons.append(f"بُعدِ {src.from_table}" if src else "برای تکمیل")
        why[name] = list(dict.fromkeys(reasons))
    return why


def _prompt_table(t: Table, samples: dict[str, list[str]]) -> PromptTable:
    return PromptTable(t.name, t.kind or "table", t.source or None, t.sql or None, t.description_fa or "",
                       tuple(PromptColumn(c.name, c.alias or None, c.type or "nvarchar", c.description_fa or "",
                                          tuple(samples[f"{t.name}|{c.name}"]) if f"{t.name}|{c.name}" in samples else None)
                             for c in t.exposed_columns))


class TableFinder:
    def __init__(self, settings: RetrievalSettings = RetrievalSettings(), value_settings: ValueSettings = ValueSettings()):
        self.s = settings
        self.vs = value_settings

    def _value_bonus(self, lines: list[ValueLine]) -> dict[str, float]:
        bonus: dict[str, float] = {}
        for l in lines:
            bonus[l.entity] = max(bonus.get(l.entity, 0), self.vs.exact_weight if l.exact else self.vs.partial_weight)
        return bonus

    def find(self, catalog: Catalog, question: str, groups: list[str], vectors: CatalogVectors = CatalogVectors(),
             question_vector: Vector | None = None, values: ValueIndex = ValueIndex()) -> Plan:
        s = self.s
        question = str(question or "").strip()[:s.max_question_chars]
        if not question:
            raise ValueError("⛔ سوالی دریافت نشد.")

        allowed, domain_of = resolve_access(catalog, groups)                                    # 1
        if not allowed:
            raise AccessDenied("⛔ شما دسترسی به این سامانه را ندارید.\n\nبرای درخواست دسترسی با واحد فناوری اطلاعات تماس بگیرید.")

        qv = question_vector
        scored = score_tables(allowed, question, vectors, qv, population(catalog, vectors, qv, s), s)   # 2
        metrics = match_metrics(catalog, allowed, question, s)                                   # 3
        boost(scored, metric_bonus(metrics, s), "met", as_floor=True)

        top_score = scored[0].score if scored else 0                                            # 4
        low_confidence = top_score < s.confidence_min_score

        lookup = ValueLookup(values, allowed, self.vs)                                           # 5
        value_lines = lookup.match(question)
        boost(scored, self._value_bonus(value_lines), "val")   # after step 4: «هوای تهران» must stay unanswerable
        boost(scored, pattern_bonus(allowed, question, s), "pat")
        log.debug("SCORES | %s", " | ".join(f"{r.table.name}={r.score:.2f}" for r in scored[:8]))

        domains = select_domains(scored, domain_of, low_confidence, s)                           # 6
        joins = list(catalog.joins)                                                              # 7
        selected = select_tables(scored, allowed, domains, joins, s)
        bridges = complete_join_paths(scored, selected, allowed, domains, joins, s)
        for b in bridges:
            selected[b.name] = None
        score_by_name = {r.table.name: r.score for r in scored}
        for b in bridges:
            score_by_name[b.name] = max(score_by_name.get(b.name, 0), b.rank)

        ranked = rank_examples(example_pool(catalog), question, qv, vectors, allowed, s)         # 8
        linked = link_example_tables(ranked, selected, domains.eligible, allowed,
                                     lambda n: score_by_name.get(n, 0), s)
        for l in linked:
            score_by_name[l.name] = max(score_by_name.get(l.name, 0), l.rank)

        order = sorted(selected, key=lambda n: -score_by_name.get(n, 0))
        in_plan = set(order)
        why = explain(order, scored, metrics, value_lines, bridges, linked, domains, joins)
        samples = lookup.samples()
        active = domains.active
        return Plan(
            question=question,
            low_confidence=low_confidence,
            tables=tuple(_prompt_table(allowed[n], samples) for n in order),
            joins=tuple(j for j in joins if j.from_table in in_plan and j.to_table in in_plan),
            domain_hints=tuple(h.text for d in active for h in d.hints if h.entities is None),
            scoped_hints=tuple(h for d in catalog.domains for h in d.hints
                               if h.entities is not None and any(n in in_plan for n in h.entities)),
            rules=tuple(catalog.rules),
            examples=tuple(PlanExample(r.example.id, r.example.q, r.example.sql, tuple(r.tables), r.sem, r.lex)
                           for r in choose_examples(ranked, selected, s)),
            values=tuple(value_lines),
            metrics=tuple(PlanMetric(h.metric.name_fa, h.metric.sql, h.metric.filter or "", h.metric.note_fa or "",
                                     tuple(h.entities)) for h in metrics),
            retrieval={
                "top_score": top_score,
                "low_confidence": low_confidence,
                "semantic_used": qv is not None,
                "active_domains": [d.domain for d in active],
                "join_path_tables": [b.name for b in bridges],
                "example_linked_tables": [l.name for l in linked],
                "why": why,
                "scores": [{"table": r.table.name, "score": r.score, "lex": r.lex, "sem": r.sem,
                            "sim": None if r.sim is None else round(r.sim, 3), "met": r.met, "val": r.val, "pat": r.pat}
                           for r in scored[:8]],
            },
        )
