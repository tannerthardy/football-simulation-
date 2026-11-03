#!/usr/bin/env python3
"""Released linemen on RB/TE screens: where they are relative to the throw and
the catcher, NFL vs sim, same code.

    python3 -I scripts/mechanics/screen_ol_reference.py out/screens/nfl-screens.jsonl.gz out/screens/sim-screens.jsonl.gz

Released OL: an OL whose x first exceeds +1.0 yd within the catch + 1.5 s
(screen_reference.py's definition). Per released OL: time he crosses the LOS
minus the throw time; his depth (x) and lateral distance from the ball at the
throw; at the catch, how far ahead of the catcher he is (x - catcher x), his
lateral distance from the catcher, and whether he is in the convoy window
(ahead by > -0.5 yd, within 6 yd laterally and 10 yd).
"""
import gzip, json, math, sys


def q(v):
    v = sorted(x for x in v if x is not None)
    return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[(3*len(v))//4]:.1f} (n {len(v)})" if v else "-"


for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, "rt"):
        p = json.loads(line)
        sc = p.get("screen") or {}
        r = sc.get("receiver")
        if r is None or p["players"][r]["group"] not in ("RB", "TE"):
            continue
        ev = p["events"]; tc = ev.get("catch"); tt = ev.get("pass_forward")
        if tc is None or tt is None:
            continue
        xy, dt = p["xy"], p.get("dt", 0.1); n = len(xy)
        P = lambda k, j: (xy[min(k, n - 1)][2 * j], xy[min(k, n - 1)][2 * j + 1])
        k = lambda t: int(round(t / dt))
        rx, ry = P(k(tc), r)
        for j, pl in enumerate(p["players"]):
            if pl["group"] != "OL" or pl["side"] != "O":
                continue
            up = next((f for f in range(k(tc + 1.5) + 1) if P(f, j)[0] > 1.0), None)
            if up is None:
                continue
            cross = next((f for f in range(up + 1) if P(f, j)[0] > 0), up)
            ox, oy = P(k(tc), j); tx, ty = P(k(tt), j)
            ahead = ox - rx
            rows.append({"cross_rel_throw": cross * dt - tt, "x_throw": tx, "lat_ball_throw": abs(ty - p.get("ball_y", 26.65)),
                         "ahead": ahead, "lat_catcher": abs(oy - ry),
                         "convoy": ahead > -0.5 and abs(oy - ry) <= 6 and math.hypot(ox - rx, oy - ry) <= 10})
    print(f"\n{path}: {len(rows)} released OL on caught RB/TE screens")
    print(f"  crosses the LOS rel. throw {q([r['cross_rel_throw'] for r in rows])} s")
    print(f"  at the throw: depth {q([r['x_throw'] for r in rows])} yd, lateral from ball {q([r['lat_ball_throw'] for r in rows])} yd")
    print(f"  at the catch: ahead of catcher {q([r['ahead'] for r in rows])} yd, lateral from catcher {q([r['lat_catcher'] for r in rows])} yd, in convoy {sum(r['convoy'] for r in rows)/max(1,len(rows)):.0%}")
