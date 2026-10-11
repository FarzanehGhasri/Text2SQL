"""SQL Server access (database administrator's view).

Two logins, never mixed:
  read-only  (TEXT2SQL_DB)        runs the model's SQL and the value-index queries. db_datareader only: even SQL
                                  that slipped past the guard cannot write. ApplicationIntent=ReadOnly lets an
                                  Availability Group route it to a readable secondary.
  audit      (TEXT2SQL_AUDIT_DB)  INSERT on [dbo].[NLSQL_AuditLog] and nothing else (sql/NLSQL_AuditLog.sql).

Every model query: SET LOCK_TIMEOUT (never wait behind ETL locks for long), a statement timeout, and at most
max_rows rows fetched (the guard also injects TOP 200). Errors come back as QueryError with SQL Server's message,
which is what the repair prompt needs.
"""
from __future__ import annotations

import datetime as dt
import decimal
import logging
import uuid
from dataclasses import dataclass
from typing import Protocol

log = logging.getLogger(__name__)


class QueryError(Exception):
    """SQL Server rejected or failed the query; the message is SQL Server's own."""


class QueryRunner(Protocol):
    def run(self, sql: str) -> list[dict]: ...          # model SQL, already guarded
    def run_trusted(self, sql: str) -> list[dict]: ...  # the service's own fixed queries (value index)


def _plain(v):
    """Values as the old workflow returned them (JSON-friendly)."""
    if isinstance(v, decimal.Decimal):
        return int(v) if v == v.to_integral_value() and abs(v) < 2 ** 53 else float(v)
    if isinstance(v, dt.datetime):
        return v.isoformat()
    if isinstance(v, (dt.date, dt.time)):
        return v.isoformat()
    if isinstance(v, (bytes, bytearray, memoryview)):
        return "0x" + bytes(v).hex()
    if isinstance(v, uuid.UUID):
        return str(v)
    return v


@dataclass
class SqlServerRunner:
    connection_string: str
    query_timeout_seconds: int = 60
    lock_timeout_ms: int = 10000
    max_rows: int = 200

    def _connect(self):
        import pyodbc  # imported here: the service starts (and tests run) without the ODBC driver
        conn = pyodbc.connect(self.connection_string, timeout=15, autocommit=True, readonly=True)
        conn.timeout = self.query_timeout_seconds
        return conn

    def _execute(self, sql: str, limit: int | None) -> list[dict]:
        import pyodbc
        try:
            conn = self._connect()
        except pyodbc.Error as e:
            raise QueryError(f"cannot connect to the database: {e.args[-1] if e.args else e}") from e
        try:
            cur = conn.cursor()
            cur.execute(f"SET NOCOUNT ON; SET LOCK_TIMEOUT {int(self.lock_timeout_ms)};")
            cur.execute(sql)
            while cur.description is None and cur.nextset():
                pass
            if cur.description is None:
                return []
            names = [d[0] for d in cur.description]
            rows = cur.fetchmany(limit) if limit else cur.fetchall()
            return [{n: _plain(v) for n, v in zip(names, r)} for r in rows]
        except pyodbc.Error as e:
            msg = e.args[-1] if e.args else str(e)
            # drop the ODBC driver prefix: SQL Server's own message is what the model and the user need
            raise QueryError(str(msg).split("[SQL Server]")[-1].strip()) from e
        finally:
            conn.close()

    def run(self, sql: str) -> list[dict]:
        return self._execute(sql, self.max_rows)

    def run_trusted(self, sql: str) -> list[dict]:
        return self._execute(sql, None)


@dataclass
class AuditLog:
    """One row per answer in [dbo].[NLSQL_AuditLog]; never breaks an answer (errors are logged)."""
    connection_string: str

    def write(self, *, username: str, question: str, generated_sql: str, understood: str, thinking: str,
              attempt: int, status: str, row_count: int) -> None:
        if not self.connection_string:
            return
        try:
            import pyodbc
            with pyodbc.connect(self.connection_string, timeout=5, autocommit=True) as conn:
                conn.cursor().execute(
                    "INSERT INTO [dbo].[NLSQL_AuditLog] (username, question, generated_sql, understood_query, thinking, "
                    "attempt, status, row_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    username, question, generated_sql, understood, thinking, attempt, status, row_count)
        except Exception as e:  # noqa: BLE001 - auditing must never cost the user the answer
            log.warning("audit log write failed: %s", e)


class FakeRunner:
    """For tests and dry runs: answers from a function sql -> rows (or raises QueryError)."""

    def __init__(self, answer):
        self.answer = answer
        self.queries: list[str] = []

    def run(self, sql: str) -> list[dict]:
        self.queries.append(sql)
        return self.answer(sql)

    run_trusted = run
