#!/usr/bin/env python3
"""Perimeter run support on outside zone and toss: who forces, who fills, how
deep the force player is when the runner reaches the edge. One position-only
operator for NFL (BDB2025 common plays) and run-only sim film
(scripts/diag/run-film-trace.ts), using run_film_reference.py's loaders.

    python3 -I scripts/mechanics/run_perimeter_support.py NFL_PLAYS.jsonl.gz out/run/trace-seed7.json [...]

x = yards past the LOS. Definitions:
- defender class, from his spot at the snap: DB 8+ yd from the ball laterally
  = "corner"; other DB 7+ yd deep = "safety"; other DB = "nickel"; LB; DL.
- playside: the side of the ball the carrier is on when he first reaches the
  edge. The edge: the carrier 1.5 yd outside the widest OL's snap spot, before
  he is 4 yd past the LOS. Runs that never reach it are "no edge".
- force player at edge time: the defender nearest the carrier among those
  level with or outside him on the playside, from 2 yd behind to 10 yd past
  the LOS. His depth (x), how far outside the carrier he is, and his distance.
- force set: whether that force player is outside the carrier and within 3 yd
  of the LOS ("squeezes the edge") or deeper ("soft").
- first to the runner: the first defender within 1.5 yd of the carrier after
  edge time, and how long after.
- unblocked: the force player is not within 1.2 yd of any offensive player.
Prints tables only.
"""
import collections
import math
import os
import statistics as st
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_film_reference import nfl, sim  # noqa: E402

SIM_KEEP = {"oz_strong": "OZ", "oz_weak": "OZ", "wz_strong": "OZ", "wz_weak": "OZ", "toss": "TOSS"}


def cls(play, j):
    g = play["players"][j]["group"]
    x0, y0 = play["xy"][0][j]
    if g == "DB":
        if abs(y0 - play["ball_y"]) >= 8:
            return "corner"
        return "safety" if x0 >= 7 else "nickel"
    return g


def measure(play, out):
    xy, c, players = play["xy"], play["carrier"], play["players"]
    n = len(xy)
    if n < 15:
        return
    ol = [i for i, q in enumerate(players) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) < 5:
        return
    cy = st.mean(xy[0][i][1] for i in ol)
    play["ball_y"] = cy
    half = max(abs(xy[0][i][1] - cy) for i in ol)
    off = [i for i, q in enumerate(players) if q["side"] == "O" and i != c]
    dfn = [i for i, q in enumerate(players) if q["side"] == "D"]
    start = int(round((play["handoff"] or 0) / 0.1))
    edge = None
    for f in range(start, n):
        x, y = xy[f][c]
        if x > 4:
            break
        if abs(y - cy) >= half + 1.5:
            edge = f
            break
    key = play["key"]
    out[key]["runs"] += 1
    side = None
    for f in range(start, n):
        if abs(xy[f][c][1] - cy) >= half + 1.5 or xy[f][c][0] > 0:
            side = 1 if xy[f][c][1] > cy else -1
            break
    for j in dfn:
        k0 = cls(play, j)
        if k0 not in ("corner", "safety", "nickel"):
            continue
        ps = side is not None and (xy[0][j][1] - cy) * side > 0
        row = {"cls": k0 + ("-play" if ps else "-back"), "x0": xy[0][j][0], "w0": abs(xy[0][j][1] - cy)}
        for t in (0.5, 1.0, 1.5, 2.0, 2.5):
            f = int(round(t / 0.1))
            if f + 1 < n and f >= 1:
                row[t] = (xy[f + 1][j][0] - xy[f - 1][j][0]) / 0.2
                row["x" + str(t)] = xy[f][j][0]
        onset = next((f * 0.1 for f in range(2, min(n - 1, 45)) if (xy[f + 1][j][0] - xy[f - 1][j][0]) / 0.2 < -1.0), None)
        row["onset"] = onset
        row["onset_h"] = None if onset is None or play["handoff"] is None else onset - play["handoff"]
        out[key]["db"].append(row)
    if edge is None:
        out[key]["noedge"] += 1
        return
    s = 1 if xy[edge][c][1] > cy else -1
    cx, cyy = xy[edge][c]
    cand = [j for j in dfn if -2 <= xy[edge][j][0] <= 10 and (xy[edge][j][1] - cyy) * s >= -0.5]
    if not cand:
        out[key]["noforce"] += 1
        return
    j = min(cand, key=lambda j: math.hypot(xy[edge][j][0] - cx, xy[edge][j][1] - cyy))
    fx, fy = xy[edge][j]
    blocked = any(math.hypot(xy[edge][o][0] - fx, xy[edge][o][1] - fy) < 1.2 for o in off)
    first = None
    for f in range(edge, n):
        near = [d for d in dfn if math.hypot(xy[f][d][0] - xy[f][c][0], xy[f][d][1] - xy[f][c][1]) < 1.5]
        if near:
            first = (cls(play, min(near, key=lambda d: math.hypot(xy[f][d][0] - xy[f][c][0], xy[f][d][1] - xy[f][c][1]))), (f - edge) * 0.1)
            break
    out[key]["rows"].append({"t": edge * 0.1, "cls": cls(play, j), "depth": fx, "outside": (fy - cyy) * s,
                             "dist": math.hypot(fx - cx, fy - cyy), "blocked": blocked, "first": first})


def report(out):
    q = lambda v, p=.5: round(sorted(v)[int(p * (len(v) - 1))], 2) if v else None
    for key in sorted(out):
        o = out[key]; rows = o["rows"]
        if not rows:
            continue
        print(f"{key}: runs {o['runs']}, reached the edge {len(rows)} ({len(rows) / o['runs']:.2f}), no edge {o['noedge']}, no force candidate {o['noforce']}")
        print(f"   edge time p50 {q([r['t'] for r in rows])} s")
        cc = collections.Counter(r["cls"] for r in rows)
        print("   force player: " + "  ".join(f"{k} {v / len(rows):.2f}" for k, v in cc.most_common()))
        for k, _ in cc.most_common(4):
            rs = [r for r in rows if r["cls"] == k]
            print(f"     {k:7s} n {len(rs):4d} depth p25/p50/p75 {q([r['depth'] for r in rs], .25)}/{q([r['depth'] for r in rs])}/{q([r['depth'] for r in rs], .75)}"
                  f" | outside carrier {q([r['outside'] for r in rs])} | dist {q([r['dist'] for r in rs])} | blocked {sum(r['blocked'] for r in rs) / len(rs):.2f}")
        sq = [r for r in rows if r["outside"] > 0 and r["depth"] <= 3]
        print(f"   force squeezes the edge (outside him, within 3 yd of the LOS): {len(sq) / len(rows):.2f}; all force depth p50 {q([r['depth'] for r in rows])}, unblocked {sum(not r['blocked'] for r in rows) / len(rows):.2f}")
        fc = collections.Counter(r["first"][0] for r in rows if r["first"])
        tf = [r["first"][1] for r in rows if r["first"]]
        dbs = o["db"]
        for k in ("corner-play", "corner-back", "safety-play", "nickel-play"):
            rs = [r for r in dbs if r["cls"] == k]
            if not rs:
                continue
            print(f"     DB {k:12s} n {len(rs):4d} snap depth {q([r['x0'] for r in rs])} width {q([r['w0'] for r in rs])} | downfield speed "
                  + " ".join(f"{t}s:{q([r[t] for r in rs if t in r])}" for t in (0.5, 1.0, 1.5, 2.0, 2.5))
                  + " | depth " + " ".join(f"{t}s:{q([r['x' + str(t)] for r in rs if 'x' + str(t) in r])}" for t in (1.0, 2.0))
                  + f" | downhill by 4.5 s {sum(r['onset'] is not None for r in rs) / len(rs):.2f}, onset p50 {q([r['onset'] for r in rs if r['onset'] is not None])} s"
                  + f" (after handoff {q([r['onset_h'] for r in rs if r['onset_h'] is not None])} s)")
        print("   first to the runner after the edge: " + "  ".join(f"{k} {v / len(rows):.2f}" for k, v in fc.most_common())
              + f" | none {sum(1 for r in rows if not r['first']) / len(rows):.2f} | time p50 {q(tf)} s")


def main():
    out = collections.defaultdict(lambda: {"runs": 0, "noedge": 0, "noforce": 0, "rows": [], "db": []})
    for p in nfl(sys.argv[1]):
        if p["concept"] == "OUTSIDE ZONE":
            p["key"] = "NFL outside zone"
            measure(p, out)
    for path in sys.argv[2:]:
        for p, raw in zip(sim([path]), _raw(path)):
            k = SIM_KEEP.get(raw)
            if k:
                p["key"] = f"sim {k}"
                measure(p, out)
    report(out)


def _raw(path):
    import json
    with open(path) as handle:
        for p in json.load(handle):
            if p["nullified"]:
                continue
            agents = p["setup"]["agents"]
            if next((f["c"] for f in p["frames"] if f["c"] >= 0 and agents[f["c"]]["slot"] != "QB"), None) is None:
                continue
            yield p["setup"]["concept"]


if __name__ == "__main__":
    main()
