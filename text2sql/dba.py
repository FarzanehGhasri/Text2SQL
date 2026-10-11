"""Database checks, run with the READ-ONLY login (or printed for a DBA to run in SSMS).

verify     every catalog source and column exists, the login can SELECT every source, and the login has NO
           database-level write permission (INSERT/UPDATE/DELETE/ALTER/CREATE TABLE/EXECUTE). Empty = all good.
examples   every example (domain notes + Query bank) through the SQL guard, then run: an error = a wrong example.
"""
from __future__ import annotations

from .guard import EntityDef, GuardRejection, SqlGuard
from .model import Catalog
from .retrieval.examples import example_pool


def _q(s: str) -> str:
    return "N'" + str(s).replace("'", "''") + "'"


def verify_sql(catalog: Catalog) -> str:
    rows = [f"({_q(t.name)}, {_q(t.source)}, {_q(c.name)})" for t in catalog.tables if (t.kind or "table") == "table"
            for c in t.columns]
    values = ",\n    ".join(rows)
    return f"""SET NOCOUNT ON;
WITH catalog_columns (entity, source, col) AS (
  SELECT entity, source, col FROM (VALUES
    {values}
  ) AS v (entity, source, col)
),
sources AS (SELECT DISTINCT entity, source FROM catalog_columns)
SELECT problem, entity, source, col FROM (
  SELECT N'source does not exist' AS problem, entity, source, CAST(NULL AS nvarchar(128)) AS col
  FROM sources WHERE OBJECT_ID(source) IS NULL
  UNION ALL
  SELECT N'login cannot SELECT from source', entity, source, NULL
  FROM sources WHERE OBJECT_ID(source) IS NOT NULL AND HAS_PERMS_BY_NAME(source, 'OBJECT', 'SELECT') = 0
  UNION ALL
  SELECT N'column does not exist', entity, source, col
  FROM catalog_columns WHERE OBJECT_ID(source) IS NOT NULL AND COL_LENGTH(source, col) IS NULL
  UNION ALL
  SELECT N'login has database-level ' + p.perm + N' permission (should be read-only)', NULL, DB_NAME(), NULL
  FROM (VALUES (N'INSERT'), (N'UPDATE'), (N'DELETE'), (N'ALTER'), (N'CREATE TABLE'), (N'EXECUTE')) AS p (perm)
  WHERE HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', p.perm) = 1
) AS problems
ORDER BY problem, entity, col"""


def all_entity_defs(catalog: Catalog) -> dict[str, EntityDef]:
    return {t.name: EntityDef(t.name, t.kind or "table", t.source or None, t.sql or None,
                              tuple((c.name, c.alias) for c in t.exposed_columns)) for t in catalog.tables}


def example_checks(catalog: Catalog) -> list[tuple[str, str, str | None, str]]:
    """[(id, question, guarded SQL or None, guard error)] - exactly what would reach SQL Server."""
    defs, guard, out = all_entity_defs(catalog), SqlGuard(), []
    for ex in example_pool(catalog):
        try:
            out.append((ex.id, ex.q, guard.secure(f"UNDERSTOOD: example\nSQL:\n{ex.sql}", defs).sql, ""))
        except GuardRejection as e:
            out.append((ex.id, ex.q, None, str(e)))
    return out


def bank_check_script(catalog: Catalog) -> str:
    """For SSMS: one batch per example; an error right after '<id> | <question>' in Messages = a wrong example."""
    blocks = [f"PRINT {_q(f'{i} | {q}')};\n{sql if sql else '-- rejected by the guard: ' + err};\nGO"
              for i, q, sql, err in example_checks(catalog)]
    return "SET NOCOUNT ON;\nGO\n" + "\n".join(blocks) + "\n"
