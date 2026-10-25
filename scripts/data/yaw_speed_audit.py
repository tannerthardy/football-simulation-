"""Yaw rate vs speed and facing-vs-travel at speed, for defenders after the snap.

Answers TKL-4's open question (SS "on ice", film G1-P002): can an NFL defender
swing his body orientation ~100 deg in 0.2 s while still carrying 4+ yd/s, and
how often does he move at speed with orientation 60-120 / >=120 deg off travel?

Usage (needs raw Big Data Bowl 2025 tracking, any subset of weeks):
  python3 -I yaw_speed_audit.py data/raw/kaggle/nfl-big-data-bowl-2025/tracking_week_1.csv [more weeks...] > yaw-nfl.json
Columns used: gameId, playId, nflId, frameId, frameType (or event), s, o, dir, club, plus players.csv position
if found beside the tracking file. Writes a small JSON summary to stdout; no raw rows.
"""
import csv, json, math, sys
from collections import defaultdict
from pathlib import Path

DEF = {"CB", "SS", "FS", "S", "DB", "ILB", "MLB", "OLB", "LB"}
SPEED_BINS = [(1, 2), (2, 4), (4, 6), (6, 99)]


def wrap(d):
    return (d + 180) % 360 - 180


def main(paths):
    pos = {}
    players = Path(paths[0]).with_name("players.csv")
    if players.exists():
        for r in csv.DictReader(open(players)):
            pos[r["nflId"]] = r.get("position", "")
    yaw = defaultdict(list)      # speed bin -> |do/dt| deg/s
    off = defaultdict(lambda: [0, 0, 0])  # speed bin -> aligned, oblique, opposed
    big_swing = defaultdict(lambda: [0, 0])  # speed bin -> [0.2 s windows, windows with |do| >= 90]
    for path in paths:
        series = defaultdict(list)
        for r in csv.DictReader(open(path)):
            nid = r.get("nflId")
            if not nid or nid == "NA" or pos.get(nid, "DB") not in DEF:
                continue
            ft = r.get("frameType")
            if ft and ft != "AFTER_SNAP":
                continue
            try:
                s, o, d = float(r["s"]), float(r["o"]), float(r["dir"])
            except (ValueError, KeyError):
                continue
            series[(r["gameId"], r["playId"], nid)].append((int(r["frameId"]), s, o, d))
        for rows in series.values():
            rows.sort()
            for k in range(len(rows)):
                f, s, o, d = rows[k]
                b = next((i for i, (lo, hi) in enumerate(SPEED_BINS) if lo <= s < hi), None)
                if b is None:
                    continue
                a = abs(wrap(o - d))
                off[b][0 if a < 60 else 1 if a < 120 else 2] += 1
                if k + 1 < len(rows) and rows[k + 1][0] == f + 1:
                    yaw[b].append(abs(wrap(rows[k + 1][2] - o)) * 10)
                if k + 2 < len(rows) and rows[k + 2][0] == f + 2:
                    big_swing[b][0] += 1
                    if abs(wrap(rows[k + 2][2] - o)) >= 90:
                        big_swing[b][1] += 1

    def q(v, p):
        v = sorted(v)
        return round(v[min(len(v) - 1, int(p * len(v)))], 1) if v else None

    out = {}
    for i, (lo, hi) in enumerate(SPEED_BINS):
        n = sum(off[i])
        out[f"{lo}-{hi} yd/s"] = {
            "frames": n,
            "yaw_deg_s": {"p50": q(yaw[i], .5), "p90": q(yaw[i], .9), "p99": q(yaw[i], .99)},
            "o_vs_dir_share": {"aligned<60": round(off[i][0] / n, 3) if n else None,
                               "oblique60-120": round(off[i][1] / n, 3) if n else None,
                               "opposed>=120": round(off[i][2] / n, 3) if n else None},
            "swing>=90deg_in_0.2s": round(big_swing[i][1] / big_swing[i][0], 4) if big_swing[i][0] else None,
        }
    json.dump(out, sys.stdout, indent=2)


if __name__ == "__main__":
    main(sys.argv[1:])
