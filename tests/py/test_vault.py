"""The Obsidian vault itself: it reads without problems, every [[link]] resolves, note names are unique, and the
settings note says what the service will use."""
from __future__ import annotations

import re
from pathlib import Path

from text2sql.config import parse_settings
from text2sql.vault.source import load_catalog

VAULT = Path(__file__).resolve().parents[2] / "obsidian"


def test_the_catalog_notes_read_without_errors():
    catalog, problems = load_catalog(VAULT / "Catalog")
    assert problems == []
    assert len(catalog.domains) == 7 and len(catalog.tables) == 152 and len(catalog.bank) >= 50


def test_every_link_resolves_and_names_are_unique():
    notes = [p for p in VAULT.rglob("*.md") if ".obsidian" not in p.parts and "Review" not in p.parts]
    names: dict[str, Path] = {}
    for p in notes:
        assert p.stem not in names, f"two notes named {p.stem}: {names.get(p.stem)} and {p}"
        names[p.stem] = p
    for p in notes:
        text = re.sub(r"`[^`\n]*`", "", re.sub(r"```[\s\S]*?```", "", p.read_text(encoding="utf-8")))
        for m in re.finditer(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]", text):
            assert m.group(1).strip() in names, f"{p.relative_to(VAULT)} links to missing note [[{m.group(1)}]]"


def test_settings_note():
    s = parse_settings((VAULT / "Settings.md").read_text(encoding="utf-8"))
    assert s.model.api == "combine" and s.model.temperature == 0 and s.max_prompt_chars == 24000
    assert s.rights.see_details == ("IT - Data", "IT - Security") and s.rights.benchmark == ("IT - Data",)
