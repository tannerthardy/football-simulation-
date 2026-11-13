"""The rally behind the first tackler: where the box is when the back gets to
5 and 10 yd. One operator for NFL tracking and sim common plays.

Designed runs reaching 10 yd. At the frames the carrier reaches 0, 5 and 10
yd: each box defender's (line or second level at the snap: 0-7.5 yd deep,
within 8 yd of the ball) distance to the carrier and his speed and closing
rate toward him; the count within 3 and 5 yd; the share blocked (an
offensive player within 1 yd). Second level (2-7.5 yd at the snap) and line
separately.

usage: python3 -I rallybox.py LABEL=plays.jsonl.gz [...]"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
MARKS = (0, 5, 10)


def vel(p, i, k):
    a, b = max(0, k - 2), min(p.frames - 1, k + 2)
    (x0, y0), (x1, y1) = p.pos(i, a), p.pos(i, b)
    if x0 is None or x1 is None or b == a:
        return None
    return ((x1 - x0) / ((b - a) * p.dt), (y1 - y0) / ((b - a) * p.dt))


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    rows = {(m, lvl): {"dist": [], "speed": [], "close": [], "blocked": 0, "n": 0, "in3": [], "in5": []} for m in MARKS for lvl in ("line", "second")}
    runs = 0
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        p = Play(raw)
        c = raw["carrier"]
        xs = [p.pos(c, k)[0] for k in range(p.frames)]
        if max((x for x in xs if x is not None), default=-99) < 10:
            continue
        runs += 1
        by = raw["ball_y"]
        box = [d for d in p.who("D") if p.pos(d, 0)[0] is not None and -0.5 <= p.pos(d, 0)[0] <= 7.5 and abs(p.pos(d, 0)[1] - by) <= 8]
        offense = [o for o in p.who("O") if o != c]
        for m in MARKS:
            k = next((k for k, x in enumerate(xs) if x is not None and x >= m), None)
            if k is None:
                continue
            cx, cy = p.pos(c, k)
            vc = vel(p, c, k) or (0, 0)
            for lvl in ("line", "second"):
                r = rows[(m, lvl)]
                ds = [d for d in box if (p.pos(d, 0)[0] <= 2) == (lvl == "line") and p.pos(d, k)[0] is not None]
                n3 = n5 = 0
                for d in ds:
                    x, y = p.pos(d, k)
                    dist = math.hypot(x - cx, y - cy)
                    vd = vel(p, d, k)
                    if vd is None:
                        continue
                    ux, uy = (cx - x) / max(dist, 1e-6), (cy - y) / max(dist, 1e-6)
                    r["dist"].append(dist)
                    r["speed"].append(math.hypot(*vd))
                    r["close"].append((vd[0] - vc[0]) * ux + (vd[1] - vc[1]) * uy)
                    r["n"] += 1
                    r["blocked"] += any(p.dist(o, d, k) <= 1.0 for o in offense)
                    n3 += dist <= 3
                    n5 += dist <= 5
                r["in3"].append(n3)
                r["in5"].append(n5)
    print(f"== {label}: runs reaching 10 yd {runs}")
    for m in MARKS:
        for lvl in ("line", "second"):
            r = rows[(m, lvl)]
            if not r["n"]:
                continue
            print(f"  back at {m:2d} yd, {lvl:6s}: per run within 3 / 5 yd {sum(r['in3']) / len(r['in3']):.2f} / {sum(r['in5']) / len(r['in5']):.2f}"
                  f" | distance p50 {q(r['dist']):.2f} | speed p50 {q(r['speed']):.2f} | closing p50 {q(r['close']):+.2f} | blocked {100 * r['blocked'] / r['n']:.0f}%")
