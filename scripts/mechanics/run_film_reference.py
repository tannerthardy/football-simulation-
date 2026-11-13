#!/usr/bin/env python3
"""Run-game reference: the same position-only measures on NFL runs and on
run-only sim film (docs/reviews/2026-10-27-run-game-diagnosis.md).

    python3 -I scripts/mechanics/run_film_reference.py out/mechanics/nfl-plays-w12.jsonl.gz \
        out/run/trace-seed7.json [out/run/trace-seed9.json ...]

NFL input: nfl_bdb2025.py --plays-out (BDB2025, 2022 season). Sim input:
scripts/diag/run-film-trace.ts (10 Hz, every offensive call a designed run).
Prints tables only; nothing is written. Definitions (x = yards past the LOS):

- timeline: handoff event; first frame the carrier is past the LOS; first
  contact (NFL event first_contact, sim carrier_contact/tackle_wrap event) and
  the carrier's x then ("backfield" = contact behind the LOS).
- pullers on POWER/COUNTER/TRAP, one rule on both sides: an OL who gets 3+ yd
  laterally from his snap spot within 2.5 s while staying no more than 0.5 yd
  past the LOS until he is 2 yd lateral. The sim also gets a row for every OL
  with plan "pull" (the installed pullers), with how many the rule catches.
  Distance from his snap spot at 0.5/1.0/1.5 s, deepest point behind the LOS in
  2.5 s, time to 3 yd lateral, first frame within 1.2 yd of a defender after
  0.6 s with 2+ yd lateral ("touch"), that defender's depth, and whether the
  touch came before the carrier crossed the LOS.
- box backers: LB group 2.5-8 yd deep within 6 yd of the ball; touched if an
  OL/TE/back past -0.5 yd comes within 1.5 yd of him before the carrier reaches
  his depth minus 1 yd.
- edges: the widest DL/LB on the line (x < 1.8) each side; wide when 1.5+ yd
  outside the widest inline OL/TE. Playside is the side the carrier crosses
  the LOS on. "deep" = 2+ yd into the backfield within 2.5 s; "in on the play"
  = within 1.5 yd of the carrier on the play's last frame.
- OL start: every OL's distance from his snap spot at 0.3/0.5/1.0 s.
"""
import gzip
import json
import math
import statistics as st
import sys

GROUP = {"QB": "QB", "OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "WR": "WR",
         "EDGE": "DL", "DT": "DL", "DE": "DL", "LB": "LB", "CB": "DB", "S": "DB"}
SIM_CONCEPT = {"iz_strong": "INSIDE ZONE", "iz_weak": "INSIDE ZONE", "duo": "INSIDE ZONE", "split_zone": "INSIDE ZONE",
               "oz_strong": "OUTSIDE ZONE", "oz_weak": "OUTSIDE ZONE", "wz_strong": "OUTSIDE ZONE",
               "wz_weak": "OUTSIDE ZONE", "toss": "OUTSIDE ZONE", "power": "POWER", "counter": "COUNTER",
               "trap": "TRAP", "draw": "DRAW"}
CONCEPTS = ["INSIDE ZONE", "OUTSIDE ZONE", "POWER", "COUNTER", "TRAP", "DRAW"]


def nfl(path):
    with gzip.open(path, "rt") as handle:
        for line in handle:
            p = json.loads(line)
            if p["kind"] != "run" or p["carrier"] is None:
                continue
            n = len(p["players"])
            yield {"src": "nfl", "concept": p["cell"]["concept"], "players": p["players"],
                   "xy": [[(r[2 * i], r[2 * i + 1]) for i in range(n)] for r in p["xy"]], "carrier": p["carrier"],
                   "handoff": p["events"].get("handoff"), "contact": p["events"].get("first_contact"),
                   "end": p["events"]["end"]}


def sim(paths):
    for path in paths:
        with open(path) as handle:
            plays = json.load(handle)
        for p in plays:
            if p["nullified"]:
                continue
            s, agents = p["setup"], p["setup"]["agents"]
            # Frame k must sit at 0.1k s, the NFL clock. Traces written before
            # the t=0 frame was recorded sit at 0.1k + 0.05 and are refused.
            if any(abs(f["t"] - 0.1 * k) > 0.011 for k, f in enumerate(p["frames"][:30])):
                raise SystemExit(f"{path}: frames are not at t = 0.1k; re-run scripts/diag/run-film-trace.ts")
            car = next((f["c"] for f in p["frames"] if f["c"] >= 0 and agents[f["c"]]["slot"] != "QB"), None)
            if car is None:
                continue
            ev = p["events"]
            yield {"src": "sim", "concept": SIM_CONCEPT.get(s["concept"], s["concept"]),
                   "players": [{"side": a["team"], "group": GROUP.get(a["pos"], a["pos"]), "plan": a["plan"]} for a in agents],
                   "xy": [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in p["frames"]], "carrier": car,
                   "handoff": next((e["t"] for e in ev if e["type"] in ("handoff", "pitch")), None),
                   "contact": next((e["t"] for e in ev if e["type"] in ("carrier_contact", "tackle_wrap")), None),
                   "end": next((e["t"] for e in ev if e["type"] in ("tackle", "out_of_bounds", "touchdown")), p["frames"][-1]["t"])}


def med(v):
    v = [x for x in v if x is not None]
    return round(st.median(v), 2) if v else None


def mean(v):
    v = [x for x in v if x is not None]
    return round(sum(v) / len(v), 2) if v else None


def puller(xy, i, last):
    """3+ yd lateral by frame `last`, never more than 0.5 yd past the LOS before 2 yd lateral."""
    x0, y0 = xy[0][i]
    for f in range(min(len(xy), last + 1)):
        lateral = abs(xy[f][i][1] - y0)
        if lateral < 2 and xy[f][i][0] > 0.5:
            return False
        if lateral >= 3:
            return True
    return False


def measure(play, out):
    xy, c, players = play["xy"], play["carrier"], play["players"]
    n, src = len(xy), play["src"]
    if n < 15:
        return
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    dist = lambda i, j, f: math.hypot(xy[f][i][0] - xy[f][j][0], xy[f][i][1] - xy[f][j][1])
    cross = next((f * 0.1 for f in range(n) if xy[f][c][0] > 0), None)
    ct = play["contact"]
    cx = xy[k(ct)][c][0] if ct is not None else None
    out["timeline"].append((src, play["concept"], play["handoff"], cross, ct, cx))
    ol = [i for i, q in enumerate(players) if q["side"] == "O" and q["group"] == "OL"]
    dfn = [i for i, q in enumerate(players) if q["side"] == "D"]
    for i in ol:
        out["start"].append((src, *[math.hypot(xy[k(t)][i][0] - xy[0][i][0], xy[k(t)][i][1] - xy[0][i][1]) for t in (0.3, 0.5, 1.0)]))
    if play["concept"] in ("POWER", "COUNTER", "TRAP"):
        for i in ol:
            x0, y0 = xy[0][i]
            ruled = puller(xy, i, k(2.5))
            planned = src == "sim" and players[i].get("plan") == "pull"
            if not ruled and not planned:
                continue
            moved = [math.hypot(xy[k(t)][i][0] - x0, xy[k(t)][i][1] - y0) for t in (0.5, 1.0, 1.5)]
            depth = -min(xy[f][i][0] for f in range(min(n, k(2.5) + 1)))
            lat3 = next((f * 0.1 for f in range(n) if abs(xy[f][i][1] - y0) >= 3), None)
            touch = None
            for f in range(k(0.6), min(n, k(4.0))):
                if abs(xy[f][i][1] - y0) < 2:
                    continue
                hit = [j for j in dfn if dist(i, j, f) < 1.2]
                if hit:
                    touch = (f * 0.1, xy[f][hit[0]][0], xy[f][hit[0]][0] < xy[f][c][0])
                    break
            row = (play["concept"], *moved, depth, lat3, touch[0] if touch else None,
                   touch[1] if touch else None, touch is not None and cross is not None and touch[0] <= cross,
                   touch[2] if touch else None)
            if ruled:
                out["pull"].append((src, *row))
            if planned:
                out["pull"].append(("sim plan", *row, ruled))
    if len(ol) < 5:
        return
    blockers = [i for i, q in enumerate(players) if q["side"] == "O" and q["group"] in ("OL", "TE", "RB") and i != c]
    cy = st.mean(xy[0][i][1] for i in ol)
    for j in dfn:
        x0, y0 = xy[0][j]
        if players[j]["group"] != "LB" or not (2.5 <= x0 <= 8 and abs(y0 - cy) < 6):
            continue
        arrive = next((f for f in range(n) if xy[f][c][0] >= xy[f][j][0] - 1), None)
        last = arrive if arrive is not None else min(n, k(play["end"]))
        touched = any(dist(j, b, f) < 1.5 for f in range(3, last) for b in blockers if xy[f][b][0] > -0.5)
        out["backer"].append((src, play["concept"], touched))
    inline = [i for i, q in enumerate(players) if q["side"] == "O" and q["group"] in ("OL", "TE") and xy[0][i][0] > -2.2]
    half = max(abs(xy[0][i][1] - cy) for i in ol)
    side = (1 if xy[k(cross)][c][1] > cy else -1) if cross is not None else None
    for s in (1, -1):
        outer = max((xy[0][i][1] - cy) * s for i in inline if (xy[0][i][1] - cy) * s > 0 and abs(xy[0][i][1] - cy) < half + 2.3)
        cand = [j for j in dfn if xy[0][j][0] < 1.8 and players[j]["group"] in ("DL", "LB") and (xy[0][j][1] - cy) * s > 0]
        if not cand:
            continue
        j = max(cand, key=lambda j: (xy[0][j][1] - cy) * s)
        if (xy[0][j][1] - cy) * s - outer < 1.5:
            continue
        deep = -min(xy[f][j][0] for f in range(min(n, k(2.5) + 1))) >= 2.0
        in_on = dist(j, c, k(play["end"])) < 1.5
        first = ct is not None and dist(j, c, k(ct)) < 1.5
        out["edge"].append((src, None if side is None else side == s, deep, first, in_on))


def main():
    out = {"timeline": [], "start": [], "pull": [], "backer": [], "edge": []}
    if sys.argv[1] != "-":  # "-" = no NFL reference, sim tables only
        for play in nfl(sys.argv[1]):
            measure(play, out)
    for play in sim(sys.argv[2:]):
        measure(play, out)
    print("Timeline: n, handoff, carrier past LOS, never past LOS, first contact, carrier x at contact, contact behind LOS")
    for concept in CONCEPTS:
        for src in ("nfl", "sim"):
            r = [t for t in out["timeline"] if t[0] == src and t[1] == concept]
            if r:
                print(f"  {concept:13s} {src}: {len(r):4d} {med([t[2] for t in r])} {med([t[3] for t in r])} "
                      f"{mean([t[3] is None for t in r])} {med([t[4] for t in r])} {med([t[5] for t in r])} "
                      f"{mean([t[5] < 0 for t in r if t[5] is not None])}")
    print("OL start (all OL on runs): distance at 0.3 / 0.5 / 1.0 s")
    for src in ("nfl", "sim"):
        r = [t for t in out["start"] if t[0] == src]
        print(f"  {src}: {med([t[1] for t in r])} {med([t[2] for t in r])} {med([t[3] for t in r])} (n={len(r)})")
    print("Pullers: n, moved 0.5/1.0/1.5 s, deepest, 3 yd lateral at, touch at, no touch, touched man's depth, touch before carrier crosses, touched man deeper than the runner")
    print("  (rows nfl and sim use the same rule; 'sim plan' is every installed puller, last column = share the rule catches)")
    for concept in ("POWER", "COUNTER", "TRAP"):
        for src in ("nfl", "sim", "sim plan"):
            r = [t for t in out["pull"] if t[0] == src and t[1] == concept]
            if r:
                caught = f" {mean([t[11] for t in r])}" if src == "sim plan" else ""
                print(f"  {concept:8s} {src:8s}: {len(r):4d} {med([t[2] for t in r])} {med([t[3] for t in r])} {med([t[4] for t in r])} "
                      f"{med([t[5] for t in r])} {med([t[6] for t in r])} {med([t[7] for t in r])} {mean([t[7] is None for t in r])} "
                      f"{med([t[8] for t in r])} {mean([t[9] for t in r])} {mean([t[10] for t in r if t[10] is not None])}{caught}")
    print("Box backers touched by a blocker before the carrier reaches them")
    for concept in CONCEPTS + [None]:
        for src in ("nfl", "sim"):
            r = [t[2] for t in out["backer"] if t[0] == src and (concept is None or t[1] == concept)]
            if r:
                print(f"  {concept or 'ALL':13s} {src}: {mean(r)} (n={len(r)})")
    print("Wide edges (1.5+ yd outside the surface): n, deep 2+ yd, first contact, in on the play at the end")
    for playside in (True, False):
        for src in ("nfl", "sim"):
            r = [t for t in out["edge"] if t[0] == src and t[1] is playside]
            print(f"  {'playside' if playside else 'backside'} {src}: {len(r)} {mean([t[2] for t in r])} "
                  f"{mean([t[3] for t in r])} {mean([t[4] for t in r])}")


if __name__ == "__main__":
    main()
