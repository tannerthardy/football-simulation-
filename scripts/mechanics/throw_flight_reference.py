#!/usr/bin/env python3
"""Flight time vs throw distance: screens vs other short passes, NFL vs sim.

    python3 -I scripts/mechanics/throw_flight_reference.py out/screens/nfl-screens.jsonl.gz out/screens/sim-screens.jsonl.gz [--all NFL_OR_SIM_PLAYS.jsonl.gz ...]

Per completed or arrived pass: distance from the QB at the throw to the target
at pass_arrived (catch if present), flight time = arrival - throw, and the
mean ball speed (distance / flight time). Grouped by distance bucket.
"""
import gzip, json, math, sys, collections

BUCKETS = ((0, 6), (6, 10), (10, 14), (14, 20))


def q(v):
    v = sorted(v)
    return f"{v[len(v)//4]:.2f}/{v[len(v)//2]:.2f}/{v[(3*len(v))//4]:.2f} (n {len(v)})" if v else "-"


def rows(path, screens_only):
    for line in gzip.open(path, "rt"):
        p = json.loads(line)
        ev = p["events"]; t = p.get("target")
        if t is None or "pass_forward" not in ev:
            continue
        ta = ev.get("catch", ev.get("pass_arrived"))
        if ta is None or ta <= ev["pass_forward"]:
            continue
        is_screen = bool(p.get("screen"))
        if screens_only and not is_screen:
            continue
        qb = next((j for j, pl in enumerate(p["players"]) if pl["group"] == "QB" and pl["side"] == "O"), None)
        if qb is None:
            continue
        xy, dt = p["xy"], p.get("dt", 0.1); n = len(xy)
        P = lambda k, j: (xy[min(k, n - 1)][2 * j], xy[min(k, n - 1)][2 * j + 1])
        a, b = P(int(round(ev["pass_forward"] / dt)), qb), P(int(round(ta / dt)), t)
        d = math.dist(a, b); T = ta - ev["pass_forward"]
        yield {"d": d, "T": T, "v": d / T, "behind": b[0] <= 0.5}


args = sys.argv[1:]
groups = []
mode = "screens"
for a in args:
    if a == "--all":
        mode = "all"; continue
    groups.append((a, mode))
for path, mode in groups:
    R = list(rows(path, mode == "screens"))
    if mode == "all":
        R = [r for r in R if r["d"] < 20]
    print(f"\n{path} [{mode}]: {len(R)} passes")
    for lo, hi in BUCKETS:
        S = [r for r in R if lo <= r["d"] < hi]
        if S:
            print(f"  throw {lo:>2}-{hi:<2} yd: flight {q([r['T'] for r in S])} s | mean ball speed {q([r['v'] for r in S])} yd/s")
