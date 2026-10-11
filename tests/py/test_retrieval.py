"""The Python search + prompt give exactly what the old n8n nodes (Find Tables + BuildPrompt) gave.

Golden cases: tests/py/fixtures/retrieval_cases.json.gz, made by make_retrieval_fixtures.js from the real
JavaScript on every benchmark question - 5 user groups, fake embedding vectors, a synthetic value index,
global rules. The catalog is read from the Obsidian vault here, and from the JSON files there.
"""
from __future__ import annotations

import dataclasses
import gzip
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import pytest

from text2sql.prompt import PromptBuilder
from text2sql.retrieval.finder import TableFinder
from text2sql.retrieval.values import ValueIndex
from text2sql.retrieval.vectors import CatalogVectors, FakeEmbedder, VectorCache, build_vectors, catalog_texts
from text2sql.vault.source import load_catalog

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "tests" / "py" / "fixtures" / "retrieval_cases.json.gz"
NOW = datetime(2026, 10, 11, 8, 0, tzinfo=timezone.utc)


@lru_cache(maxsize=1)
def golden():
    return json.loads(gzip.decompress(FIXTURES.read_bytes()))


@lru_cache(maxsize=1)
def catalog():
    cat, problems = load_catalog(ROOT / "obsidian" / "Catalog")
    assert not problems, problems
    return cat


@lru_cache(maxsize=1)
def vectors():
    g = golden()
    return build_vectors(catalog(), FakeEmbedder(g["dim"]), VectorCache(None, "fake"))


def test_embedded_texts_are_the_same():
    items, _ = catalog_texts(catalog())
    assert [[t, c, text] for (t, c), text in items.items()] == golden()["texts"]


def _value_json(l):
    if l.exact:
        return {"entity": l.entity, "column": l.column, "key": l.key, "exact": True, "value": l.value, "keyValue": l.key_value}
    return {"entity": l.entity, "column": l.column, "key": l.key, "exact": False, "phrase": l.phrase, "count": l.count,
            "samples": list(l.samples), "keyValue": l.key_value}


def run_case(c):
    g = golden()
    cat = catalog()
    if c.get("rules"):
        cat = dataclasses.replace(cat, rules=tuple(c["rules"]))
    vecs = vectors() if c.get("vec") else CatalogVectors()
    qv = FakeEmbedder(g["dim"]).embed([c["vec"]["text"]])[0] if c.get("vec") else None
    values = ValueIndex.from_json(g["values"]) if c.get("values") else ValueIndex()
    plan = TableFinder().find(cat, c["question"], c["groups"], vecs, qv, values)
    prompt = PromptBuilder(24000).build(plan, NOW)
    r = plan.retrieval
    return {
        "prompt": prompt.text,
        "selected": prompt.table_names,
        "planTables": [t.name for t in plan.tables],
        "entityDefs": {n: {"name": d.name, "kind": d.kind, "source": d.source, "sql": d.sql,
                           "columns": [{"name": a, "alias": b} for a, b in d.columns]} for n, d in prompt.entity_defs.items()},
        "lowConfidence": plan.low_confidence,
        "topScore": r["top_score"],
        "activeDomains": r["active_domains"],
        "joinPathTables": r["join_path_tables"],
        "exampleLinkedTables": r["example_linked_tables"],
        "why": r["why"],
        "scores": [{"entity": s["table"], "score": s["score"], "lex": s["lex"], "sem": s["sem"], "sim": s["sim"],
                    "met": s["met"], "val": s["val"], "pat": s["pat"]} for s in r["scores"]],
        "examples": [e.id for e in plan.examples],
        "values": [_value_json(l) for l in plan.values],
        "metrics": [m.name_fa for m in plan.metrics],
    }


def _ids():
    return [f"{c['id']}" for c in golden()["cases"]]


@pytest.mark.parametrize("case", golden()["cases"], ids=_ids())
def test_same_as_the_old_nodes(case):
    if "error" in case:
        with pytest.raises(Exception) as e:
            run_case(case)
        assert str(e.value) == case["error"]
        return
    got = run_case(case)
    want = case["out"]
    for key in want:
        assert got[key] == want[key], f"case {case['id']} «{case['question'][:60]}» differs in {key}"
