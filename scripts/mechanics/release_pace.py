#!/usr/bin/env python3
"""Receiver release pace: what a defender over a detached receiver sees in the
first 1.2 s. Is a screen blocker's release separable from ordinary releases?

    python3 -I scripts/mechanics/release_pace.py NFL_PLAYS.jsonl.gz [--sim out/screens/sim-screens.jsonl.gz]

NFL plays: the common-format file from nfl_bdb2025.py (--plays-out); route
labels are joined from BDB 2025 player_play.csv (routeRan). Players in a
converted play are ordered offense then defense, each by nflId as a string,
which is how nfl_bdb2025.convert orders them.

Receivers: offensive WR/TE detached at the snap (> 3.5 yd laterally from the
ball). Groups:
  screen blocker   on a WR/TE screen (target ran SCREEN), not the target, no route
  hitch            routeRan HITCH (BDB has no separate curl/comeback label)
  in / slant       routeRan IN or SLANT
  vertical / out   routeRan GO, OUT, POST, CORNER
  run-play WR      detached WR/TE on a designed run (stalk or run-off)
Not separable from BDB labels: option routes, bunch rub/whip releases,
chip-then-release (wasRunningRoute is set either way).
Per group, at 0.3/0.6/0.9/1.2 s after the snap: speed (yd/s) and downfield
velocity (yd/s), from positions (central difference over +/-0.2 s), p25/p50/p75.
Sim: the screen lab's non-catching ScreenBlocker receivers (detached WR/TE that
ran no route on a WR screen), measured the same way.
"""
import argparse
import csv
import gzip
import json
import math
import os
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data/raw/bdb2025/big-data-bowl-data")
TIMES = (0.3, 0.6, 0.9, 1.2)


def kinematics(play, j):
    xy, dt = play["xy"], play.get("dt", 0.1)
    out = []
    for t in TIMES:
        k = int(round(t / dt))
        a, b = max(0, k - 2), min(len(xy) - 1, k + 2)
        if b <= a:
            return None
        vx = (xy[b][2 * j] - xy[a][2 * j]) / ((b - a) * dt)
        vy = (xy[b][2 * j + 1] - xy[a][2 * j + 1]) / ((b - a) * dt)
        out.append((math.hypot(vx, vy), vx))
    return out


def detached(play, j):
    return abs(play["xy"][0][2 * j + 1] - play.get("ball_y", 26.65)) > 3.5


def q(v):
    v = sorted(v)
    return f"{v[len(v)//4]:.1f}/{v[len(v)//2]:.1f}/{v[(3*len(v))//4]:.1f}" if v else "-"


def report(groups):
    for g, rows in groups.items():
        if not rows:
            continue
        cells = []
        for i, t in enumerate(TIMES):
            cells.append(f"{t:.1f}s spd {q([r[i][0] for r in rows])} down {q([r[i][1] for r in rows])}")
        print(f"{g:22} n {len(rows):5} | " + " | ".join(cells))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("nfl")
    ap.add_argument("--sim")
    a = ap.parse_args()
    pp = defaultdict(list)
    with open(os.path.join(DATA, "player_play.csv"), newline="") as fh:
        for r in csv.DictReader(fh):
            pp[f"{r['gameId']}-{r['playId']}"].append(r)
    offense = {}
    with open(os.path.join(DATA, "plays.csv"), newline="") as fh:
        for r in csv.DictReader(fh):
            offense[f"{r['gameId']}-{r['playId']}"] = r["possessionTeam"]
    groups = {k: [] for k in ("screen blocker", "hitch", "in / slant", "vertical / out", "run-play WR")}
    with gzip.open(a.nfl, "rt") as fh:
        for line in fh:
            p = json.loads(line)
            rows = pp.get(p["id"])
            if not rows or p["id"] not in offense:
                continue
            off = sorted((r for r in rows if r["teamAbbr"] == offense[p["id"]]), key=lambda r: r["nflId"])
            if len(off) != sum(pl["side"] == "O" for pl in p["players"]):
                continue
            route = [r["routeRan"] if r["routeRan"] != "NA" else "" for r in off]
            tgt = next((i for i, r in enumerate(off) if r["wasTargettedReceiver"] == "1"), None)
            screen = tgt is not None and route[tgt] == "SCREEN" and p["players"][tgt]["group"] in ("WR", "TE")
            for j, pl in enumerate(p["players"][:len(off)]):
                if pl["group"] not in ("WR", "TE") or not detached(p, j):
                    continue
                kin = kinematics(p, j)
                if not kin:
                    continue
                r = route[j]
                if p["kind"] == "run":
                    groups["run-play WR"].append(kin)
                elif screen and j != tgt and not r:
                    groups["screen blocker"].append(kin)
                elif p["kind"] == "pass" and not screen:
                    if r == "HITCH": groups["hitch"].append(kin)
                    elif r in ("IN", "SLANT"): groups["in / slant"].append(kin)
                    elif r in ("GO", "OUT", "POST", "CORNER"): groups["vertical / out"].append(kin)
    print("NFL (BDB 2025, 2022 weeks 1-9): detached WR/TE release, p25/p50/p75")
    report(groups)
    if a.sim:
        sim = defaultdict(list)
        with gzip.open(a.sim, "rt") as fh:
            for line in fh:
                p = json.loads(line)
                sc = p.get("screen") or {}
                if sc.get("group") not in ("WR", "TE"):
                    continue
                for j, pl in enumerate(p["players"]):
                    if pl["side"] != "O" or pl["group"] not in ("WR", "TE") or j == sc.get("receiver") or not detached(p, j):
                        continue
                    kin = kinematics(p, j)
                    if kin:
                        role = "blocker" if j in (sc.get("blockers") or []) else "route"
                        sim[f"sim {sc.get('type')} {role}"].append(kin)
        print("sim screen lab: detached WR/TE that are not the screen receiver, ScreenBlocker vs route runner")
        report(sim)


if __name__ == "__main__":
    sys.exit(main())
