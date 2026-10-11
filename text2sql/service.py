"""One question, start to answer. Everything it needs comes in through interfaces (the vault, the model, the
database, the directory), so each part can be replaced or faked on its own.

  vault catalog + settings -> find tables -> prompt -> model -> SQL guard -> database
      (on a database error: one repair try with SQL Server's message) -> answer
  side effects that never cost the user the answer: audit row, Obsidian review note
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .answer import ChartSettings, format_answer, format_error
from .config import VaultSettings
from .db import AuditLog, QueryError, QueryRunner
from .directory import Can, User, rights_of
from .guard import GuardedSql, SqlGuard
from .llm import LanguageModel
from .prompt import Prompt, PromptBuilder
from .retrieval.finder import Plan, TableFinder
from .retrieval.vectors import VectorIndex
from .review_notes import NoteFile, answered_note, failed_note
from .values_store import ValueStore
from .vault.source import VaultCatalog

log = logging.getLogger(__name__)

MAX_ERROR_CHARS = 1000


def repair_prompt(original: str, failed_sql: str, error: str) -> str:
    """The same prompt (tables, rules, question) + the failed SQL + SQL Server's error, same answer shape."""
    return f"""{original}

Your previous answer was:
{failed_sql}

Running it against Microsoft SQL Server failed with this error:
{error[:MAX_ERROR_CHARS]}

Fix the query so it runs successfully. Reply in the exact same shape as before:
UNDERSTOOD: <English sentence>
PLAN:
- error: <what in the previous query caused this error>
- tables / filters / result: <the corrected plan, in one or two short lines>
SQL:
<the corrected T-SQL SELECT query>
Use ONLY the listed entities and columns with their exact names. No markdown fences, no other text."""


@dataclass
class Outcome:
    """What the API returns. `answer` is all Open WebUI shows; the rest is for eval mode, logs and notes."""
    answer: str
    ok: bool
    rows: list[dict] = field(default_factory=list)
    guarded: GuardedSql | None = None
    prompt: Prompt | None = None
    plan: Plan | None = None
    retried: bool = False
    error: str = ""
    eval_mode: bool = False        # the asker may get rows and SQL back (benchmark)

    def response(self) -> dict:
        """{answer}; in eval mode the shape the benchmark expects (same as the old workflow's)."""
        if not self.eval_mode:
            return {"answer": self.answer}
        selected = self.prompt.table_names if self.prompt else []
        if not self.ok:
            return {"answer": self.answer, "error": self.error or self.answer, "selectedEntities": selected}
        g = self.guarded
        return {"answer": self.answer, "rows": self.rows, "sql": g.sql, "modelSql": g.model_sql,
                "understood": g.understood, "plan": g.plan, "retried": self.retried, "selectedEntities": selected}


class InboxWriter:
    """Writes review notes into the vault's Inbox/Review folder (never the user's name or e-mail)."""

    def __init__(self, folder: Path):
        self.folder = folder

    def write(self, note: NoteFile) -> None:
        try:
            self.folder.mkdir(parents=True, exist_ok=True)
            (self.folder / note.name).write_text(note.markdown, encoding="utf-8")
        except OSError as e:
            log.warning("review note not written: %s", e)


class Text2Sql:
    def __init__(self, *, catalog: VaultCatalog, settings: VaultSettings, model: LanguageModel, db: QueryRunner,
                 vectors: VectorIndex, values: ValueStore, inbox: InboxWriter | None = None,
                 audit: AuditLog | None = None, finder: TableFinder | None = None, guard: SqlGuard | None = None,
                 clock=lambda: datetime.now(timezone.utc)):
        self.catalog, self.settings, self.model, self.db = catalog, settings, model, db
        self.vectors, self.values, self.inbox, self.audit = vectors, values, inbox, audit
        self.finder = finder or TableFinder()
        self.guard = guard or SqlGuard(log=lambda m: log.info(m))
        self.clock = clock

    # ------------------------------------------------------------------ the steps
    def _plan(self, question: str, user: User) -> tuple[Plan, Prompt]:
        catalog = self.catalog.current()
        vectors = self.vectors.current(catalog)
        qv = self.vectors.embed_question(question) if not vectors.empty else None
        plan = self.finder.find(catalog, question, list(user.groups), vectors, qv, self.values.current())
        prompt = PromptBuilder(self.settings.current().max_prompt_chars).build(plan, self.clock())
        log.info("SELECTED | %s | chars=%d | lowConfidence=%s", ", ".join(prompt.table_names), len(prompt.text),
                 plan.low_confidence)
        return plan, prompt

    def _run(self, prompt: Prompt) -> tuple[GuardedSql, list[dict], bool]:
        guarded = self.guard.secure(self.model.complete(prompt.text), prompt.entity_defs)
        try:
            return guarded, self.db.run(guarded.sql), False
        except QueryError as e:
            log.info("QUERY FAILED, one repair try | %s", str(e)[:200])
            fix = repair_prompt(prompt.text, guarded.model_sql or guarded.sql, str(e))
            guarded = self.guard.secure(self.model.complete(fix), prompt.entity_defs)
            return guarded, self.db.run(guarded.sql), True

    # ------------------------------------------------------------------ one question
    def ask(self, question: str, user: User, eval_requested: bool = False, record: bool = True) -> Outcome:
        """record=False: no audit row, no review note (benchmark runs)."""
        settings = self.settings.current()
        can = rights_of(user.groups, settings.rights, eval_requested)
        plan = prompt = None
        try:
            plan, prompt = self._plan(question, user)
            guarded, rows, retried = self._run(prompt)
        except Exception as e:  # noqa: BLE001 - every failure becomes a message the user can read
            raw = str(e) if str(e) else type(e).__name__
            if not raw.startswith("⛔"):
                log.exception("question failed")
            out = Outcome(format_error(raw, can.see_details), ok=False, prompt=prompt, plan=plan, error=raw,
                          eval_mode=can.eval_mode)
            if record and not can.eval_mode:          # benchmark runs never write notes
                self._notes_failed(question, out)
            return out

        answer = format_answer(rows, question, guarded.thinking, ChartSettings(base_url=settings.chart_base_url))
        out = Outcome(answer, True, rows, guarded, prompt, plan, retried, eval_mode=can.eval_mode)
        if self.audit and record:
            self.audit.write(username=user.username or "unknown", question=question, generated_sql=guarded.sql,
                             understood=guarded.understood, thinking=guarded.thinking, attempt=2 if retried else 1,
                             status="SUCCESS", row_count=len(rows))
        if record and can.review_notes and not can.eval_mode:
            self._notes_answered(question, out)
        return out

    # ------------------------------------------------------------------ Obsidian review notes
    def _why(self, out: Outcome):
        r = out.plan.retrieval if out.plan else {}
        return r.get("why", {}), r.get("active_domains", []), bool(r.get("low_confidence"))

    def _notes_answered(self, question: str, out: Outcome) -> None:
        if not self.inbox:
            return
        why, domains, _ = self._why(out)
        g = out.guarded
        self.inbox.write(answered_note(question=question, understood=g.understood, answer=out.answer,
                                       model_sql=g.model_sql, sql=g.sql, selected_entities=out.prompt.table_names,
                                       why=why, used_entities=list(g.entities), domains=domains, now=self.clock()))

    def _notes_failed(self, question: str, out: Outcome) -> None:
        if not self.inbox:
            return
        why, domains, low = self._why(out)
        self.inbox.write(failed_note(question=question, answer=out.answer,
                                     selected_entities=out.prompt.table_names if out.prompt else [],
                                     why=why, domains=domains, low_confidence=low, now=self.clock()))


class Refresher(threading.Thread):
    """Background upkeep, never blocking a question: the System check note when the catalog notes change, and the
    value index every Settings -> Values -> refresh_hours."""

    def __init__(self, service: Text2Sql, on_catalog_change=None, every_seconds: float = 30):
        super().__init__(daemon=True, name="text2sql-upkeep")
        self.service = service
        self.on_catalog_change = on_catalog_change
        self.every = every_seconds
        self._halt = threading.Event()
        self._seen = None

    def run(self) -> None:
        while not self._halt.is_set():
            try:
                catalog = self.service.catalog.current()
                stamp = (id(catalog), len(self.service.catalog.problems))
                if stamp != self._seen and self.on_catalog_change:
                    self._seen = stamp
                    self.on_catalog_change()
                hours = self.service.settings.current().values_refresh_hours
                age = self.service.values.age_hours()
                if self.service.values.runner is not None and hours > 0 and (age is None or age >= hours):
                    log.info("value index: %s", self.service.values.refresh(catalog))
            except Exception as e:  # noqa: BLE001
                log.warning("upkeep failed: %s", e)
            self._halt.wait(self.every)

    def stop(self) -> None:
        self._halt.set()
