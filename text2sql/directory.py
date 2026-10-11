"""Who is asking: the user's AD groups, and what those groups may do.

Groups decide two different things:
  tables  - in the catalog notes (each domain note's "Who may see it"), applied by the table finder
  rights  - in Settings.md ("Who may do what"): error details, benchmark data, review notes; decided here only
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Protocol

from .config import Rights

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class User:
    username: str
    email: str
    groups: tuple[str, ...]


@dataclass(frozen=True)
class Can:
    see_details: bool = False     # the technical error text (SQL Server message, table names)
    eval_mode: bool = False       # the benchmark gets rows and SQL back (only with the x-eval-mode header)
    review_notes: bool = False    # every answer becomes a ✅/❌ review note in Obsidian


def rights_of(groups: tuple[str, ...], rights: Rights, eval_requested: bool = False) -> Can:
    """Group names compare exactly as in AD (spaces included)."""
    def in_any(names):
        return any(g in names for g in groups)
    return Can(in_any(rights.see_details), eval_requested and in_any(rights.benchmark), in_any(rights.review_notes))


class UnknownUser(Exception):
    """The directory has no (or more than one) user with this e-mail."""


class Directory(Protocol):
    def lookup(self, email: str, display_name: str = "") -> User: ...


def group_names(member_of) -> tuple[str, ...]:
    """«CN=IT - Data,OU=...» -> «IT - Data»"""
    items = [member_of] if isinstance(member_of, str) else list(member_of or [])
    return tuple(m.group(1) for m in (re.match(r"^CN=([^,]+)", str(dn), re.I) for dn in items) if m)


class LdapDirectory:
    """Active Directory over LDAP (ldap3): the user whose mail attribute equals the e-mail Open WebUI sends."""

    def __init__(self, url: str, user: str, password: str, base: str):
        self.url, self.user, self.password, self.base = url, user, password, base

    def lookup(self, email: str, display_name: str = "") -> User:
        import ldap3
        from ldap3.utils.conv import escape_filter_chars    # no LDAP injection through the e-mail
        identity = (email or "").strip().lower()
        if not identity:
            raise UnknownUser("⛔ ایمیل کاربر دریافت نشد. ورود به OpenWebUI باید از طریق LDAP باشد.")
        server = ldap3.Server(self.url, get_info=ldap3.NONE, connect_timeout=10)
        with ldap3.Connection(server, self.user, self.password, auto_bind=True, receive_timeout=15) as conn:
            conn.search(self.base, f"(mail={escape_filter_chars(identity)})",
                        attributes=["mail", "cn", "sAMAccountName", "memberOf"], size_limit=2)
            entries = conn.entries
        if not entries:
            raise UnknownUser("⛔ کاربر در دایرکتوری یافت نشد: " + identity)
        if len(entries) > 1:
            # two records for one e-mail: the directory is ambiguous - never guess
            raise UnknownUser("⛔ چند رکورد برای این کاربر در دایرکتوری یافت شد. با تیم IT تماس بگیرید.")
        e = entries[0].entry_attributes_as_dict
        username = (e.get("sAMAccountName") or [display_name])[0] or display_name
        return User(username, identity, group_names(e.get("memberOf") or []))


class StaticDirectory:
    """For local tests and a first run without LDAP: everybody gets the same groups (TEXT2SQL_DEV_GROUPS)."""

    def __init__(self, groups: tuple[str, ...]):
        self.groups = groups
        log.warning("no LDAP configured: every user gets the groups %s - for testing only", ", ".join(groups) or "(none)")

    def lookup(self, email: str, display_name: str = "") -> User:
        identity = (email or "").strip().lower()
        if not identity:
            raise UnknownUser("⛔ ایمیل کاربر دریافت نشد. ورود به OpenWebUI باید از طریق LDAP باشد.")
        return User(display_name or identity, identity, self.groups)
