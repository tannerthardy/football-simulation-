"""Turning capability, not frequency: how fast do NFL defenders turn when they turn?

Per defender path after the snap (CB/S/LB), using provider o at 10 Hz:
  - max_swing_0.2s: the largest |o change| over any 0.2 s window, binned by speed at window start;
  - turn180_time: for each completed turn of >=150 deg (cumulative same-direction o change),
    the time it took and the entry speed.
Usage: python3 -I yaw_capability_audit.py tracking_week_1.csv [...] > yaw-capability-nfl.json
(players.csv beside the first file is used for positions if present.)
"""
import csv, json, sys
from collections import defaultdict
from pathlib import Path

DEF = {"CB", "SS", "FS", "S", "DB", "ILB", "MLB", "OLB", "LB"}
BINS = [(0, 2), (2, 4), (4, 6), (6, 99)]


def wrap(d):
    return (d + 180) % 360 - 180


def binof(s):
    return next((f"{lo}-{hi}" for lo, hi in BINS if lo <= s < hi), None)


def q(v):
    v = sorted(v)
    pick = lambda p: round(v[min(len(v) - 1, int(p * len(v)))], 1) if v else None
    return {"n": len(v), "p50": pick(.5), "p90": pick(.9), "p99": pick(.99), "max": round(v[-1], 1) if v else None}


def main(paths):
    pos = {}
    players = Path(paths[0]).with_name("players.csv")
    if players.exists():
        for r in csv.DictReader(open(players)):
            pos[r["nflId"]] = r.get("position", "")
    swing = defaultdict(list)
    turns = defaultdict(list)
    for path in paths:
        series = defaultdict(list)
        for r in csv.DictReader(open(path)):
            nid = r.get("nflId")
            if not nid or nid == "NA" or pos.get(nid, "DB") not in DEF:
                continue
            if r.get("frameType") and r["frameType"] != "AFTER_SNAP":
                continue
            try:
                series[(r["gameId"], r["playId"], nid)].append((int(r["frameId"]), float(r["s"]), float(r["o"])))
            except (ValueError, KeyError):
                continue
        for rows in series.values():
            rows.sort()
            best = {}
            for k in range(len(rows) - 2):
                if rows[k + 2][0] != rows[k][0] + 2:
                    continue
                b = binof(rows[k][1])
                if b:
                    best[b] = max(best.get(b, 0), abs(wrap(rows[k + 2][2] - rows[k][2])) / 0.2)
            for b, v in best.items():
                swing[b].append(v)
            # cumulative same-direction turns
            k = 0
            while k < len(rows) - 1:
                start, acc, j = k, 0.0, k
                sign = 0
                while j < len(rows) - 1 and rows[j + 1][0] == rows[j][0] + 1:
                    d = wrap(rows[j + 1][2] - rows[j][2])
                    if abs(d) < 3:
                        if acc == 0:
                            start = j + 1
                        j += 1
                        continue
                    if sign and (d > 0) != (sign > 0):
                        break
                    sign = 1 if d > 0 else -1
                    acc += abs(d)
                    j += 1
                    if acc >= 150:
                        b = binof(rows[start][1])
                        if b:
                            turns[b].append((rows[j][0] - rows[start][0]) / 10)
                        break
                k = max(j, k + 1)
    json.dump({"max_swing_deg_s_per_path": {b: q(v) for b, v in sorted(swing.items())},
               "turn150_seconds_by_entry_speed": {b: q(v) for b, v in sorted(turns.items())}}, sys.stdout, indent=2)


if __name__ == "__main__":
    main(sys.argv[1:])
