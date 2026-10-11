"""The whole service with fakes for the model, the database and the directory: the API contract Open WebUI and the
benchmark rely on, the repair try, the Obsidian review loop, and editing the vault while the service runs."""
from __future__ import annotations

import json
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from text2sql.api import create_app
from text2sql.config import VaultSettings
from text2sql.db import FakeRunner, QueryError
from text2sql.directory import StaticDirectory
from text2sql.learn import learn, parse_note
from text2sql.retrieval.vectors import VectorIndex
from text2sql.service import InboxWriter, Text2Sql
from text2sql.values_store import ValueStore, build_index, value_columns
from text2sql.vault.source import VaultCatalog

ROOT = Path(__file__).resolve().parents[2]
SQL = ("SELECT [Dim_SalesOffice].[Name], SUM([Fact_Sales].[EffectiveNetPrice]) AS [Net] FROM [Fact_Sales] "
       "INNER JOIN [Dim_SalesOffice] ON [Fact_Sales].[SalesOffice_Key] = [Dim_SalesOffice].[SalesOffice_key] "
       "WHERE [Fact_Sales].[OrderItemState_Key] NOT IN (6, 7) GROUP BY [Dim_SalesOffice].[Name]")
ROWS = [{"Name": "دفتر فروش تهران", "Net": 1200.5}, {"Name": "دفتر فروش تبریز", "Net": 800}]


class FakeModel:
    def __init__(self, *replies):
        self.replies = list(replies)
        self.prompts: list[str] = []

    def complete(self, prompt):
        self.prompts.append(prompt)
        return {"response": self.replies.pop(0) if len(self.replies) > 1 else self.replies[0]}


@pytest.fixture
def vault(tmp_path):
    v = tmp_path / "obsidian"
    shutil.copytree(ROOT / "obsidian" / "Catalog", v / "Catalog")
    shutil.copy(ROOT / "obsidian" / "Settings.md", v / "Settings.md")
    return v


def make(vault, model, runner, groups=("NLSQL-Full",), api_key=""):
    service = Text2Sql(catalog=VaultCatalog(vault / "Catalog"), settings=VaultSettings(vault / "Settings.md"),
                       model=model, db=runner, vectors=VectorIndex(None, None, "none"),
                       values=ValueStore(vault.parent / "data"), inbox=InboxWriter(vault / "Inbox" / "Review"),
                       clock=lambda: datetime(2026, 10, 11, 9, 30, tzinfo=timezone.utc))
    return service, TestClient(create_app(service, StaticDirectory(tuple(groups)), api_key))


def ask(client, question="فروش خالص هر دفتر فروش", headers=None):
    r = client.post("/webhook/text2sql", json={"question": question, "email": "a@corp.ir", "username": "a"},
                    headers=headers or {})
    assert r.status_code == 200, r.text
    return r.json()


def test_an_answer_is_only_the_answer_and_eval_mode_needs_the_benchmark_group(vault):
    _, client = make(vault, FakeModel(f"UNDERSTOOD: net sales per office\nSQL:\n{SQL}"), FakeRunner(lambda s: ROWS))
    out = ask(client)
    assert list(out) == ["answer"] and "| Name | Net |" in out["answer"] and "1,200.5" in out["answer"]
    assert list(ask(client, headers={"x-eval-mode": "true"})) == ["answer"]          # NLSQL-Full: no eval data
    _, client = make(vault, FakeModel(f"SQL:\n{SQL}"), FakeRunner(lambda s: ROWS), groups=("IT - Data",))
    out = ask(client, headers={"x-eval-mode": "true"})
    assert out["rows"] == ROWS and out["sql"].startswith("WITH [Fact_Sales] AS") and out["retried"] is False
    assert "Fact_Sales" in out["selectedEntities"]


def test_one_repair_try_with_sql_servers_message(vault):
    calls = []

    def db(sql):
        calls.append(sql)
        if len(calls) == 1:
            raise QueryError("Invalid column name 'Nmae'.")
        return ROWS
    model = FakeModel(f"SQL:\n{SQL.replace('[Name]', '[Nmae]')}", f"SQL:\n{SQL}")
    service, client = make(vault, model, FakeRunner(db), groups=("IT - Data",))
    out = ask(client, headers={"x-eval-mode": "true"})
    assert out["retried"] is True and out["rows"] == ROWS
    assert "Invalid column name 'Nmae'." in model.prompts[1] and "Your previous answer was:" in model.prompts[1]


def test_errors_are_readable_and_details_only_for_it(vault):
    _, client = make(vault, FakeModel("SQL:\nSELECT * FROM [dbo].[Secret]"), FakeRunner(lambda s: ROWS))
    assert ask(client)["answer"].startswith("⛔ اجرای این دستور خارج از حیطه دسترسی شماست.")
    _, client = make(vault, FakeModel(f"SQL:\n{SQL}"), FakeRunner(lambda s: (_ for _ in ()).throw(QueryError("deadlock"))))
    assert "deadlock" not in ask(client)["answer"]                                    # technical text hidden
    _, client = make(vault, FakeModel(f"SQL:\n{SQL}"), FakeRunner(lambda s: (_ for _ in ()).throw(QueryError("deadlock"))),
                     groups=("IT - Security",))
    assert ask(client)["answer"] == "deadlock"


def test_review_notes_and_the_learn_loop(vault):
    service, client = make(vault, FakeModel(f"UNDERSTOOD: net sales per office\nSQL:\n{SQL}"), FakeRunner(lambda s: ROWS),
                           groups=("IT - Data",))
    ask(client)
    inbox = vault / "Inbox" / "Review"
    [note] = list(inbox.iterdir())
    assert note.name == "2026-10-11 093000 answered question.md"
    text = note.read_text(encoding="utf-8")
    assert parse_note(text).verdict is None and "python -m text2sql learn" in text and "a@corp.ir" not in text
    note.write_text(text.replace("- [ ] ✅ correct", "- [x] ✅ correct"), encoding="utf-8")
    confirmed = vault.parent / "confirmed.json"
    r = learn(inbox, vault / "Catalog", confirmed)
    assert [x[1] for x in r.learned] == ["conf_20261011_093000"] and not list(inbox.iterdir())
    bank = (vault / "Catalog" / "Query bank.md").read_text(encoding="utf-8")
    assert "- id: `conf_20261011_093000` · status: verified" in bank and "SELECT [Dim_SalesOffice].[Name]" in bank
    assert json.loads(confirmed.read_text(encoding="utf-8"))["questions"][0]["gold_sql"].startswith("WITH ")
    ex = service.catalog.current().bank[-1]                                           # used from the next question
    assert ex.id == "conf_20261011_093000" and ex.status == "verified"


def test_a_question_without_an_answer_leaves_a_note_for_everyone(vault):
    _, client = make(vault, FakeModel("UNDERSTOOD: weather\nSQL:\nSELECT 'NOT_SUPPORTED' AS Status, 'no weather data' AS Reason"),
                     FakeRunner(lambda s: ROWS))
    assert "قابل پاسخ نیست" in ask(client, "هوای تهران فردا")["answer"]
    [note] = list((vault / "Inbox" / "Review").iterdir())
    assert "failed question" in note.name and "type: failed-question" in note.read_text(encoding="utf-8")


def test_an_edit_in_obsidian_is_used_by_the_next_question(vault):
    service, _ = make(vault, FakeModel(f"SQL:\n{SQL}"), FakeRunner(lambda s: ROWS))
    from text2sql.directory import User
    user = User("a", "a@corp.ir", ("NLSQL-Full",))
    word = "کالای پس‌آورده‌شده"
    assert "Fact_ReturnedProduct" not in service._plan(word, user)[1].table_names
    note = vault / "Catalog" / "sales" / "Fact_ReturnedProduct.md"
    time.sleep(0.01)
    note.write_text(note.read_text(encoding="utf-8").replace('  - "برگشتی"', f'  - "برگشتی"\n  - {word}'), encoding="utf-8")
    assert "Fact_ReturnedProduct" in service._plan(word, user)[1].table_names


def test_a_broken_note_keeps_the_last_good_catalog(vault):
    service, client = make(vault, FakeModel(f"SQL:\n{SQL}"), FakeRunner(lambda s: ROWS))
    assert client.get("/health").json()["ok"] is True
    note = vault / "Catalog" / "sales" / "Fact_Sales.md"
    time.sleep(0.01)
    note.write_text(note.read_text(encoding="utf-8").replace("| yes |", "| maybe |", 1), encoding="utf-8")
    assert "| Name |" in ask(client)["answer"]                                     # still answers
    h = client.get("/health").json()
    assert h["ok"] is False and h["notes_with_problems"] == 1
    assert "Show must be" in service.catalog.problems[0].message


def test_api_key_and_the_openai_compatible_endpoint(vault):
    _, client = make(vault, FakeModel(f"SQL:\n{SQL}"), FakeRunner(lambda s: ROWS), api_key="k1")
    assert client.post("/webhook/text2sql", json={"question": "x", "email": "a@corp.ir"}).status_code == 401
    h = {"Authorization": "Bearer k1", "X-OpenWebUI-User-Email": "a@corp.ir"}
    assert client.get("/v1/models", headers=h).json()["data"][0]["id"] == "text2sql"
    body = {"model": "text2sql", "messages": [{"role": "user", "content": "فروش خالص هر دفتر فروش"}]}
    r = client.post("/v1/chat/completions", json=body, headers=h).json()
    assert "| Name | Net |" in r["choices"][0]["message"]["content"]
    r = client.post("/v1/chat/completions", json=dict(body, stream=True), headers=h)
    events = [json.loads(l[6:]) for l in r.text.split("\n\n") if l.startswith("data: {")]
    assert "| Name | Net |" in events[0]["choices"][0]["delta"]["content"] and r.text.rstrip().endswith("data: [DONE]")


def test_value_index_from_database_rows(vault):
    catalog = VaultCatalog(vault / "Catalog").current()
    cols = {(c.entity, c.column) for c in value_columns(catalog)}
    assert ("Dim_SalesOffice", "Name") in cols and not any(c.endswith("_Key") for _, c in cols)
    index = build_index([{"entity": "Dim_SalesOffice", "column": "Name", "value": " دفتر فروش تهران ", "rows": "5", "key_value": "1"},
                         {"entity": "Dim_SalesOffice", "column": "Name", "value": "دفتر فروش تهران", "rows": 2, "key_value": "1"},
                         {"entity": "Fact_Sales", "column": "NotAColumn", "value": "x", "rows": 1, "key_value": None}], catalog)
    [col] = index["columns"]
    assert col["values"] == [["دفتر فروش تهران", 7, "1"]] and col["key"] == "SalesOffice_key"
