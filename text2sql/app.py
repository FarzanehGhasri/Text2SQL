"""Composition root: the one place that picks real implementations from the environment (config.py).
Everything else receives its dependencies, so tests and the CLI can swap any of them."""
from __future__ import annotations

import logging
import os

from .config import Paths, Secrets, VaultSettings
from .db import AuditLog, QueryError, SqlServerRunner
from .directory import Directory, LdapDirectory, StaticDirectory, UnknownUser, User
from .llm import make_model
from .retrieval.vectors import TeiEmbedder, VectorIndex
from .service import InboxWriter, Text2Sql
from .values_store import ValueStore
from .vault.source import VaultCatalog

log = logging.getLogger(__name__)


class NoDatabase:
    """TEXT2SQL_DB not set: everything up to the SQL works (useful for a first test); running it does not."""

    def run(self, sql: str) -> list[dict]:
        raise QueryError("⛔ پایگاه داده تنظیم نشده است (TEXT2SQL_DB).")

    run_trusted = run


class NoDirectory:
    def lookup(self, email: str, display_name: str = "") -> User:
        raise UnknownUser("⛔ دایرکتوری کاربران تنظیم نشده است (TEXT2SQL_LDAP_URL).")


def make_directory(secrets: Secrets, env=os.environ) -> Directory:
    if secrets.ldap_url:
        return LdapDirectory(secrets.ldap_url, secrets.ldap_user, secrets.ldap_password,
                             secrets.ldap_base or "OU=People,DC=alborz,DC=local")
    dev = env.get("TEXT2SQL_DEV_GROUPS", "")
    if dev:
        return StaticDirectory(tuple(g.strip() for g in dev.split(",") if g.strip()))
    return NoDirectory()


def build(env=os.environ) -> tuple[Text2Sql, Directory, Secrets]:
    paths, secrets = Paths.from_env(env), Secrets.from_env(env)
    settings = VaultSettings(paths.settings_note)
    s = settings.current()
    db = SqlServerRunner(secrets.db) if secrets.db else NoDatabase()
    embedder = TeiEmbedder(s.embeddings_endpoint) if s.embeddings_endpoint else None
    service = Text2Sql(
        catalog=VaultCatalog(paths.catalog),
        settings=settings,
        model=_LiveModel(settings, secrets.llm_api_key),
        db=db,
        vectors=VectorIndex(embedder, paths.data, s.embeddings_endpoint),
        values=ValueStore(paths.data, db if secrets.db else None),
        inbox=InboxWriter(paths.inbox),
        audit=AuditLog(secrets.audit_db) if secrets.audit_db else None,
    )
    return service, make_directory(secrets, env), secrets


class _LiveModel:
    """The model adapter for the CURRENT Settings.md (a changed endpoint or temperature applies immediately)."""

    def __init__(self, settings: VaultSettings, api_key: str):
        self.settings, self.api_key = settings, api_key
        self._for = None
        self._model = None

    def complete(self, prompt: str):
        m = self.settings.current().model
        if m != self._for:
            self._model, self._for = make_model(m, self.api_key), m
        return self._model.complete(prompt)
