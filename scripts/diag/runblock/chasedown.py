"""Long runs from behind: can the pursuit catch the back? One operator for
NFL tracking and sim common plays.

Designed runs whose carrier reaches 20 yd. At the frames he reaches 10, 20
and 30 yd: his speed; for each defender within 10 yd of him and not ahead of
him by more than 2 yd (the chase), his speed and the rate the gap to the
back closes (+ = gaining); the fastest pursuer's speed against the back's;
and how many defenders are ahead of him (deeper than the back, within 8 yd
laterally). Also the share of these runs reaching 40.

usage: python3 -I chasedown.py LABEL=plays.jsonl.gz [...]"""
import gzip
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mechanics"))
from metrics import Play  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float("nan")
MARKS = (10, 20, 30)


def vel(p, i, k):
    a, b = max(0, k - 2), min(p.frames - 1, k + 2)
    (x0, y0), (x1, y1) = p.pos(i, a), p.pos(i, b)
    if x0 is None or x1 is None or b == a:
        return None
    return ((x1 - x0) / ((b - a) * p.dt), (y1 - y0) / ((b - a) * p.dt))


for arg in sys.argv[1:]:
    label, path = arg.split("=", 1)
    n = reach40 = 0
    rows = {m: {"back": [], "chaser": [], "close": [], "fastest": [], "ahead": [], "maxsp": []} for m in MARKS}
    for line in gzip.open(path, "rt"):
        raw = json.loads(line)
        if raw.get("kind") != "run" or raw.get("carrier") is None:
            continue
        p = Play(raw)
        c = raw["carrier"]
        xs = [p.pos(c, k)[0] for k in range(p.frames)]
        if max((x for x in xs if x is not None), default=-99) < 20:
            continue
        n += 1
        reach40 += max(x for x in xs if x is not None) >= 40
        for m in MARKS:
            k = next((k for k, x in enumerate(xs) if x is not None and x >= m), None)
            if k is None:
                continue
            vc = vel(p, c, k)
            if vc is None:
                continue
            cx, cy = p.pos(c, k)
            r = rows[m]
            r["back"].append(math.hypot(*vc))
            fastest = 0
            ahead = 0
            for d in p.who("D"):
                x, y = p.pos(d, k)
                if x is None:
                    continue
                if x > cx + 2 and abs(y - cy) <= 8:
                    ahead += 1
                dist = math.hypot(x - cx, y - cy)
                if dist > 10 or x > cx + 2:
                    continue
                vd = vel(p, d, k)
                if vd is None:
                    continue
                sp = math.hypot(*vd)
                ux, uy = (cx - x) / max(dist, 1e-6), (cy - y) / max(dist, 1e-6)
                r["chaser"].append(sp)
                r["close"].append((vd[0] - vc[0]) * ux + (vd[1] - vc[1]) * uy)
                fastest = max(fastest, sp)
            r["fastest"].append(fastest - math.hypot(*vc))
            r["ahead"].append(ahead)
    print(f"== {label}: runs reaching 20 {n}, reaching 40 {100 * reach40 / max(n, 1):.0f}%")
    for m in MARKS:
        r = rows[m]
        if not r["back"]:
            continue
        print(f"  back at {m} yd (n {len(r['back'])}): back speed {q(r['back']):.2f} | chasers within 10 yd {len(r['chaser']) / len(r['back']):.1f} per run, speed p50/p75 {q(r['chaser']):.2f}/{q(r['chaser'], .75):.2f},"
              f" closing p50 {q(r['close']):+.2f} | fastest chaser minus back {q(r['fastest']):+.2f} | defenders ahead of him {q(r['ahead'])} (none {100 * sum(a == 0 for a in r['ahead']) / len(r['ahead']):.0f}%)")
