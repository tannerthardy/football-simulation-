#!/usr/bin/env python3
"""The RB's path on RB screens, NFL vs sim, same code.

    python3 -I scripts/mechanics/screen_back_reference.py out/screens/nfl-screens.jsonl.gz out/screens/sim-screens.jsonl.gz

RB screens: the screen receiver is an RB and the pass was caught. Per time
after the snap (0.5 ... 2.5 s) and at the throw: his depth (x), lateral
distance from the ball, toward the catch side (+ = toward where he catches),
speed, and distance to the nearest other body (either team). Also the time
his lateral movement toward the catch side first exceeds 1 yd ("release").
"""
import gzip, json, math, sys

TS = (0.5, 1.0, 1.5, 2.0, 2.5)


def q(v):
    v = sorted(x for x in v if x is not None)
    return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[(3*len(v))//4]:.1f}" if v else "-"


for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, "rt"):
        p = json.loads(line)
        sc = p.get("screen") or {}
        r = sc.get("receiver")
        ev = p["events"]
        if r is None or p["players"][r]["group"] != "RB" or "catch" not in ev or "pass_forward" not in ev:
            continue
        xy, dt = p["xy"], p.get("dt", 0.1); n = len(xy)
        P = lambda k, j: (xy[min(k, n - 1)][2 * j], xy[min(k, n - 1)][2 * j + 1])
        k = lambda t: int(round(t / dt))
        by = p.get("ball_y", 26.65)
        cx, cy = P(k(ev.get("pass_arrived", ev["catch"])), r)
        side = 1 if cy >= by else -1
        def at(t):
            f = k(t); x, y = P(f, r)
            a, b = P(max(0, f - 2), r), P(min(n - 1, f + 2), r)
            spd = math.dist(a, b) / ((min(n - 1, f + 2) - max(0, f - 2)) * dt or dt)
            near = min(math.dist((x, y), P(f, j)) for j in range(len(p["players"])) if j != r)
            return {"x": x, "lat": (y - by) * side, "spd": spd, "near": near}
        y0 = (P(0, r)[1] - by) * side
        rel = next((f * dt for f in range(n) if (P(f, r)[1] - by) * side - y0 > 1.0), None)
        rows.append({"t": [at(t) for t in TS], "throw": at(ev["pass_forward"]), "release": rel, "tt": ev["pass_forward"]})
    print(f"\n{path}: {len(rows)} caught RB screens")
    for i, t in enumerate(TS):
        S = [r["t"][i] for r in rows]
        print(f"  {t:.1f}s depth {q([s['x'] for s in S])} | lateral to catch side {q([s['lat'] for s in S])} | speed {q([s['spd'] for s in S])} | nearest body {q([s['near'] for s in S])}")
    S = [r["throw"] for r in rows]
    print(f"  throw ({q([r['tt'] for r in rows])} s): depth {q([s['x'] for s in S])} | lateral {q([s['lat'] for s in S])} | speed {q([s['spd'] for s in S])} | nearest body {q([s['near'] for s in S])}")
    print(f"  lateral release (>1 yd toward catch side) at {q([r['release'] for r in rows])} s")
