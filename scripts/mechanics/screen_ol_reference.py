#!/usr/bin/env python3
"""Released linemen on screens: where they are relative to the throw and the
catcher, NFL vs sim, same code.

    python3 -I scripts/mechanics/screen_ol_reference.py out/screens/nfl-screens.jsonl.gz out/screens/sim-screens.jsonl.gz [--wr in|out|now] [--type tunnel_screen]

Default: RB/TE screens. --wr KIND: WR/TE screens to a receiver detached at
the snap (> 3.5 yd from the ball) whose motion snap -> catch is KIND (in =
> 1.5 yd toward the ball, out = away, now = neither; as
quick_screen_reference.py). --type keeps one sim screen type. With --wr,
also counts per play how many OL release (0 included).

Released OL: an OL whose x first exceeds +1.0 yd within the catch + 1.5 s
(screen_reference.py's definition). Per released OL: time he crosses the LOS
minus the throw time; his depth (x) and lateral distance from the ball at the
throw; at the catch, how far ahead of the catcher he is (x - catcher x), his
lateral distance from the catcher, and whether he is in the convoy window
(ahead by > -0.5 yd, within 6 yd laterally and 10 yd).
"""
import argparse, gzip, json, math, sys


def q(v):
    v = sorted(x for x in v if x is not None)
    return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[(3*len(v))//4]:.1f} (n {len(v)})" if v else "-"


ap = argparse.ArgumentParser()
ap.add_argument("plays", nargs="+")
ap.add_argument("--wr", choices=["in", "out", "now"])
ap.add_argument("--type")
A = ap.parse_args()
for path in A.plays:
    rows, per_play = [], []
    for line in gzip.open(path, "rt"):
        p = json.loads(line)
        sc = p.get("screen") or {}
        r = sc.get("receiver")
        if A.type and sc.get("type") != A.type:
            continue
        ev = p["events"]; tc = ev.get("pass_arrived", ev.get("catch")) if "catch" in ev else None; tt = ev.get("pass_forward")
        if r is None or tc is None or tt is None:
            continue
        xy, dt = p["xy"], p.get("dt", 0.1); n = len(xy)
        P = lambda k, j: (xy[min(k, n - 1)][2 * j], xy[min(k, n - 1)][2 * j + 1])
        k = lambda t: int(round(t / dt))
        rx, ry = P(k(tc), r)
        by = p.get("ball_y", 26.65)
        if A.wr:
            if p["players"][r]["group"] not in ("WR", "TE") or abs(P(0, r)[1] - by) <= 3.5:
                continue
            s0 = 1 if P(0, r)[1] > by else -1
            lat = (ry - P(0, r)[1]) * s0
            if (A.wr == "in") != (lat < -1.5) or (A.wr == "out") != (lat > 1.5):
                continue
        elif p["players"][r]["group"] not in ("RB", "TE"):
            continue
        released = 0
        for j, pl in enumerate(p["players"]):
            if pl["group"] != "OL" or pl["side"] != "O":
                continue
            up = next((f for f in range(k(tc + 1.5) + 1) if P(f, j)[0] > 1.0), None)
            if up is None:
                continue
            released += 1
            cross = next((f for f in range(up + 1) if P(f, j)[0] > 0), up)
            ox, oy = P(k(tc), j); tx, ty = P(k(tt), j)
            ahead = ox - rx
            rows.append({"depth_t": [P(k(t), j)[0] for t in (0.5, 1.0, 1.5, 2.0)], "cross_rel_throw": cross * dt - tt, "x_throw": tx, "lat_ball_throw": abs(ty - p.get("ball_y", 26.65)),
                         "ahead": ahead, "lat_catcher": abs(oy - ry),
                         "convoy": ahead > -0.5 and abs(oy - ry) <= 6 and math.hypot(ox - rx, oy - ry) <= 10})
        per_play.append(released)
    import collections
    print(f"\n{path}: {len(rows)} released OL on {len(per_play)} caught {'WR ' + A.wr if A.wr else 'RB/TE'} screens | released per play {dict(sorted(collections.Counter(per_play).items()))}")
    for i, t in enumerate((0.5, 1.0, 1.5, 2.0)):
        print(f"  depth at {t:.1f} s after the snap {q([r['depth_t'][i] for r in rows])} yd")
    print(f"  crosses the LOS rel. throw {q([r['cross_rel_throw'] for r in rows])} s")
    print(f"  at the throw: depth {q([r['x_throw'] for r in rows])} yd, lateral from ball {q([r['lat_ball_throw'] for r in rows])} yd")
    print(f"  at the catch: ahead of catcher {q([r['ahead'] for r in rows])} yd, lateral from catcher {q([r['lat_catcher'] for r in rows])} yd, in convoy {sum(r['convoy'] for r in rows)/max(1,len(rows)):.0%}")
