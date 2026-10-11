"""How well each table matches the question: keywords + meaning + metrics + patterns.

Scores only ORDER tables; the reasons (`hits`, explain_tables) say why a table was chosen. The numbers were set
once and need no tuning (see RetrievalSettings).
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from .. import jsre
from ..model import Catalog, Metric, Table
from ..text import lex_norm, norm
from .vectors import CatalogVectors, Vector, cosine


@dataclass(frozen=True)
class RetrievalSettings:
    max_question_chars: int = 1500     # a pasted text must not eat the prompt budget
    min_score: float = 1               # a table needs this much to be selected
    closure_hops: int = 1              # fact -> the dimensions it references
    join_min_score: float = 2          # only strongly matched tables are connected through link tables
    join_max_hops: int = 2             # link tables in one path
    join_max_tables: int = 3           # link tables added per question
    # meaning: a table scores only when it STANDS OUT from all catalog tables for this question. Every embedding
    # model has a baseline similarity (bge-m3 gives ~0.4 to unrelated text); among ~150 tables the best random
    # one is ~2.5 standard deviations above the mean, a really related one ~4.
    semantic_standout: float = 2
    semantic_weight: float = 2
    semantic_max: float = 2.5
    semantic_min_spread: float = 0.02
    column_discount: float = 0.9       # a column's meaning counts a bit less than the table card's (noisier)
    column_top_k: int = 3              # column score = mean of the best 3 (one lucky column is not enough)
    confidence_min_score: float = 2    # below this nothing really matched: "probably not answerable"
    max_domains: int = 3
    domain_ratio: float = 0.6          # active domains score at least this share of the best domain
    examples_max: int = 4
    examples_semantic_weight: float = 1
    examples_lexical_weight: float = 1
    examples_link_min_sim: float = 0.85  # an almost identical example brings its tables
    examples_link_max: int = 2
    metric_weight: float = 3
    metric_max: int = 4
    pattern_weight: float = 3
    lex_entity_name: float = 3
    lex_entity_synonym: float = 3
    lex_desc_token: float = 0.5
    lex_column_name: float = 1
    lex_column_synonym: float = 2


@dataclass(eq=False)
class Scored:
    table: Table
    lex: float
    hits: list[str]
    sim: float | None
    sem: float = 0.0
    score: float = 0.0
    met: float = 0.0
    val: float = 0.0
    pat: float = 0.0


# ---------------------------------------------------------------- keywords
def lexical(t: Table, q: str, q_tokens: list[str], s: RetrievalSettings) -> tuple[float, list[str]]:
    score, hits = 0.0, []

    def contains(text, w, label):
        nonlocal score
        x = lex_norm(text)
        if len(x) >= 2 and x in q:
            score += w
            hits.append(label)

    contains(t.name, s.lex_entity_name, "نام جدول در سوال")
    for syn in t.synonyms_fa:
        contains(syn, s.lex_entity_synonym, f"مترادف «{syn}»")
    desc = lex_norm(t.description_fa)
    desc_hits = [tok for tok in q_tokens if tok in desc]      # a repeated word counts every time (emphasis)
    score += len(desc_hits) * s.lex_desc_token
    words = list(dict.fromkeys(desc_hits))
    if words:
        hits.append(f"کلمه {' و '.join(f'«{w}»' for w in words[:2])} در توضیح جدول")
    for c in t.exposed_columns:
        contains(c.alias or c.name, s.lex_column_name, f"ستون {c.alias or c.name}")
        for syn in c.synonyms_fa:
            contains(syn, s.lex_column_synonym, f"ستون «{syn}»")
    return score, hits


# ---------------------------------------------------------------- meaning
def similarity(t: Table, vectors: CatalogVectors, qv: Vector, s: RetrievalSettings) -> float | None:
    """max(table card similarity, mean of the best k column similarities x discount); None = no vectors."""
    tv = vectors.tables.get(t.name)
    if tv is None or (not tv.card and not tv.columns):
        return None
    table_sim = cosine(qv, tv.card) if tv.card else 0.0
    col_sims = sorted((cosine(qv, tv.columns[c.name]) for c in t.exposed_columns if c.name in tv.columns), reverse=True)
    top = col_sims[:s.column_top_k]
    col_sim = sum(top) / len(top) if top else 0.0
    return max(table_sim, col_sim * s.column_discount)


def population(catalog: Catalog, vectors: CatalogVectors, qv: Vector | None, s: RetrievalSettings) -> list[float]:
    """Similarity of EVERY catalog table (not only the user's): with 4 tables nothing could stand out. The other
    tables only enter this mean; nothing of theirs reaches the prompt."""
    if qv is None:
        return []
    out = []
    for t in catalog.tables:
        if t.name in vectors.tables:
            sim = similarity(t, vectors, qv, s)
            if sim is not None:
                out.append(sim)
    return out


def semantic_points(sims: list[float | None], pop: list[float], s: RetrievalSettings) -> list[float]:
    known = pop if len(pop) >= 2 else [x for x in sims if x is not None]
    if len(known) < 2:
        return [0.0 for _ in sims]
    mean = sum(known) / len(known)
    spread = max(s.semantic_min_spread, math.sqrt(sum((x - mean) ** 2 for x in known) / len(known)))
    return [0.0 if x is None else
            s.semantic_weight * min(s.semantic_max, max(0.0, (x - mean) / spread - s.semantic_standout))
            for x in sims]


def score_tables(allowed: dict[str, Table], question: str, vectors: CatalogVectors, qv: Vector | None,
                 pop: list[float], s: RetrievalSettings) -> list[Scored]:
    q = lex_norm(question)
    q_tokens = [t for t in q.split(" ") if len(t) >= 3]
    rows = []
    for t in allowed.values():
        lex, hits = lexical(t, q, q_tokens, s)
        rows.append(Scored(t, lex, hits, similarity(t, vectors, qv, s) if qv is not None else None))
    for r, p in zip(rows, semantic_points([r.sim for r in rows], pop, s)):
        r.sem = p
        r.score = r.lex + r.sem
    rows.sort(key=lambda r: -r.score)
    return rows


# ---------------------------------------------------------------- metrics («فروش خالص» -> its exact formula)
@dataclass(frozen=True)
class MetricHit:
    metric: Metric
    entities: list[str]
    hit: str


_METRIC_REF = re.compile(r"\[([^\]]+)\]\.\[[^\]]+\]")


def metric_entities(m: Metric) -> list[str]:
    return list(dict.fromkeys(x.group(1) for x in _METRIC_REF.finditer(f"{m.sql} {m.filter}")))


def match_metrics(catalog: Catalog, allowed: dict[str, Table], question: str, s: RetrievalSettings) -> list[MetricHit]:
    """Only metrics whose tables the user may read. «تعداد سفارش» (sales) is inside «تعداد سفارش خرید»
    (procurement): only the longest match stays."""
    q = lex_norm(question)
    by_lower = {n.lower(): n for n in allowed}
    hits = []
    for d in catalog.domains:
        for m in d.metrics:
            if not m.name_fa or not isinstance(m.sql, str):
                continue
            ents = [by_lower.get(n.lower()) for n in metric_entities(m)]
            if not ents or any(n is None for n in ents):
                continue
            found = sorted((x for x in map(lex_norm, [m.name_fa, *m.synonyms_fa]) if len(x) >= 2 and x in q),
                           key=lambda x: -len(x))
            if found:
                hits.append(MetricHit(m, ents, found[0]))
    hits.sort(key=lambda h: -len(h.hit))
    kept = [h for i, h in enumerate(hits) if not any(o.hit != h.hit and h.hit in o.hit for o in hits[:i])]
    return kept[:s.metric_max]


def metric_bonus(metrics: list[MetricHit], s: RetrievalSettings) -> dict[str, float]:
    return {n: s.metric_weight for h in metrics for n in h.entities}


# ---------------------------------------------------------------- patterns («۱۴۰۳», «فروردین» -> Dim_Date)
def pattern_bonus(allowed: dict[str, Table], question: str, s: RetrievalSettings) -> dict[str, float]:
    """Added after the confidence check: a calendar word alone does not make a question answerable."""
    q = norm(question)
    bonus = {}
    for t in allowed.values():
        for p in t.patterns_fa:
            try:
                rx = jsre.compile(p)
            except Exception:  # noqa: BLE001 - a broken pattern is reported by the validator
                continue
            if rx.search(q):
                bonus[t.name] = s.pattern_weight
                break
    return bonus


def boost(scored: list[Scored], bonus: dict[str, float], field_name: str, as_floor: bool = False) -> list[Scored]:
    """Adds a bonus (values, metrics, patterns). as_floor: raise the keyword score only up to the bonus
    (a metric counts like a synonym of its tables, not on top of one)."""
    for r in scored:
        b = bonus.get(r.table.name, 0)
        v = max(0, b - r.lex) if as_floor else b
        setattr(r, field_name, v)
        r.score += v
    scored.sort(key=lambda r: -r.score)
    return scored
