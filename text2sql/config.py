"""Settings: the Obsidian note Settings.md (everything non-secret) + environment variables (secrets).

Secrets never live in the vault (it is in git and on people's PCs):
  TEXT2SQL_DB             ODBC connection string of the READ-ONLY login, e.g.
                          Driver={ODBC Driver 18 for SQL Server};Server=...;Database=SA_DataWarehouse;UID=...;PWD=...;
                          Encrypt=yes;TrustServerCertificate=yes;ApplicationIntent=ReadOnly
  TEXT2SQL_AUDIT_DB       connection string of the INSERT-only audit login (optional)
  TEXT2SQL_LDAP_URL       ldap://dc.corp.local  (optional: without it the user's groups come from the request)
  TEXT2SQL_LDAP_USER / TEXT2SQL_LDAP_PASSWORD / TEXT2SQL_LDAP_BASE
  TEXT2SQL_API_KEY        Bearer key Open WebUI must send (strongly recommended)
  TEXT2SQL_LLM_API_KEY    key for an OpenAI-compatible model server (optional)
  TEXT2SQL_VAULT          path of the Obsidian vault (default: ./obsidian)
  TEXT2SQL_DATA           folder for caches: embeddings, value index (default: ./data)
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path

from .vault import markdown as md


@dataclass(frozen=True)
class ModelSettings:
    api: str = "combine"                     # combine | openai
    endpoint: str = "http://172.16.55.28:5000/combine"
    model: str = "qwen2.5-32b-instruct"
    temperature: float = 0.0
    max_tokens: int = 1024
    timeout_seconds: float = 180.0


@dataclass(frozen=True)
class Rights:
    see_details: tuple[str, ...] = ("IT - Data", "IT - Security")
    benchmark: tuple[str, ...] = ("IT - Data",)
    review_notes: tuple[str, ...] = ("IT - Data", "IT - Security")


@dataclass(frozen=True)
class Settings:
    model: ModelSettings = field(default_factory=ModelSettings)
    max_prompt_chars: int = 24000
    embeddings_endpoint: str = "http://embeddings:80/embed"
    chart_base_url: str = "http://localhost:3001"
    rights: Rights = field(default_factory=Rights)
    values_refresh_hours: float = 24.0


@dataclass(frozen=True)
class Secrets:
    db: str = ""
    audit_db: str = ""
    ldap_url: str = ""
    ldap_user: str = ""
    ldap_password: str = ""
    ldap_base: str = ""
    api_key: str = ""
    llm_api_key: str = ""

    @classmethod
    def from_env(cls, env=os.environ) -> "Secrets":
        g = lambda k: env.get(f"TEXT2SQL_{k}", "")  # noqa: E731
        return cls(g("DB"), g("AUDIT_DB"), g("LDAP_URL"), g("LDAP_USER"), g("LDAP_PASSWORD"),
                   g("LDAP_BASE"), g("API_KEY"), g("LLM_API_KEY"))


@dataclass(frozen=True)
class Paths:
    vault: Path
    data: Path

    @property
    def catalog(self) -> Path:
        return self.vault / "Catalog"

    @property
    def settings_note(self) -> Path:
        return self.vault / "Settings.md"

    @property
    def inbox(self) -> Path:
        return self.vault / "Inbox" / "Review"

    @classmethod
    def from_env(cls, env=os.environ) -> "Paths":
        root = Path(__file__).resolve().parent.parent
        return cls(Path(env.get("TEXT2SQL_VAULT") or root / "obsidian"), Path(env.get("TEXT2SQL_DATA") or root / "data"))


def _kv(lines) -> dict[str, str]:
    out = {}
    for it in md.items(lines):
        m = re.match(r"^([^:]+):\s*(.*)$", it)
        if m:
            out[m.group(1).strip().lower()] = m.group(2).strip()
    return out


def _groups(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if value is None:
        return default
    names = re.findall(r"`([^`]+)`", value)
    return tuple(names or [s.strip() for s in value.split(",") if s.strip()])


def parse_settings(text: str) -> Settings:
    """Settings.md -> Settings; anything missing or unreadable keeps its default."""
    sec = md.sections(md.front_matter(text)[1])
    d = Settings()
    m, p, e, a, r, v = (_kv(sec.get(n)) for n in ("Model", "Prompt", "Embeddings", "Answers", "Who may do what", "Values"))

    def num(src, key, default, cast=float):
        try:
            return cast(src[key]) if key in src else default
        except ValueError:
            return default

    model = ModelSettings(
        api=m.get("api", d.model.api).lower(),
        endpoint=m.get("endpoint", d.model.endpoint),
        model=m.get("model", d.model.model),
        temperature=num(m, "temperature", d.model.temperature),
        max_tokens=num(m, "max_tokens", d.model.max_tokens, int),
        timeout_seconds=num(m, "timeout_seconds", d.model.timeout_seconds),
    )
    rights = Rights(
        see_details=_groups(r.get("see error details"), d.rights.see_details),
        benchmark=_groups(r.get("benchmark data"), d.rights.benchmark),
        review_notes=_groups(r.get("review notes"), d.rights.review_notes),
    )
    return Settings(
        model=model,
        max_prompt_chars=num(p, "max_prompt_chars", d.max_prompt_chars, int),
        embeddings_endpoint=e.get("endpoint", d.embeddings_endpoint),
        chart_base_url=a.get("chart_base_url", d.chart_base_url).rstrip("/"),
        rights=rights,
        values_refresh_hours=num(v, "refresh_hours", d.values_refresh_hours),
    )


class VaultSettings:
    """Settings.md, re-read when it changes."""

    def __init__(self, note: Path):
        self.note = note
        self._stamp = None
        self._settings = Settings()

    def current(self) -> Settings:
        try:
            st = self.note.stat()
            stamp = (st.st_mtime_ns, st.st_size)
        except FileNotFoundError:
            return self._settings
        if stamp != self._stamp:
            self._settings = parse_settings(self.note.read_text(encoding="utf-8"))
            self._stamp = stamp
        return self._settings
