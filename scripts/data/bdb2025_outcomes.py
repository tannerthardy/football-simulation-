"""NFL play-outcome tables by game state, for the error-budget drive model
(scripts/error-budget.ts). Big Data Bowl 2025: 2022 season, weeks 1-9.

For each state cell (play type, down, distance bucket, field zone) it counts
outcomes and yardage: runs (yards, lost fumbles) and dropbacks split into
sacks, interceptions, incompletions, completions (yards, lost fumbles after
the catch) and scrambles. Also the pass share of plays in each state.

Yardage is pre-penalty; nullified plays, kneels, spikes and sneaks are
excluded. Only aggregate counts are written.

Usage (read raw files as data only; run with -I):
  python3 -I scripts/data/bdb2025_outcomes.py <bdb2025 dir> <out.json>
"""
import csv
import json
import sys
from collections import defaultdict

D, OUT = sys.argv[1], sys.argv[2]


def dist_bucket(d):
    return "1-2" if d <= 2 else "3-6" if d <= 6 else "7-10" if d <= 10 else "11+"


def zone(own):
    return "own" if own < 20 else "mid" if own < 80 else "rz" if own < 95 else "goal"


lost = set()
with open(f"{D}/player_play.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["fumbleLost"] not in ("0", "NA", ""):
            lost.add((r["gameId"], r["playId"], r["teamAbbr"]))

cells = defaultdict(lambda: {"n": 0, "kinds": defaultdict(int), "yards": defaultdict(lambda: defaultdict(int)), "fumbleLost": defaultdict(int)})
policy = defaultdict(lambda: [0, 0])
skipped = 0
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["playNullifiedByPenalty"] == "Y" or r["qbKneel"] not in ("0", "FALSE", "NA") or r["qbSpike"] == "TRUE" or r["qbSneak"] == "TRUE":
            continue
        try:
            yds = int(round(float(r["prePenaltyYardsGained"])))
            down = int(r["down"])
            togo = int(r["yardsToGo"])
            num = int(r["yardlineNumber"])
        except ValueError:
            skipped += 1
            continue
        if down < 1 or down > 4:
            continue
        own = num if r["yardlineSide"] == r["possessionTeam"] else 100 - num
        if r["yardlineNumber"] == "50":
            own = 50
        state = f"{down}|{dist_bucket(togo)}|{zone(own)}"
        dropback = r["isDropback"] == "TRUE"
        policy[state][1] += 1
        if dropback:
            policy[state][0] += 1
        res = r["passResult"]
        fum = (r["gameId"], r["playId"], r["possessionTeam"]) in lost
        if not dropback:
            kind = "run"
        elif res == "S":
            kind = "sack"
        elif res == "IN":
            kind = "int"
        elif res == "I":
            kind = "inc"
        elif res == "C":
            kind = "comp"
        elif res == "R":
            kind = "scramble"
        else:
            skipped += 1
            continue
        key = f"{'run' if kind == 'run' else 'pass'}|{state}"
        c = cells[key]
        c["n"] += 1
        c["kinds"][kind] += 1
        c["yards"][kind][yds] += 1
        if fum:
            c["fumbleLost"][kind] += 1

out = {
    "source": "Big Data Bowl 2025 (2022 weeks 1-9), pre-penalty yards",
    "buckets": {"distance": ["1-2", "3-6", "7-10", "11+"], "zone": {"own": "<20", "mid": "20-79", "rz": "80-94", "goal": "95+"}},
    "skipped": skipped,
    "policy": {k: {"pass": v[0], "plays": v[1]} for k, v in policy.items()},
    "cells": {k: {"n": v["n"], "kinds": dict(v["kinds"]), "yards": {kk: dict(vv) for kk, vv in v["yards"].items()}, "fumbleLost": dict(v["fumbleLost"])} for k, v in cells.items()},
}
with open(OUT, "w") as f:
    json.dump(out, f)
tot = sum(v["n"] for v in out["cells"].values())
print(f"{tot} plays in {len(out['cells'])} cells, skipped {skipped}")
