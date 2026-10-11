"""Few-shot examples most similar to the question (DAIL-SQL): domain examples + the query bank.

Only examples whose tables the user may read (an example must not show another domain's schema) and that are
in the final prompt (or the model references a table the guard rejects).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .. import jsre
from ..model import Catalog, Example, Table
from ..text import lex_norm, locale_key
from .scoring import RetrievalSettings
from .vectors import CatalogVectors, Vector, cosine

_REF = jsre.compile(r"\b(?:from|join)\s+(\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)", re.IGNORECASE)
_TOKEN_PUNCT = re.compile(r"[؟?!.,،؛:;«»\"'()\[\]]")


def example_tables(sql: str) -> list[str]:
    """Table names an SQL reads (FROM/JOIN), in order of first use; the same rule as the guard's."""
    return list(dict.fromkeys(re.sub(r"^\[|\]$", "", m.group(1)) for m in _REF.finditer(str(sql))))


def _tokens(s: str) -> set[str]:
    return {t for t in _TOKEN_PUNCT.sub(" ", lex_norm(s)).split(" ") if len(t) >= 2}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / (len(a) + len(b) - inter)


def example_pool(catalog: Catalog) -> list[Example]:
    pool = [Example(f"{d.domain}#{i}", e.q, e.sql, e.status) for d in catalog.domains
            for i, e in enumerate(d.examples, start=1)]
    pool += list(catalog.bank)
    return [e for e in pool if isinstance(e.q, str) and e.q.strip() and isinstance(e.sql, str)]


@dataclass(frozen=True)
class RankedExample:
    example: Example
    tables: list[str]
    sem: float | None
    lex: float
    score: float


def rank_examples(pool: list[Example], question: str, qv: Vector | None, vectors: CatalogVectors,
                  allowed: dict[str, Table], s: RetrievalSettings) -> list[RankedExample]:
    by_lower = {n.lower(): n for n in allowed}
    q_tokens = _tokens(question)
    ranked = []
    for ex in pool:
        refs = example_tables(ex.sql)
        tables = [by_lower.get(n.lower()) for n in refs]
        if not refs or any(t is None for t in tables):
            continue
        vec = vectors.examples.get(ex.q) if qv is not None else None
        sem = cosine(qv, vec) if vec else None
        lex = jaccard(q_tokens, _tokens(ex.q))
        score = (0 if sem is None else sem * s.examples_semantic_weight) + lex * s.examples_lexical_weight
        ranked.append(RankedExample(ex, tables, sem, lex, score))
    ranked.sort(key=lambda r: (-r.score, 0 if r.example.status == "verified" else 1, locale_key(r.example.id)))
    # one SQL asked several ways: only its most similar wording stays
    seen, out = set(), []
    for r in ranked:
        key = re.sub(r"\s+", " ", r.example.sql).strip().lower()
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


@dataclass(frozen=True)
class LinkedTable:
    name: str
    rank: float
    example: str


def link_example_tables(ranked: list[RankedExample], selected: dict[str, None], eligible, allowed: dict[str, Table],
                        score_of, s: RetrievalSettings) -> list[LinkedTable]:
    """An example almost identical in meaning is usually the same question in other words: its tables come too,
    in case keywords missed one. Only tables of active or shared domains."""
    added = []
    close = [r for r in ranked if r.sem is not None and r.sem >= s.examples_link_min_sim][:s.examples_link_max]
    for r in close:
        if not all(eligible(allowed[n]) for n in r.tables):
            continue
        anchor = max([s.min_score, *(score_of(n) for n in r.tables)])
        for i, n in enumerate([n for n in r.tables if n not in selected]):
            selected[n] = None
            added.append(LinkedTable(n, anchor - (i + 1) * 1e-6, r.example.id))
    return added


def choose_examples(ranked: list[RankedExample], names, s: RetrievalSettings) -> list[RankedExample]:
    return [r for r in ranked if all(n in names for n in r.tables)][:s.examples_max]
