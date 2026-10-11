"""Meaning search: what is embedded, and the vectors of the current catalog.

Units (same recipe as before, so retrieval behaves the same):
  - one "table card" per table: name, description, synonyms and the descriptions of its DISTINCTIVE columns;
  - one vector per distinctive column, with its table as context. Key columns and columns whose description is
    shared by 3+ tables («شماره سند» x42, «عنوان» x37) get none: their vectors were near-identical everywhere.
  - one vector per example question (domain examples + query bank).

Vectors come from the embeddings service and are cached in data/ by a hash of their text, so editing one note
re-embeds only what changed. If the service is down, search falls back to keywords (no error for the user).
"""
from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Protocol, Sequence

from ..model import Catalog, Column, Table

log = logging.getLogger(__name__)

GENERIC_MIN_TABLES = 3
CARD_MAX_COLUMNS = 40

Vector = list[float]


# ---------------------------------------------------------------- texts
def _desc_key(d: str | None) -> str:
    return re.sub(r"\s+", " ", str(d or "").replace("‌", " ")).strip().lower()


def _is_key_column(c: Column) -> bool:
    return bool(re.search(r"_key$", c.name, re.I)) or _desc_key(c.description_fa).startswith("کلید")


def generic_descriptions(catalog: Catalog) -> set[str]:
    users: dict[str, set[str]] = {}
    for t in catalog.tables:
        for c in t.exposed_columns:
            k = _desc_key(c.description_fa)
            if k:
                users.setdefault(k, set()).add(t.name)
    return {k for k, names in users.items() if len(names) >= GENERIC_MIN_TABLES}


def distinctive(c: Column, generic: set[str]) -> bool:
    return c.exposed and not _is_key_column(c) and _desc_key(c.description_fa) not in generic


def table_card(t: Table, generic: set[str]) -> str:
    head = " — ".join(x for x in [t.name, t.description_fa, *t.synonyms_fa] if x)
    seen, cols = set(), []
    for c in t.columns:
        if not distinctive(c, generic):
            continue
        d = c.description_fa or c.alias or c.name
        if _desc_key(d) in seen:
            continue
        seen.add(_desc_key(d))
        cols.append(d)
        if len(cols) >= CARD_MAX_COLUMNS:
            break
    return f"{head} — ستون‌ها: {'، '.join(cols)}" if cols else head


def column_text(c: Column, t: Table) -> str:
    parts = [x for x in [c.alias or c.name, c.description_fa, *c.synonyms_fa] if x]
    return f"{' — '.join(parts)} — جدول: {t.description_fa or t.name}"


# ---------------------------------------------------------------- the vectors of one catalog
@dataclass(frozen=True)
class TableVector:
    card: Vector | None
    columns: dict[str, Vector]


@dataclass(frozen=True)
class CatalogVectors:
    tables: dict[str, TableVector] = field(default_factory=dict)
    examples: dict[str, Vector] = field(default_factory=dict)     # example question -> vector

    @property
    def empty(self) -> bool:
        return not self.tables and not self.examples


def cosine(a: Sequence[float] | None, b: Sequence[float] | None) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = na = nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    denom = math.sqrt(na) * math.sqrt(nb)
    return dot / denom if denom > 0 else 0.0


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[Vector]: ...


def catalog_texts(catalog: Catalog) -> tuple[dict[str, tuple[str | None, str]], list[str]]:
    """({(table, column|None) key: text}, example questions)"""
    generic = generic_descriptions(catalog)
    items: dict = {}
    for t in catalog.tables:
        items[(t.name, None)] = table_card(t, generic)
        for c in t.columns:
            if distinctive(c, generic):
                items[(t.name, c.name)] = column_text(c, t)
    questions = [e.q for d in catalog.domains for e in d.examples] + [e.q for e in catalog.bank]
    return items, list(dict.fromkeys(q for q in questions if q and q.strip()))


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


class VectorCache:
    """text hash -> vector, one JSON file per embedding endpoint, in data/."""

    def __init__(self, folder: Path | None, model_tag: str):
        self.path = folder / f"embeddings-{text_hash(model_tag)}.json" if folder else None
        self._data: dict[str, Vector] = {}
        if self.path and self.path.exists():
            try:
                self._data = json.loads(self.path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                log.warning("embedding cache %s unreadable; starting empty", self.path)

    def get(self, text: str) -> Vector | None:
        return self._data.get(text_hash(text))

    def put_many(self, pairs: list[tuple[str, Vector]]) -> None:
        for text, vec in pairs:
            self._data[text_hash(text)] = vec
        if self.path:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self._data), encoding="utf-8")
            os.replace(tmp, self.path)


def build_vectors(catalog: Catalog, embedder: Embedder, cache: VectorCache, batch: int = 32) -> CatalogVectors:
    items, questions = catalog_texts(catalog)
    texts = list(dict.fromkeys([*items.values(), *questions]))
    missing = [t for t in texts if cache.get(t) is None]
    for i in range(0, len(missing), batch):
        chunk = missing[i:i + batch]
        cache.put_many(list(zip(chunk, embedder.embed(chunk))))
    tables: dict[str, TableVector] = {}
    for t in catalog.tables:
        cols = {c: cache.get(text) for (name, c), text in items.items() if name == t.name and c is not None}
        tables[t.name] = TableVector(cache.get(items[(t.name, None)]), {k: v for k, v in cols.items() if v})
    return CatalogVectors(tables, {q: cache.get(q) for q in questions if cache.get(q)})


class VectorIndex:
    """Vectors for the current catalog, rebuilt when the catalog changes; empty (keywords only) on failure."""

    def __init__(self, embedder: Embedder | None, cache_folder: Path | None, model_tag: str):
        self.embedder = embedder
        self.cache = VectorCache(cache_folder, model_tag)
        self._for: Catalog | None = None
        self._vectors = CatalogVectors()
        self._lock = threading.Lock()

    def current(self, catalog: Catalog) -> CatalogVectors:
        with self._lock:
            if self.embedder is None:
                return CatalogVectors()
            if catalog is not self._for:
                try:
                    self._vectors = build_vectors(catalog, self.embedder, self.cache)
                except Exception as e:  # noqa: BLE001 - the service must keep answering with keywords
                    log.warning("embedding the catalog failed (%s); keyword search only", e)
                    self._vectors = CatalogVectors()
                self._for = catalog
            return self._vectors

    def embed_question(self, question: str) -> Vector | None:
        if self.embedder is None:
            return None
        try:
            return self.embedder.embed([question])[0]
        except Exception as e:  # noqa: BLE001
            log.warning("embedding the question failed (%s); keyword search only", e)
            return None


class FakeEmbedder:
    """Deterministic vectors from a hash of the text - for tests (same as the old JavaScript tests)."""

    def __init__(self, dim: int = 32, transform: Callable[[str], str] = lambda t: t):
        self.dim = dim
        self.transform = transform

    def embed(self, texts: list[str]) -> list[Vector]:
        out = []
        for t in texts:
            h = hashlib.sha256(self.transform(t).encode("utf-8")).digest()
            out.append([(h[i] - 128) / 128 for i in range(self.dim)])
        return out


class TeiEmbedder:
    """text-embeddings-inference (the `embeddings` service, bge-m3): POST /embed {"inputs": [...]}."""

    def __init__(self, endpoint: str, timeout: float = 30.0):
        import httpx
        self.endpoint = endpoint
        self.client = httpx.Client(timeout=httpx.Timeout(timeout, connect=5.0))

    def embed(self, texts: list[str]) -> list[Vector]:
        r = self.client.post(self.endpoint, json={"inputs": texts, "truncate": True})
        r.raise_for_status()
        data = r.json()
        if not isinstance(data, list) or len(data) != len(texts):
            raise ValueError(f"unexpected embeddings response: {str(data)[:120]}")
        return data
