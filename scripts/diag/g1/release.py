#!/usr/bin/env python3
"""How blocked linemen get off their blocks on runs: the shed, or the turn
and run once free? One operator for NFL tracking and sim common plays.

Designed runs (RB carrier, handoff) reaching 5 yd. DL with an offensive
player other than the carrier within 1.0 yd when the runner crosses the line:
  released   the first frame from then on with no offensive player within
             1.0 yd for 0.2 s; share released by the 5-yd crossing and by
             +1.0 s, and when (s after the line crossing)
  getting off  while still blocked (line crossing to release, at most 1 s):
             his speed, and his velocity away from the nearest blocker
             (+: separating)
  after      0.3 s after release: his speed, his speed toward the runner, and
             the angle between his travel and the line to the runner

    python3 -I scripts/diag/g1/release.py LABEL=plays.jsonl.gz [...]
"""
import gzip
import json
import math
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")


def near(p, d, k, off):
    best = None
    for o in off:
        r = p.dist(o, d, k)
        if r <= 1.0 and (best is None or r < best[0]):
            best = (r, o)
    return best


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    a = defaultdict(list)
    n = by5 = by10 = 0
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        raw = raw.get("common", raw) if "common" in raw else raw
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        ev = raw.get("events") or {}
        c = raw["carrier"]
        if ev.get("handoff") is None or raw["players"][c]["group"] != "RB":
            continue
        p = Play(raw)
        k1 = min(p.frames - 1, p.k(p.end))
        k0 = next((k for k in range(p.k(ev["handoff"]), k1) if (p.pos(c, k)[0] or -9) >= 0), None)
        k5 = next((k for k in range(p.k(ev["handoff"]), k1) if (p.pos(c, k)[0] or -9) >= 5), None)
        if k0 is None or k5 is None:
            continue
        off = [o for o in p.who("O") if o != c]
        two = p.k(0.2)
        for d in p.who("D"):
            if p.players[d]["group"] != "DL" or near(p, d, k0, off) is None:
                continue
            n += 1
            kr = next((k for k in range(k0, k1 - two) if all(near(p, d, j, off) is None for j in range(k, k + two + 1))), None)
            if kr is not None:
                a["t"].append((kr - k0) * p.dt)
                by5 += kr <= k5
                by10 += (kr - k0) * p.dt <= 1.0
            # Getting off: while still blocked, up to 1 s.
            for k in range(k0, min(kr if kr is not None else k1, k0 + p.k(1.0)) + 1):
                b = near(p, d, k, off)
                if b is None:
                    continue
                (dx, dy), (bx, by) = p.pos(d, k), p.pos(b[1], k)
                vd, vb = p.velocity(d, k), p.velocity(b[1], k)
                nx, ny = dx - bx, dy - by
                nn = math.hypot(nx, ny) or 1
                a["sep"].append(((vd[0] - vb[0]) * nx + (vd[1] - vb[1]) * ny) / nn)
                a["spd_on"].append(math.hypot(*vd))
            if kr is not None and kr + p.k(0.3) <= k1:
                k = kr + p.k(0.3)
                (dx, dy), (cx, cy) = p.pos(d, k), p.pos(c, k)
                if dx is None or cx is None:
                    continue
                v = p.velocity(d, k)
                s = math.hypot(*v)
                tx, ty = cx - dx, cy - dy
                tn = math.hypot(tx, ty) or 1
                a["spd_after"].append(s)
                a["toward"].append((v[0] * tx + v[1] * ty) / tn)
                if s > 1:
                    a["angle"].append(math.degrees(math.acos(max(-1, min(1, (v[0] * tx + v[1] * ty) / (s * tn))))))
    if not n:
        continue
    print(f"== {label}: DL blocked when the runner crosses the line: {n}")
    print(f"   released by the 5-yd crossing {100 * by5 / n:.0f}%, within 1.0 s {100 * by10 / n:.0f}%, ever {100 * len(a['t']) / n:.0f}%;"
          f" when, p25/50/75 {q(a['t'], .25):.2f}/{q(a['t']):.2f}/{q(a['t'], .75):.2f} s after the crossing")
    print(f"   while still blocked: speed p50 {q(a['spd_on']):.2f} yd/s, separating from the blocker p25/50/75"
          f" {q(a['sep'], .25):+.2f}/{q(a['sep']):+.2f}/{q(a['sep'], .75):+.2f} yd/s")
    print(f"   0.3 s after release: speed p50 {q(a['spd_after']):.2f} yd/s, toward the runner p50 {q(a['toward']):.2f} yd/s,"
          f" angle off the runner p50 {q(a['angle']):.0f} deg")
