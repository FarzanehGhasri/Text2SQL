"""The vault on disk -> the current Catalog, reloaded when a note changes.

An edit saved in Obsidian is used for the next question - no import step, no restart. A note with a
mistake never reaches the model: the last good catalog stays in use and the problems are kept for the
System check note (and the /health endpoint).
"""
from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass, field
from pathlib import Path

from ..model import Catalog
from .catalog_notes import Problem, parse_catalog
from .validator import validate

log = logging.getLogger(__name__)


def read_notes(folder: Path) -> dict[str, str]:
    """{'sales/Fact_Sales.md': text, ...} - every .md below folder, hidden folders skipped."""
    out: dict[str, str] = {}
    if not folder.is_dir():
        return out
    for root, dirs, files in os.walk(folder):
        dirs[:] = sorted(d for d in dirs if not d.startswith("."))
        for f in sorted(files):
            if f.endswith(".md"):
                p = Path(root, f)
                out[p.relative_to(folder).as_posix()] = p.read_text(encoding="utf-8")
    return out


def _stamp(folder: Path) -> tuple:
    """Cheap change detector: (path, mtime, size) of every note."""
    out = []
    for root, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if f.endswith(".md"):
                st = os.stat(os.path.join(root, f))
                out.append((os.path.join(root, f), st.st_mtime_ns, st.st_size))
    return tuple(sorted(out))


def load_catalog(folder: Path) -> tuple[Catalog, list[Problem]]:
    """Parse + validate. Problems include both unreadable notes and broken catalog rules."""
    catalog, problems = parse_catalog(read_notes(folder))
    if not problems:
        problems = [p for p in validate(catalog) if p.severity == "error"]
    return catalog, problems


@dataclass
class VaultCatalog:
    """Thread-safe holder of the last good catalog of one vault folder."""
    folder: Path
    _catalog: Catalog | None = None
    _stamp: tuple = ()
    problems: list[Problem] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def current(self) -> Catalog:
        stamp = _stamp(self.folder)
        with self._lock:
            if stamp != self._stamp:
                catalog, problems = load_catalog(self.folder)
                self._stamp = stamp
                self.problems = problems
                if problems:
                    log.warning("catalog notes have %d problem(s); keeping the last good catalog", len(problems))
                    for p in problems[:20]:
                        log.warning("  %s: %s", p.note, p.message)
                else:
                    self._catalog = catalog
                    log.info("catalog loaded: %d domains, %d tables", len(catalog.domains), len(catalog.tables))
            if self._catalog is None:
                raise RuntimeError("⛔ کاتالوگ خوانده نشد. یادداشت‌های obsidian/Catalog را بررسی کنید.")
            return self._catalog
