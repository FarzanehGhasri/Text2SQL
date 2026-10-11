"""python -m text2sql <command>

  serve                      the API for Open WebUI (port 8000)
  ask "question"             one question from the terminal (--groups, --prompt-only)
  check                      validate the vault and write Inbox/System check.md
  validate [--schema f.sql]  catalog notes: errors and warnings (with --schema: against the real database script)
  learn [--dry-run]          ✅ review notes -> Query bank + confirmed benchmark questions
  benchmark retrieval        do the needed tables reach the prompt? (no model, no database)
  benchmark e2e [--limit n]  model + database against the correct SQL; result -> Inbox/Benchmark.md
  values refresh             read the value index from the database now
  values import file.csv     or from an SSMS export of the old sql/extract_values.sql
  db verify [--print]        catalog vs database, and the login is really read-only
  db examples [--print]      run every example; list the broken ones
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK = ROOT / "benchmark" / "02"


def _service():
    from .app import build
    return build()


def cmd_serve(a):
    import uvicorn
    from .api import create_app
    from .service import Refresher
    service, directory, secrets = _service()
    Refresher(service, on_catalog_change=lambda: _write_check(service)).start()
    uvicorn.run(create_app(service, directory, secrets.api_key), host=a.host, port=a.port, log_level="info")


def _write_check(service):
    from .checks import run_check
    from .config import Paths
    run_check(service, BENCHMARK, Paths.from_env().vault / "Inbox" / "System check.md")


def cmd_ask(a):
    from .directory import User
    service, directory, _ = _service()
    user = User("cli", a.email or "cli@local", tuple(g.strip() for g in a.groups.split(",") if g.strip())) if a.groups \
        else directory.lookup(a.email)
    if a.prompt_only:
        plan, prompt = service._plan(a.question, user)
        print(prompt.text)
        print("\n# tables:", ", ".join(prompt.table_names), file=sys.stderr)
        print("# why:", json.dumps(plan.retrieval["why"], ensure_ascii=False, indent=1), file=sys.stderr)
        return
    out = service.ask(a.question, user, record=False)
    print(out.answer)
    if out.guarded:
        print("\n-- SQL:\n" + out.guarded.sql, file=sys.stderr)


def cmd_check(a):
    service, _, _ = _service()
    from .checks import run_check
    from .config import Paths
    out = None if a.no_write else Paths.from_env().vault / "Inbox" / "System check.md"
    print(run_check(service, BENCHMARK, out))


def cmd_validate(a):
    from .config import Paths
    from .vault.source import read_notes
    from .vault.catalog_notes import parse_catalog
    from .vault.validator import read_schema_file, validate
    catalog, problems = parse_catalog(read_notes(Paths.from_env().catalog))
    if not problems:
        problems = validate(catalog, read_schema_file(Path(a.schema)) if a.schema else None)
    errors = [p for p in problems if p.severity == "error"]
    for p in problems:
        if p.severity == "error" or not a.quiet:
            print(f"{'⛔' if p.severity == 'error' else '⚠️'} {p.note}: {p.message}")
    print(f"{len(catalog.domains)} domains, {len(catalog.tables)} tables, {len(catalog.bank)} bank examples: "
          f"{len(errors)} errors, {len(problems) - len(errors)} warnings")
    sys.exit(1 if errors else 0)


def cmd_learn(a):
    from .config import Paths
    from .learn import learn
    p = Paths.from_env()
    r = learn(p.inbox, p.catalog, BENCHMARK / "confirmed.json", dry_run=a.dry_run)
    for f, i, q in r.learned:
        print(f"✅ learned {i}: {q}")
    for s in r.skipped:
        print(f"   skipped {s}")
    if r.wrong:
        print(f"❌ {len(r.wrong)} note(s) marked wrong stay in Inbox/Review - each says what to fix.")
    if r.unticked:
        print(f"   {r.unticked} note(s) not ticked yet.")
    if not r.learned:
        print("Nothing new to learn.")
    elif a.dry_run:
        print("(dry run - nothing was changed)")
    else:
        print(f"\nAdded {len(r.learned)} verified example(s). The service uses them from the next question on.\n"
              "Commit and push: obsidian/Catalog/Query bank.md, benchmark/02/confirmed.json")


def cmd_benchmark(a):
    from .benchmark import SETS, end_to_end, load_set, retrieval_benchmark
    service, _, _ = _service()
    names = [a.set] if a.set else [n for n, _ in SETS]
    if a.kind == "retrieval":
        catalog = service.catalog.current()
        vectors = service.vectors.current(catalog)
        embed = (lambda t: service.vectors.embed_question(t)) if not vectors.empty else None
        for n in names:
            qs = load_set(BENCHMARK, n)
            rs = retrieval_benchmark(qs, catalog, vectors, embed, service.values.current())
            checked = [r for r in rs if r.checked]
            for q, r in zip(qs, rs):
                if r.checked and not r.passed:
                    print(f"FAIL {r.id}: missing {', '.join(r.missing) or '-'}{' leaked ' + ', '.join(r.leaked) if r.leaked else ''} «{q['question'][:70]}»")
            print(f"{n}: {sum(r.passed for r in checked)}/{len(checked)} (meaning search {'on' if embed else 'off'})")
        return
    qs = [q for n in names for q in load_set(BENCHMARK, n)][: a.limit or None]
    report = end_to_end(service, service.db, qs)
    print("\n".join(report["summary"]["inPlainWords"]))
    data = ROOT / "data"
    data.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    (data / f"benchmark-{stamp}.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    from .config import Paths
    note = Paths.from_env().vault / "Inbox" / "Benchmark.md"
    s = report["summary"]
    lines = ["---", "type: benchmark", f"date: {stamp}", "---", "# Benchmark", "", *[f"- {w}" for w in s["inPlainWords"]],
             "", "## By kind of failure", "", *[f"- {x['failure_type']}: {x['count']}" for x in s["byFailureType"]],
             "", "## Failed questions", "", *[f"- `{x['id']}` {x['meaning']} - {x['note'][:200]}" for x in s["failed"]],
             "", f"Full details: `data/benchmark-{stamp}.json`. Add a row to *Results* in [[Home]]."]
    note.parent.mkdir(parents=True, exist_ok=True)
    note.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWritten to Inbox/Benchmark.md and data/benchmark-{stamp}.json")


def cmd_values(a):
    service, _, _ = _service()
    if a.action == "refresh":
        print(service.values.refresh(service.catalog.current()))
    else:
        from .values_store import build_index, read_csv
        index = build_index(read_csv(Path(a.file)), service.catalog.current())
        service.values.save(index)
        print(f"{len(index['columns'])} columns, {sum(len(c['values']) for c in index['columns'])} values -> data/values.json")


def cmd_db(a):
    from .dba import bank_check_script, example_checks, verify_sql
    service, _, _ = _service()
    catalog = service.catalog.current()
    if a.action == "verify":
        if a.print:
            print(verify_sql(catalog))
            return
        rows = service.db.run_trusted(verify_sql(catalog))
        for r in rows:
            print(f"⛔ {r['problem']}: {r.get('entity') or ''} {r.get('source') or ''} {r.get('col') or ''}")
        print("✅ catalog and database agree; the login is read-only." if not rows else f"{len(rows)} problem(s)")
        sys.exit(1 if rows else 0)
    if a.print:
        print(bank_check_script(catalog))
        return
    bad = 0
    for ex_id, q, sql, err in example_checks(catalog):
        if sql is None:
            bad += 1
            print(f"⛔ {ex_id} «{q}»: {err}")
            continue
        try:
            service.db.run(sql)
        except Exception as e:  # noqa: BLE001
            bad += 1
            print(f"⛔ {ex_id} «{q}»: {str(e)[:200]}")
    print(f"{bad} broken example(s)." if bad else "✅ every example runs.")


def main(argv=None):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(prog="python -m text2sql", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="command", required=True)
    s = sub.add_parser("serve")
    s.add_argument("--host", default="0.0.0.0")
    s.add_argument("--port", type=int, default=8000)
    s.set_defaults(fn=cmd_serve)
    s = sub.add_parser("ask")
    s.add_argument("question")
    s.add_argument("--email", default="")
    s.add_argument("--groups", default="", help='e.g. "NLSQL-sales" (skips the directory)')
    s.add_argument("--prompt-only", action="store_true", help="show the prompt and the chosen tables; no model call")
    s.set_defaults(fn=cmd_ask)
    s = sub.add_parser("check")
    s.add_argument("--no-write", action="store_true")
    s.set_defaults(fn=cmd_check)
    s = sub.add_parser("validate")
    s.add_argument("--schema")
    s.add_argument("--quiet", action="store_true")
    s.set_defaults(fn=cmd_validate)
    s = sub.add_parser("learn")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_learn)
    s = sub.add_parser("benchmark")
    s.add_argument("kind", choices=["retrieval", "e2e"])
    s.add_argument("--set", help="one file of benchmark/02, e.g. questions.json")
    s.add_argument("--limit", type=int, default=0)
    s.set_defaults(fn=cmd_benchmark)
    s = sub.add_parser("values")
    s.add_argument("action", choices=["refresh", "import"])
    s.add_argument("file", nargs="?")
    s.set_defaults(fn=cmd_values)
    s = sub.add_parser("db")
    s.add_argument("action", choices=["verify", "examples"])
    s.add_argument("--print", action="store_true", help="print the SQL for SSMS instead of running it")
    s.set_defaults(fn=cmd_db)
    a = p.parse_args(argv)
    a.fn(a)
