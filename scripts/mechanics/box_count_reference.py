#!/usr/bin/env python3
"""Box counts on run snaps: how many defenders the run met against how many
blockers it had, one position-only operator for NFL tracking and run-only sim
film (scripts/diag/run-film-trace.ts), using run_film_reference.py's loaders.

    python3 -I scripts/mechanics/box_count_reference.py NFL_PLAYS.jsonl.gz out/run/trace-seed7.json [...]

x = yards past the LOS, at the snap frame. Definitions:
- box: defenders (DL, LB, DB) less than 7.5 yd deep and within 6.5 yd of the
  OL centre (the mean lateral spot of the five linemen). The same window as
  the QB's pre-snap count in src/sim/qbmind.ts.
- blockers: the OL; TEs within 6.5 yd of the OL centre; non-carrier backs in
  the backfield (x < -1) within 6.5 yd.
- surplus = box - blockers. Buckets: light (< 0), even (0), +1, +2 or more.
- personnel: backs and tight ends on the field ("11" = one back, one TE).
- box backer touched (run_film_reference.py's definition): an LB 2.5-8 yd
  deep within 6 yd of the OL centre at the snap is touched if an OL, TE or
  non-carrier back past -0.5 yd comes within 1.5 yd of him before the carrier
  reaches his depth minus 1 yd.
Runs are the runs actually run: NFL rates include play callers choosing runs
against light boxes and checking out of loaded ones. Compare like boxes (the
last table) before reading the overall rates. Prints tables only.
"""
import collections
import json
import math
import os
import statistics as st
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_film_reference import nfl, sim  # noqa: E402


def bucket(surplus):
    return "light" if surplus < 0 else "even" if surplus == 0 else "+1" if surplus == 1 else "+2 or more"


BUCKETS = ("light", "even", "+1", "+2 or more")


def measure(play, out):
    xy, car, players = play["xy"], play["carrier"], play["players"]
    if not xy:
        return
    grp = [q["group"] for q in players]
    ol = [i for i, g in enumerate(grp) if g == "OL"]
    if len(ol) < 5:
        return
    cy = st.mean(xy[0][i][1] for i in ol)
    box = [i for i, g in enumerate(grp) if g in ("DL", "LB", "DB")
           and xy[0][i][0] < 7.5 and abs(xy[0][i][1] - cy) < 6.5]
    backs = [i for i, g in enumerate(grp) if g == "RB" and i != car
             and xy[0][i][0] < -1 and abs(xy[0][i][1] - cy) < 6.5]
    tes = [i for i, g in enumerate(grp) if g == "TE" and abs(xy[0][i][1] - cy) < 6.5]
    blockers = ol + tes + backs
    surplus = len(box) - len(blockers)
    b = bucket(surplus)
    pers = f"{sum(g == 'RB' for g in grp)}{sum(g == 'TE' for g in grp)}"
    src, concept = play["src"], play["concept"]
    for key in ((src, "ALL"), (src, concept)):
        r = out["concept"][key]
        r["n"] += 1
        r["box"] += len(box)
        r["blk"] += len(blockers)
        r["surplus"] += surplus
        r[b] += 1
    r = out["personnel"][(src, pers)]
    r["n"] += 1
    r["box"] += len(box)
    r["blk"] += len(blockers)
    r["+2 or more"] += surplus >= 2
    c = out["composition"][src]
    c["n"] += 1
    c["TE on field"] += sum(g == "TE" for g in grp)
    c["TE in box"] += len(tes)
    c["blocking back"] += len(backs)
    c["WR on field"] += sum(g == "WR" for g in grp)
    c["DL"] += sum(g == "DL" for g in grp)
    c["LB"] += sum(g == "LB" for g in grp)
    c["DB in box"] += sum(grp[i] == "DB" for i in box)

    blk = [i for i, g in enumerate(grp) if g in ("OL", "TE", "RB") and i != car]
    for j, g in enumerate(grp):
        if g != "LB" or not (2.5 <= xy[0][j][0] <= 8 and abs(xy[0][j][1] - cy) < 6):
            continue
        arrive = next((k for k in range(len(xy)) if xy[k][car][0] >= xy[k][j][0] - 1), len(xy) - 1)
        touched = any(math.dist(xy[k][q], xy[k][j]) < 1.5 and xy[k][q][0] > -0.5
                      for k in range(3, arrive) for q in blk)
        for key in ((src, "ALL", b), (src, concept, b)):
            t = out["touch"][key]
            t["n"] += 1
            t["touched"] += touched


def run_films(paths):
    """Run snaps from sim film. The film also carries pass snaps, which have no
    run concept; the shared loader expects one on every play."""
    with tempfile.TemporaryDirectory() as tmp:
        kept = []
        for i, path in enumerate(paths):
            with open(path) as f:
                plays = [p for p in json.load(f) if p.get("setup", {}).get("concept")]
            out = os.path.join(tmp, f"{i}.json")
            with open(out, "w") as f:
                json.dump(plays, f)
            kept.append(out)
        yield from sim(kept)


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    out = {k: collections.defaultdict(collections.Counter) for k in ("concept", "personnel", "composition", "touch")}
    for play in nfl(argv[0]):
        measure(play, out)
    for play in run_films(argv[1:]):
        measure(play, out)

    print("BOX SURPLUS by concept (box - blockers; shares of runs)")
    for (src, concept), r in sorted(out["concept"].items(), key=lambda kv: (kv[0][1] != "ALL", kv[0][1], kv[0][0])):
        n = r["n"]
        if n < 30:
            continue
        shares = "  ".join(f"{b} {r[b] / n:.2f}" for b in BUCKETS)
        print(f"  {concept:13} {src:3} n {n:5} | box {r['box'] / n:.2f} blockers {r['blk'] / n:.2f}"
              f" | mean {r['surplus'] / n:+.2f} | {shares}")

    print("\nPERSONNEL on the field and in the box (per run)")
    for src, c in sorted(out["composition"].items()):
        n = c["n"]
        print(f"  {src:3} n {n:5} | " + " | ".join(f"{k} {v / n:.2f}" for k, v in c.items() if k != "n"))

    print("\nBOX by offensive personnel")
    total = collections.Counter()
    for (src, _), r in out["personnel"].items():
        total[src] += r["n"]
    for (src, pers), r in sorted(out["personnel"].items(), key=lambda kv: (kv[0][1], kv[0][0])):
        n = r["n"]
        if n < 30:
            continue
        print(f"  {pers} {src:3} share of runs {n / total[src]:.2f} | box {r['box'] / n:.2f}"
              f" blockers {r['blk'] / n:.2f} | +2 or more {r['+2 or more'] / n:.2f}")

    print("\nBOX BACKERS TOUCHED before the carrier, like box against like box")
    for (src, concept, b), t in sorted(out["touch"].items(),
                                       key=lambda kv: (kv[0][1] != "ALL", kv[0][1], BUCKETS.index(kv[0][2]), kv[0][0])):
        if t["n"] < 20:
            continue
        print(f"  {concept:13} {b:10} {src:3} backers {t['n']:5} | touched {t['touched'] / t['n']:.2f}")


if __name__ == "__main__":
    main(sys.argv[1:])
