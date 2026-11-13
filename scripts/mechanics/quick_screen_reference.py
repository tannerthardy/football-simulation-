#!/usr/bin/env python3
"""Quick screens: the defender over the screen receiver, from the snap to the
catch. Is the ball thrown into a covered man, and why? One position-only
measurement for NFL WR screens (nfl_screens.py) and sim screen-lab plays, in
the common play format.

    python3 -I scripts/mechanics/quick_screen_reference.py PLAYS.jsonl.gz [...] [--by kind|type]

Plays: completed or targeted screens whose receiver is a WR/TE detached
(> 3.5 yd from the ball) at the snap. Frame 0 is the snap; x is yards past
the line in the offense's direction; the receiver's side s = sign(y - ball_y).

Kind (NFL and sim alike, from the receiver's motion snap -> catch):
  out   lateral move away from the ball > 1.5 yd   (bubble, swing-like)
  in    lateral move toward the ball > 1.5 yd      (tunnel, slip-like)
  now   neither                                    (now / quick / hitch screens)
Coverage: man (Cover-0, Cover-1, 2-Man, sim "Cover 1") or zone. Man rows
split into press (the man over him is a DB within 2 yd of the line at the
snap) and off.

The man over him, M: the defender (DB/LB) nearest the receiver at the snap.
At the snap: M's depth (x), cushion (distance), and leverage (lateral offset
of M from the receiver, + = outside him, away from the ball).
At the throw: R-M distance, M's depth, M's speed toward R (yd/s, from
positions over the last 0.2 s), and the receiver's displacement since the
snap. At the catch: R-M distance, and whether the nearest defender is M.
Times: throw (pass_forward) and flight (catch - throw).
The closer, C: of the DBs/LBs within 10 yd of the receiver at the snap, the
one whose distance to him shrinks most from the snap to the throw. Reported:
his depth at the snap and at the throw, his gain on the receiver (yd) by the
throw, his distance at the catch, whether he started inside the receiver,
and whether he is the nearest defender at the catch.
"""
import argparse
import collections
import gzip
import json
import math
import sys

MAN = {"Cover-0", "Cover-1", "2-Man"}


def load(paths):
    for p in paths:
        with (gzip.open if p.endswith(".gz") else open)(p, "rt") as fh:
            for line in fh:
                if line.strip():
                    yield json.loads(line)


def measure(p):
    sc = p.get("screen") or {}
    r = sc.get("receiver", p.get("target"))
    ev = p.get("events", {})
    t_throw, t_catch = ev.get("pass_forward"), ev.get("pass_arrived", ev.get("catch"))
    if r is None or t_throw is None or t_catch is None:
        return None
    players = p["players"]
    if players[r]["group"] not in ("WR", "TE"):
        return None
    dt, xy, by = p.get("dt", 0.1), p["xy"], p.get("ball_y", 26.65)
    k = lambda t: max(0, min(len(xy) - 1, int(round(t / dt))))
    P = lambda f, j: (xy[f][2 * j], xy[f][2 * j + 1])
    rx0, ry0 = P(0, r)
    if abs(ry0 - by) <= 3.5:
        return None
    s = 1 if ry0 > by else -1
    de = [j for j, q in enumerate(players) if q["side"] == "D" and q["group"] in ("DB", "LB")]
    if not de:
        return None
    m = min(de, key=lambda j: math.hypot(P(0, j)[0] - rx0, P(0, j)[1] - ry0))
    kt, kc = k(t_throw), k(t_catch)
    rxc, ryc = P(kc, r)
    lat = (ryc - ry0) * s
    kind = "out" if lat > 1.5 else "in" if lat < -1.5 else "now"
    cov = (p.get("cell") or {}).get("coverage") or sc.get("defense") or ""
    man = cov in MAN or ("Cover 1" in cov)
    d = lambda f, a, b: math.hypot(P(f, a)[0] - P(f, b)[0], P(f, a)[1] - P(f, b)[1])
    # M's closing speed on R at the throw.
    kp = max(0, kt - 2)
    close = (d(kp, r, m) - d(kt, r, m)) / max(dt, (kt - kp) * dt)
    alld = [j for j, q in enumerate(players) if q["side"] == "D"]
    pool = [j for j in de if d(0, r, j) <= 10] or [m]
    c = max(pool, key=lambda j: d(0, r, j) - d(kt, r, j))
    nearest = min(alld, key=lambda j: d(kc, r, j))
    return {"type": sc.get("type") or kind, "kind": kind, "man": man, "caught": "catch" in ev or sc.get("passResult") == "C",
            "width": abs(ry0 - by), "m_group": players[m]["group"],
            "m_depth0": P(0, m)[0], "cushion0": d(0, r, m), "lev0": (P(0, m)[1] - ry0) * s,
            "rm_throw": d(kt, r, m), "m_depth_throw": P(kt, m)[0], "m_close_throw": close,
            "r_move_throw": math.hypot(P(kt, r)[0] - rx0, P(kt, r)[1] - ry0), "r_back_throw": rx0 - P(kt, r)[0],
            "rm_catch": d(kc, r, m), "nearest_is_m": nearest == m, "nearest_catch": d(kc, r, nearest),
            "c_depth0": P(0, c)[0], "c_depth_throw": P(kt, c)[0], "c_gain": d(0, r, c) - d(kt, r, c), "c_catch": d(kc, r, c),
            "c_inside": (P(0, c)[1] - ry0) * s < 0, "c_is_m": c == m,
            "catch_depth": rxc, "catch_lat": lat, "t_throw": t_throw, "flight": t_catch - t_throw}


def q(v):
    v = sorted(x for x in v if x is not None)
    if not v:
        return "-"
    return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[(3*len(v))//4]:.1f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plays", nargs="+")
    ap.add_argument("--by", default="kind", choices=["kind", "type"])
    a = ap.parse_args()
    rows = [m for m in (measure(p) for p in load(a.plays)) if m]
    groups = collections.defaultdict(list)
    for x in rows:
        cov = ("man press" if x["m_group"] == "DB" and x["m_depth0"] <= 2.0 else "man off") if x["man"] else "zone"
        groups[(x[a.by], cov)].append(x)
    print(f"{len(rows)} detached WR/TE screens (p25/p50/p75)")
    for (g, c), R in sorted(groups.items()):
        print(f"\n== {g} / {c}: n {len(R)}, caught {sum(x['caught'] for x in R)}, M is LB {sum(x['m_group'] == 'LB' for x in R)/len(R):.0%}")
        print(f"  snap:  width {q([x['width'] for x in R])} | M depth {q([x['m_depth0'] for x in R])} cushion {q([x['cushion0'] for x in R])} leverage(+out) {q([x['lev0'] for x in R])}")
        print(f"  throw: t {q([x['t_throw'] for x in R])} s | R moved {q([x['r_move_throw'] for x in R])} (back {q([x['r_back_throw'] for x in R])}) | R-M {q([x['rm_throw'] for x in R])} M depth {q([x['m_depth_throw'] for x in R])} M closing {q([x['m_close_throw'] for x in R])} yd/s")
        print(f"  closer: depth {q([x['c_depth0'] for x in R])} -> {q([x['c_depth_throw'] for x in R])} at throw | gained {q([x['c_gain'] for x in R])} yd on R by throw | R-C at catch {q([x['c_catch'] for x in R])} | started inside {sum(x['c_inside'] for x in R)/len(R):.0%}, is M {sum(x['c_is_m'] for x in R)/len(R):.0%}")
        print(f"  catch: flight {q([x['flight'] for x in R])} s | depth {q([x['catch_depth'] for x in R])} lateral {q([x['catch_lat'] for x in R])} | R-M {q([x['rm_catch'] for x in R])} | nearest {q([x['nearest_catch'] for x in R])} (within 2 yd {sum(x['nearest_catch'] < 2 for x in R)/len(R):.0%}), nearest is M {sum(x['nearest_is_m'] for x in R)/len(R):.0%}")


if __name__ == "__main__":
    sys.exit(main())
