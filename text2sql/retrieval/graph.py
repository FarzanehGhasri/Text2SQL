"""Which domains are active, and which tables follow from the matched ones (dimensions, link tables)."""
from __future__ import annotations

from dataclasses import dataclass, field

from ..model import Domain, Join, Table
from ..text import locale_key
from .scoring import RetrievalSettings, Scored


# ---------------------------------------------------------------- domains
@dataclass
class Domains:
    """At most max_domains domains close to the best one. Shared domains never compete: their tables are always
    usable, since every domain joins to them. A domain where nothing scored is never active."""
    ranked: list[tuple[Domain, float]]
    active: list[Domain]
    by_table: dict[str, Domain] = field(default_factory=dict)

    def is_active(self, d: Domain) -> bool:
        return any(x is d for x in self.active)

    def eligible(self, t: Table) -> bool:
        d = self.by_table[t.name]
        return d.shared is True or self.is_active(d)


def select_domains(scored: list[Scored], domain_of: dict[str, Domain], low_confidence: bool,
                   s: RetrievalSettings) -> Domains:
    best_of: dict[int, tuple[Domain, float]] = {}
    for r in scored:
        d = domain_of[r.table.name]
        if d.shared:
            continue
        if id(d) not in best_of or r.score > best_of[id(d)][1]:
            best_of[id(d)] = (d, r.score)
    ranked = sorted(best_of.values(), key=lambda x: -x[1])
    best = ranked[0][1] if ranked else 0
    scoring = [x for x in ranked if x[1] > 0]
    # with low confidence only the best domain stays: a small schema and the NOT_SUPPORTED rule
    chosen = scoring[:1] if low_confidence else [x for x in scoring if x[1] >= best * s.domain_ratio][:s.max_domains]
    active_ids = {id(d) for d, _ in chosen}
    return Domains(ranked, [d for d, _ in ranked if id(d) in active_ids], domain_of)


# ---------------------------------------------------------------- tables
def select_tables(scored: list[Scored], allowed: dict[str, Table], domains: Domains, joins: list[Join],
                  s: RetrievalSettings) -> dict[str, None]:
    """Matched tables + the core table of each active domain + the dimensions they reference (from -> to only:
    the reverse direction pulled 15 fact tables in with Dim_Unit). Deliberately no "take the top 3 anyway"
    fallback: for a question outside the catalog the model must say NOT_SUPPORTED, not use a wrong table."""
    selected = dict.fromkeys(r.table.name for r in scored if r.score >= s.min_score and domains.eligible(r.table))
    for t in allowed.values():
        if t.core and domains.is_active(domains.by_table[t.name]):
            selected[t.name] = None
    for _ in range(s.closure_hops):
        add = [j.to_table for j in joins
               if j.from_table in selected and j.to_table not in selected and j.to_table in allowed
               and domains.eligible(allowed[j.to_table])]
        for n in add:
            selected[n] = None
    return selected


# ---------------------------------------------------------------- link tables between matched tables
@dataclass(frozen=True)
class Bridge:
    name: str
    rank: float
    path: tuple[str, ...]


def join_graph(joins: list[Join], usable) -> dict[str, dict[str, dict[str, bool]]]:
    """name -> {neighbour -> {'out': this table references it, 'in': it references this table}}"""
    g: dict[str, dict[str, dict[str, bool]]] = {}

    def link(a, b, direction):
        e = g.setdefault(a, {}).setdefault(b, {"out": False, "in": False})
        e[direction] = True

    for j in joins:
        if j.from_table == j.to_table or not usable(j.from_table) or not usable(j.to_table):
            continue
        link(j.from_table, j.to_table, "out")
        link(j.to_table, j.from_table, "in")
    return g


def best_path(start: dict[str, None], target: str, members: dict[str, None], g, score_of,
              s: RetrievalSettings) -> list[str] | None:
    """Best valid path from any start table to target with at most join_max_hops link tables.
    Valid: no link table is only the TARGET of both its links (A -> D <- B): two facts that share a dimension
    have no valid join through it (fan trap). Best: fewest new tables, then shortest, then highest scores,
    then name order (so the result is always the same)."""
    def not_collider(prev, mid, nxt):
        return g[mid][prev]["out"] or g[mid][nxt]["out"]

    found = []
    frontier = [[n] for n in start if n in g]
    hops = 0
    while hops <= s.join_max_hops and frontier:
        nxt_frontier = []
        for path in frontier:
            last = path[-1]
            for n in g[last]:
                if n in path:
                    continue
                if len(path) > 1 and not not_collider(path[-2], last, n):
                    continue
                if n == target:
                    found.append([*path, n])
                elif n not in start:
                    nxt_frontier.append([*path, n])
        frontier = nxt_frontier
        hops += 1
    if not found:
        return None

    def mids(p):
        return p[1:-1]

    found.sort(key=lambda p: (sum(1 for n in mids(p) if n not in members), len(p),
                              -sum(score_of(n) for n in mids(p)), locale_key(",".join(p))))
    return found[0]


def complete_join_paths(scored: list[Scored], selected: dict[str, None], allowed: dict[str, Table],
                        domains: Domains, joins: list[Join], s: RetrievalSettings) -> list[Bridge]:
    """Strong tables (score >= join_min_score) are connected, in score order, to the group that starts at the best
    one. A table with no valid path (two facts that only share a dimension) stays alone."""
    g = join_graph(joins, lambda n: n in allowed and domains.eligible(allowed[n]))
    strong = [r for r in scored if r.score >= s.join_min_score and r.table.name in selected and r.table.name in g]
    score_by_name = {r.table.name: r.score for r in scored}
    score_of = lambda n: score_by_name.get(n, 0)  # noqa: E731
    members = dict(selected)
    bridges: list[Bridge] = []
    if len(strong) < 2:
        return bridges
    linked = {strong[0].table.name: None}
    for r in strong[1:]:
        path = best_path(linked, r.table.name, members, g, score_of, s)
        if not path:
            continue
        fresh = [n for n in path[1:-1] if n not in members]
        if len(bridges) + len(fresh) > s.join_max_tables:
            continue
        for i, n in enumerate(fresh):
            members[n] = None
            # placed right after the table it came for, so a full budget does not drop it first
            bridges.append(Bridge(n, r.score - (i + 1) * 1e-6, tuple(path)))
        for n in path:
            linked[n] = None
    return bridges
