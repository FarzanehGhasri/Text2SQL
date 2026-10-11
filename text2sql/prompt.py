"""Writes the prompt from a Plan. No catalog access: only what the plan carries.

  1. pack     tables top-down into the character budget (the first one always); each costs its DDL + the new
              relationship lines + its table-scoped rules
  2. tidy     examples / values / metrics whose tables did not fit are dropped
  3. render   rules + today + domain notes + metrics + values + examples + tables + relationships + question
To change the wording, change render_prompt only. The answer shape (UNDERSTOOD / PLAN / SQL) is a contract with
the SQL guard, so it is not a setting.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from .guard import EntityDef
from .model import Join
from .retrieval.finder import Plan, PlanExample, PlanMetric, PromptTable
from .retrieval.values import ValueLine

TEHRAN = ZoneInfo("Asia/Tehran")


# ---------------------------------------------------------------- today, in both calendars
_PERSIAN_EPOCH = 1948320            # Julian day of 1 Farvardin 1 (ICU PersianCalendar)
_CUM_DAYS = (0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336)


def persian_date(d: date) -> tuple[int, int, int]:
    """Gregorian -> Persian (year, month, day), ICU's arithmetic calendar (what the JavaScript Intl used)."""
    jd = d.toordinal() + 1721425
    days = jd - _PERSIAN_EPOCH
    year = 1 + (33 * days + 3) // 12053
    farvardin1 = 365 * (year - 1) + (8 * year + 21) // 33
    day_of_year = days - farvardin1
    month = day_of_year // 31 if day_of_year < 216 else (day_of_year - 6) // 30
    return year, month + 1, day_of_year - _CUM_DAYS[month] + 1


def today_line(now: datetime) -> str:
    local = (now if now.tzinfo else now.replace(tzinfo=timezone.utc)).astimezone(TEHRAN).date()
    y, m, d = persian_date(local)
    return (f"- TODAY is {local.isoformat()} (Persian date {y:04d}/{m:02d}/{d:02d}). Resolve relative periods "
            "(امسال، ماه گذشته، this year, last month) from it.\n"
            "- A year like 1403 / ۱۴۰۳ is a Persian (شمسی) year, 2024 is Gregorian (میلادی). Filter Persian years and "
            "months with the Persian columns of [Dim_Date] (or a Persian date column of the table itself); use "
            "YEAR()/MONTH() only for Gregorian periods.\n")


# ---------------------------------------------------------------- pieces
def sql_lit(v) -> str:
    return "N'" + str(v).replace("'", "''") + "'"


def value_line(l: ValueLine) -> str:
    ref = f"[{l.entity}].[{l.column}]"
    key = f"  (key: [{l.entity}].[{l.key}] = {_js(l.key_value)})" if l.key and l.key_value is not None else ""
    if l.exact:
        return f"- {ref} = {sql_lit(l.value)}{key}\n"
    if l.count == 1:
        return f"- {ref}: the only stored value containing {sql_lit(l.phrase)} is {sql_lit(l.samples[0])}{key}\n"
    return (f"- {ref}: {l.count} stored values contain {sql_lit(l.phrase)}, e.g. {', '.join(map(sql_lit, l.samples))}"
            f" -> LIKE {sql_lit('%' + l.phrase + '%')} if the question means all of them\n")


def _js(v) -> str:
    """A value as JavaScript prints it in a template string (1 not 1.0)."""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def metric_line(m: PlanMetric) -> str:
    return (f"- {m.name_fa} = {m.sql}" + (f"   (always filter: {m.filter})" if m.filter else "")
            + (f"   -- {m.note_fa}" if m.note_fa else "") + "\n")


def ddl(t: PromptTable) -> str:
    lines = []
    for i, c in enumerate(t.columns):
        last = i == len(t.columns) - 1
        vals = (("; " if c.description_fa else "") + "values: " + ", ".join(sql_lit(str(v)[:30]) for v in c.samples)
                if c.samples is not None else "")
        comment = f"   -- {c.description_fa}{vals}" if c.description_fa or vals else ""
        lines.append(f"  [{c.alias or c.name}] {c.type or 'nvarchar'}{'' if last else ','}{comment}")
    head = f"CREATE TABLE [{t.name}] (   -- {t.description_fa}" if t.description_fa else f"CREATE TABLE [{t.name}] ("
    return f"{head}\n" + "\n".join(lines) + "\n);\n"


def rel_line(j: Join) -> str:
    return f"-- [{j.from_table}].[{j.from_column}] = [{j.to_table}].[{j.to_column}]\n"


HINTS_HEADER = "\nDOMAIN NOTES:\n"
VALUES_HEADER = ("\nVALUES FROM THE QUESTION (spelled exactly as stored in the database; filter with these, "
                 "not with your own spelling):\n")
METRICS_HEADER = "\nMETRICS (when the question asks for one of these, use exactly this definition):\n"


def render_prompt(*, question: str, low_confidence: bool, hints: list[str], examples: list[PlanExample], schema: str,
                  rels: str, values: list[ValueLine] = (), metrics: list[PlanMetric] = (), today: str = "",
                  rules: list[str] = ()) -> str:
    low = ("\nNOTE: none of the available entities scored as a strong semantic/keyword match for this question, so it "
           "is likely NOT answerable with the schema below. Prefer the NOT_SUPPORTED response above unless one of "
           "these entities genuinely answers the question.\n") if low_confidence else ""
    return f"""You are a Microsoft SQL Server (T-SQL) expert.

Your response must have EXACTLY this shape and nothing else:
UNDERSTOOD: <one concise English sentence restating what the question is asking for - always in English, even though the question may be in Persian>
PLAN:
- tables: <the entities needed and the relationship used to join each one>
- filters: <the WHERE conditions, using the exact values/keys from VALUES and the filters from METRICS>
- result: <what is selected and aggregated, GROUP BY, ORDER BY, TOP N>
SQL:
<a single T-SQL SELECT query that follows the PLAN - no markdown fences, no explanation>

RULES:
- Microsoft SQL Server. Use SELECT TOP N. NEVER use LIMIT.
- TOP comes immediately after SELECT.
- The entities below are ready-made views. Query them directly.
- Use ONLY these entities, columns and relationships. Names EXACTLY as listed, in [square brackets].
- Write every Persian (or any non-English) string literal with the N prefix: N'تهران', never 'تهران'.
{today}{''.join(f'- {r}{chr(10)}' for r in rules)}- The question may be written in Persian. Understand it, but respond only with SQL.
- Write the PLAN first and check it against the entities, relationships and notes below; then write SQL that does exactly what the PLAN says. Keep the PLAN to the three short lines.
- If the question needs a table, column or business concept that is NOT among the entities/columns below, do NOT substitute a similar-looking one and do NOT guess. Respond instead with exactly this shape (no PLAN needed):
UNDERSTOOD: <state in English what data would be needed and that it is not available>
SQL:
SELECT 'NOT_SUPPORTED' AS Status, 'briefly say in English what is missing' AS Reason
{low}{HINTS_HEADER + ''.join('- ' + h + chr(10) for h in hints) if hints else ''}{METRICS_HEADER + ''.join(map(metric_line, metrics)) if metrics else ''}{VALUES_HEADER + ''.join(map(value_line, values)) if values else ''}
{'Examples of correct SQL for similar questions (only the SQL part is shown):' + chr(10) if examples else ''}{(chr(10) + chr(10)).join(f'Example {i}:{chr(10)}Q: {e.q}{chr(10)}SQL: {e.sql}' for i, e in enumerate(examples, start=1))}

Available entities:
{schema}Relationships:
{rels}
Q: {question}
A:"""


# ---------------------------------------------------------------- packing
@dataclass(frozen=True)
class Prompt:
    text: str
    tables: tuple[PromptTable, ...]                 # what fitted, in order
    entity_defs: dict[str, EntityDef]               # what the SQL guard may let the model read
    examples: tuple[PlanExample, ...]
    values: tuple[ValueLine, ...]
    metrics: tuple[PlanMetric, ...]

    @property
    def table_names(self) -> list[str]:
        return [t.name for t in self.tables]


class PromptBuilder:
    def __init__(self, max_chars: int = 24000):
        self.max_chars = max_chars                  # ~8k Qwen tokens: room left for PLAN and SQL in a 32k window

    def build(self, plan: Plan, now: datetime) -> Prompt:
        today = today_line(now)
        rules = list(plan.rules)
        fixed = render_prompt(question=plan.question, low_confidence=plan.low_confidence, hints=list(plan.domain_hints),
                              today=today, rules=rules, examples=list(plan.examples), values=list(plan.values),
                              metrics=list(plan.metrics), schema="", rels="")
        budget = self.max_chars - len(fixed) - (0 if plan.domain_hints else len(HINTS_HEADER))
        final, names, seen_rel, hint_set = [], set(), set(), []
        hints = list(plan.domain_hints)
        schema = rels = ""
        for t in plan.tables:
            text = ddl(t) + "\n"
            new_rels = []
            for j in plan.joins:
                touches = ((j.from_table == t.name and (j.to_table in names or j.to_table == t.name))
                           or (j.to_table == t.name and j.from_table in names))
                if not touches:
                    continue
                line = rel_line(j)
                if line not in seen_rel and line not in new_rels:
                    new_rels.append(line)
            new_hints = [h for h in plan.scoped_hints if not any(h is x for x in hint_set) and t.name in (h.entities or ())]
            cost = len(text) + len("".join(new_rels)) + len("".join("- " + h.text + "\n" for h in new_hints))
            if cost > budget and final:
                continue
            budget -= cost
            schema += text
            for l in new_rels:
                seen_rel.add(l)
                rels += l
            for h in new_hints:
                hint_set.append(h)
                hints.append(h.text)
            names.add(t.name)
            final.append(t)
        examples = [e for e in plan.examples if all(n in names for n in e.tables)]
        values = [l for l in plan.values if l.entity in names]
        metrics = [m for m in plan.metrics if all(n in names for n in m.tables)]
        text = render_prompt(question=plan.question, low_confidence=plan.low_confidence, hints=hints, today=today,
                             rules=rules, examples=examples, values=values, metrics=metrics, schema=schema, rels=rels)
        defs = {t.name: EntityDef(t.name, t.kind or "table", t.source, t.sql,
                                  tuple((c.name, c.alias) for c in t.columns)) for t in final}
        return Prompt(text, tuple(final), defs, tuple(examples), tuple(values), tuple(metrics))
