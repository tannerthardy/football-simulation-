"""Defensive backs on designed runs: are they still in front of the back, and
are they blocked? One operator for NFL tracking and sim common plays.

DBs (group DB) split by snap depth: box/force (under 7.5 yd past the line)
and deep (7.5+). For runs reaching 10 yd, at the frames the carrier reaches
0, 5, 10 and 20 yd: DBs per run still in front of him (deeper than the back,
within 10 yd laterally), DBs per run blocked (an offensive player within
1 yd) and their depth past the back at that frame. Then for runs reaching 20
yd: the share reaching 40.

usage: python3 -I dbahead.py LABEL=plays.jsonl.gz [...]"""
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

MARKS = (0, 5, 10, 20)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")

for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    rows = {(m, g): {"ahead": [], "blocked": [], "depth": []} for m in MARKS for g in ("box", "deep")}
    runs = r20 = r40 = 0
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        p = Play(raw)
        c = raw["carrier"]
        xs = [p.pos(c, k)[0] for k in range(p.frames)]
        top = max((x for x in xs if x is not None), default=-99)
        if top < 10:
            continue
        runs += 1
        r20 += top >= 20
        r40 += top >= 40
        dbs = [d for d in p.who("D", "DB") if p.pos(d, 0)[0] is not None]
        offense = [o for o in p.who("O") if o != c]
        for m in MARKS:
            k = next((k for k, x in enumerate(xs) if x is not None and x >= m), None)
            if k is None:
                continue
            cx, cy = p.pos(c, k)
            for g in ("box", "deep"):
                ds = [d for d in dbs if (p.pos(d, 0)[0] >= 7.5) == (g == "deep") and p.pos(d, k)[0] is not None]
                ahead = [d for d in ds if p.pos(d, k)[0] > cx and abs(p.pos(d, k)[1] - cy) <= 10]
                r = rows[(m, g)]
                r["ahead"].append(len(ahead))
                r["blocked"].append(sum(1 for d in ds if any(p.dist(o, d, k) <= 1.0 for o in offense)))
                r["depth"].extend(p.pos(d, k)[0] - cx for d in ahead)
    print(f"== {label}: runs reaching 10 yd {runs}, reaching 20 {r20}, of those reaching 40 {100 * r40 / max(r20, 1):.0f}%")
    for m in MARKS:
        cells = []
        for g in ("box", "deep"):
            r = rows[(m, g)]
            if not r["ahead"]:
                continue
            n = len(r["ahead"])
            cells.append(f"{g} DBs ahead {sum(r['ahead']) / n:.2f}/run (depth past him {q(r['depth']):.1f}), blocked {sum(r['blocked']) / n:.2f}/run")
        print(f"  back at {m:2d} yd: " + " | ".join(cells))
