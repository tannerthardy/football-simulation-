#!/usr/bin/env python3
"""The screen receiver's path on WR/TE screens, NFL vs sim, same code.

    python3 -I scripts/mechanics/screen_wr_path_reference.py PLAYS.jsonl.gz [...] [--by kind|type]

Plays: caught screens whose receiver is a WR/TE detached (> 3.5 yd from the
ball) at the snap. Kinds as in quick_screen_reference.py (from his motion
snap -> catch): in (> 1.5 yd toward the ball), out (> 1.5 yd away), now.
Per time after the snap (0.3 ... 2.5 s), at the throw and at the catch: his
depth change (x, + = upfield) and lateral change (+ = away from the ball)
from his snap position, and his speed (yd/s, central difference over
+/-0.1 s). Also the time his lateral motion first exceeds 1 yd ("turn").
"""
import argparse, collections, gzip, json, math, sys

TS = (0.3, 0.6, 0.9, 1.2, 1.5, 2.0, 2.5)


def q(v):
    v = sorted(x for x in v if x is not None)
    return f"{v[len(v)//4]:+.1f}/{v[len(v)//2]:+.1f}/{v[(3*len(v))//4]:+.1f}" if v else "-"


def measure(p):
    sc = p.get("screen") or {}
    r, ev = sc.get("receiver", p.get("target")), p["events"]
    if r is None or "catch" not in ev or "pass_forward" not in ev or p["players"][r]["group"] not in ("WR", "TE"):
        return None
    xy, dt, by = p["xy"], p.get("dt", 0.1), p.get("ball_y", 26.65)
    n = len(xy)
    P = lambda f: (xy[min(n - 1, f)][2 * r], xy[min(n - 1, f)][2 * r + 1])
    x0, y0 = P(0)
    if abs(y0 - by) <= 3.5:
        return None
    s = 1 if y0 > by else -1
    k = lambda t: int(round(t / dt))
    rel = lambda f: (P(f)[0] - x0, (P(f)[1] - y0) * s)
    def spd(f):
        a, b = max(0, f - 1), min(n - 1, f + 1)
        return math.hypot(P(b)[0] - P(a)[0], P(b)[1] - P(a)[1]) / max(dt, (b - a) * dt)
    kc, kt = k(ev.get("pass_arrived", ev["catch"])), k(ev["pass_forward"])
    lat_c = rel(kc)[1]
    kind = "out" if lat_c > 1.5 else "in" if lat_c < -1.5 else "now"
    turn = next((f * dt for f in range(kc + 1) if abs(rel(f)[1]) > 1.0), None)
    row = {"kind": kind, "type": sc.get("type") or kind, "turn": turn, "t_throw": ev["pass_forward"], "t_catch": ev.get("pass_arrived", ev["catch"])}
    for t in TS:
        f = k(t)
        row[t] = (rel(f), spd(f)) if f <= kc else None
    row["throw"], row["catch"] = (rel(kt), spd(kt)), (rel(kc), spd(kc))
    return row


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plays", nargs="+")
    ap.add_argument("--by", default="kind", choices=["kind", "type"])
    a = ap.parse_args()
    groups = collections.defaultdict(list)
    for path in a.plays:
        for line in gzip.open(path, "rt"):
            m = measure(json.loads(line))
            if m:
                groups[m[a.by]].append(m)
    for g, R in sorted(groups.items()):
        print(f"\n== {g}: n {len(R)} | throw {q([x['t_throw'] for x in R])} s, catch {q([x['t_catch'] for x in R])} s, lateral turn {q([x['turn'] for x in R])} s")
        for key in (*TS, "throw", "catch"):
            V = [x[key] for x in R if x[key] is not None]
            if len(V) < max(3, len(R) // 4):
                continue
            lab = f"{key:.1f}s" if isinstance(key, float) else key
            print(f"  {lab:6} n {len(V):3} depth {q([v[0][0] for v in V])} lateral {q([v[0][1] for v in V])} speed {q([v[1] for v in V])}")


if __name__ == "__main__":
    sys.exit(main())
