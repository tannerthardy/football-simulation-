"""NFL quarterback drop depth over time on dropbacks, under center vs.
shotgun/pistol (Big Data Bowl 2025 tracking weeks present). Depth is yards
behind the line of scrimmage at 0.0-2.0 s after the snap. Aggregates only.

  python3 -I scripts/data/bdb2025_qbdrop.py <bdb2025 dir> <out.json>
"""
import csv
import glob
import json
import statistics
import sys
from collections import defaultdict

D, OUT = sys.argv[1], sys.argv[2]
pos = {}
with open(f"{D}/players.csv", newline="") as f:
    for r in csv.DictReader(f):
        pos[r["nflId"]] = r["position"]
plays = {}
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["isDropback"] != "TRUE" or r["playNullifiedByPenalty"] == "Y" or r["playAction"] == "TRUE":
            continue
        form = r["offenseFormation"]
        if form in ("SHOTGUN", "PISTOL", "EMPTY"):
            align = "gun"
        elif form in ("I_FORM", "SINGLEBACK", "JUMBO"):
            align = "under"
        else:
            continue
        plays[(r["gameId"], r["playId"])] = {"team": r["possessionTeam"], "los": float(r["absoluteYardlineNumber"]), "align": align}

snap = {}
qbx = defaultdict(dict)
direction = {}
for path in sorted(glob.glob(f"{D}/tracking_week_*.csv")):
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            k = (r["gameId"], r["playId"])
            p = plays.get(k)
            if p is None:
                continue
            fid = int(r["frameId"])
            if r["event"] == "ball_snap":
                snap[k] = fid
            if r["nflId"] != "NA" and r["club"] == p["team"] and pos.get(r["nflId"]) == "QB":
                qbx[k][fid] = float(r["x"])
                direction[k] = r["playDirection"]

depth = {"under": defaultdict(list), "gun": defaultdict(list)}
for k, xs in qbx.items():
    if k not in snap:
        continue
    p = plays[k]
    s = snap[k]
    sign = 1 if direction[k] == "right" else -1
    for t10 in range(0, 21, 5):
        fid = s + t10
        if fid in xs:
            depth[p["align"]][t10 / 10].append(round((p["los"] - xs[fid]) * sign, 2))

out = {"source": "Big Data Bowl 2025 tracking (weeks present), non-play-action dropbacks"}
for a, by in depth.items():
    out[a] = {str(t): {"n": len(v), "median": statistics.median(v), "p25": sorted(v)[len(v) // 4], "p75": sorted(v)[3 * len(v) // 4]} for t, v in sorted(by.items()) if v}
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps(out, indent=1))
