"""How fast DBs come to a run, by snap depth. One operator for NFL tracking and
sim common plays.

Designed runs by family (zone: inside/outside zone, duo; gap). DBs split by
snap depth (under 7.5 yd = box/force, 7.5+ = deep) and lateral distance from
the ball (inside 8 yd / outside). At 0.5 / 1.0 / 1.5 / 2.0 / 2.5 s: depth past
the line and downhill speed (toward the line), and the share within 1 yd of an
offensive player (blocked).

usage: python3 -I dbtempo.py LABEL=plays.jsonl.gz [...]"""
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import CONCEPT_FAMILY, Play  # noqa: E402

T = (0.5, 1.0, 1.5, 2.0, 2.5)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
FAM = {"inside_zone": "zone", "outside_zone": "zone", "man_duo": "zone", "gap_pull": "gap"}

for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    rows = {}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        fam = FAM.get(CONCEPT_FAMILY.get((raw.get("cell") or {}).get("concept")))
        if not fam:
            continue
        p = Play(raw)
        by = raw["ball_y"]
        offense = p.who("O")
        for d in p.who("D", "DB"):
            x0, y0 = p.pos(d, 0)
            if x0 is None:
                continue
            g = ("deep" if x0 >= 7.5 else "box") + (" wide" if abs(y0 - by) > 8 else " in")
            r = rows.setdefault((fam, g), {t: {"x": [], "v": [], "b": 0, "n": 0} for t in T})
            for t in T:
                if not p.live(t):
                    continue
                k = p.k(t)
                x = p.pos(d, k)[0]
                if x is None:
                    continue
                kb = max(0, k - 2)
                xb = p.pos(d, kb)[0]
                cell = r[t]
                cell["x"].append(x)
                if xb is not None and k > kb:
                    cell["v"].append(-(x - xb) / ((k - kb) * p.dt))
                cell["n"] += 1
                cell["b"] += any(p.dist(o, d, k) <= 1.0 for o in offense)
    print(f"== {label}: DB depth past the line / downhill yd/s / blocked share at " + " / ".join(f"{t}s" for t in T))
    for key in sorted(rows):
        r = rows[key]
        n = r[T[0]]["n"]
        cells = "  ".join(f"{q(r[t]['x']):5.1f} {q(r[t]['v']):+5.2f} {100 * r[t]['b'] / max(r[t]['n'], 1):3.0f}%" for t in T)
        print(f"  {key[0]:4s} {key[1]:9s} n {n:5d} | {cells}")
