"""Double teams on inside runs: how far a doubled line defender is driven
back, against a single-blocked one. One operator for NFL tracking and sim
common plays.

Inside runs: inside zone, duo and gap/pull concepts (metrics.CONCEPT_FAMILY).
A line defender is one 0-2 yd past the line within 5 yd of the ball at the
snap. He is doubled when two offensive linemen or tight ends are within
1.25 yd of him in the same frame for 0.3 s between 0.2 and 1.2 s; singled
when exactly one is, for 0.3 s, and never two. Displacement is his depth
change since the snap (+ = driven back) and his lateral move, at 1.0 / 1.5 /
2.0 / 2.5 s while the play is live. Also: run yards p25/p50/p75 and 10+
share for the same plays.

usage: python3 -I doubles.py LABEL=plays.jsonl.gz [LABEL=...]"""
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import CONCEPT_FAMILY, Play  # noqa: E402

INSIDE = ("inside_zone", "man_duo", "gap_pull")
T = (1.0, 1.5, 2.0, 2.5)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")

for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    res = {fam: {"d": {t: [] for t in T}, "s": {t: [] for t in T}, "dl": {t: [] for t in T}, "sl": {t: [] for t in T},
                 "nd": 0, "ns": 0, "yds": []} for fam in INSIDE}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        fam = CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept"))
        if fam not in INSIDE:
            continue
        p = Play(raw)
        r = res[fam]
        r["yds"].append(raw.get("yards") or 0)
        by = raw["ball_y"]
        blockers = [i for i in p.who("O") if p.players[i]["group"] in ("OL", "TE") and p.pos(i, 0)[0] is not None]
        line_d = [i for i in p.who("D") if p.pos(i, 0)[0] is not None and 0 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 5]
        k0, k1 = p.k(0.2), p.k(1.2)
        for d in line_d:
            run2 = run1 = best2 = best1 = 0
            for k in range(k0, min(k1, p.frames - 1) + 1):
                n = sum(1 for b in blockers if p.dist(b, d, k) <= 1.25)
                run2 = run2 + 1 if n >= 2 else 0
                run1 = run1 + 1 if n == 1 else 0
                best2, best1 = max(best2, run2), max(best1, run1)
            need = round(0.3 / p.dt)
            kind = "d" if best2 >= need else "s" if best1 >= need and best2 == 0 else None
            if kind is None:
                continue
            r["nd" if kind == "d" else "ns"] += 1
            x0, y0 = p.pos(d, 0)
            for t in T:
                if not p.live(t):
                    continue
                x, y = p.pos(d, p.k(t))
                if x is None:
                    continue
                r[kind][t].append(x - x0)
                r[kind + "l"][t].append(abs(y - y0))
    print(f"== {label}")
    for fam in INSIDE:
        r = res[fam]
        y = r["yds"]
        if not y:
            continue
        print(f"  {fam}: runs {len(y)} | yards p25/50/75 {q(y, .25):.1f}/{q(y):.1f}/{q(y, .75):.1f} | 10+ {100 * sum(v >= 10 for v in y) / len(y):.1f}%"
              f" | doubled {r['nd']} singled {r['ns']}")
        for kind, name in (("d", "doubled"), ("s", "singled")):
            cells = " ".join(f"{t:.1f}s {q(r[kind][t]):+.2f} [{q(r[kind][t], .25):+.2f},{q(r[kind][t], .75):+.2f}] lat {q(r[kind + 'l'][t]):.2f} (n{len(r[kind][t])})" for t in T)
            print(f"    {name:8s} driven back: {cells}")
