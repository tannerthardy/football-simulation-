#!/usr/bin/env python3
"""How fast free defenders build speed on runs: one operator for NFL tracking
and sim common plays. From the handoff to the end, every frame a defender is
free (no offensive player within 1.0 yd, now and for the next 1.0 s) and moving
at 1-3 yd/s: the most speed he gains within the next 0.5 and 1.0 s. Upper
percentiles show what bodies trying to accelerate achieve.

    python3 -I scripts/diag/g1/accel.py LABEL=plays.jsonl.gz [...]
"""
import gzip
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    gain = defaultdict(lambda: defaultdict(list))
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw) if "common" in raw else raw
        ev = raw.get("events") or {}
        if raw.get("kind") != "run" or ev.get("handoff") is None:
            continue
        p = Play(raw)
        k1 = min(p.frames - 1, p.k(p.end))
        off = p.who("O")
        n10 = p.k(1.0)
        for d in p.who("D"):
            g = p.players[d]["group"]
            sp = [p.speed(d, k) for k in range(k1 + 1)]
            free = [not any(p.dist(o, d, k) <= 1.0 for o in off) for k in range(k1 + 1)]
            for k in range(p.k(ev["handoff"]), k1 - n10, 2):
                if not (1 <= sp[k] <= 3) or not all(free[k:k + n10 + 1]):
                    continue
                for w in (0.5, 1.0):
                    gain[g][w].append(max(sp[k:k + p.k(w) + 1]) - sp[k])
    print(f"== {label}: speed gained from 1-3 yd/s while free, p50 / p75 / p90")
    for g in ("DL", "LB", "DB"):
        G = gain[g]
        if G[0.5]:
            print(f"   {g} (n {len(G[0.5]):6d}): within 0.5 s {q(G[0.5]):.2f} / {q(G[0.5], .75):.2f} / {q(G[0.5], .9):.2f}"
                  f"   within 1.0 s {q(G[1.0]):.2f} / {q(G[1.0], .75):.2f} / {q(G[1.0], .9):.2f} yd/s")
