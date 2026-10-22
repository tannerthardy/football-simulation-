#!/usr/bin/env python3
"""Every player at the snap, with the scheme that put him there (2022 season,
Big Data Bowl 2025, weeks 1-9). One row per player per play: x is yards past
the line of scrimmage (the ball at the snap), y across the field, offense
attacking +x; joined with the play (down, distance, yards to goal, formation,
receiver alignment, run concept, coverage, man/zone, dropback) and the player
(position, route, coverage assignment, motion at the snap). Observation only.

    python3 -I scripts/diag/align/nfl_snapframe.py [--weeks 1 2 ...] [--out out/align/nfl-snap.csv.gz]
"""
import argparse
import csv
import gzip
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data/raw/bdb2025/big-data-bowl-data"
WIDTH = 160 / 3
PLAY = ["down", "yardsToGo", "absoluteYardlineNumber", "offenseFormation", "receiverAlignment", "pff_runConceptPrimary",
        "pff_passCoverage", "pff_manZone", "isDropback", "playAction", "possessionTeam", "defensiveTeam", "quarter"]
PLAYER = ["routeRan", "wasRunningRoute", "pff_defensiveCoverageAssignment", "inMotionAtBallSnap", "wasInitialPassRusher"]


def rows(name):
    with open(DATA / name, newline="") as handle:
        yield from csv.DictReader(handle)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, nargs="*", default=list(range(1, 10)))
    ap.add_argument("--out", type=Path, default=ROOT / "out/align/nfl-snap.csv.gz")
    args = ap.parse_args()
    position = {r["nflId"]: r["position"] for r in rows("players.csv")}
    plays = {}
    for r in rows("plays.csv"):
        if r["playNullifiedByPenalty"] == "Y" or r["qbSpike"] in ("1", "TRUE") or r["qbKneel"] in ("1", "TRUE"):
            continue
        plays[(r["gameId"], r["playId"])] = r
    player = {(r["gameId"], r["playId"], r["nflId"]): r for r in rows("player_play.csv")}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(args.out, "wt", newline="") as out:
        w = csv.writer(out)
        w.writerow(["gameId", "playId", "nflId", "side", "position", "x", "y", "ball_y"] + PLAY + PLAYER)
        for week in args.weeks:
            print(f"week {week}", file=sys.stderr)
            frame = {}
            with open(DATA / f"tracking_week_{week}.csv", newline="") as handle:
                for line in handle:
                    if '"SNAP"' not in line:
                        continue
                    r = next(csv.reader([line]))
                    frame.setdefault((r[0], r[1]), []).append(r)
            for key, rs in frame.items():
                p = plays.get(key)
                if p is None:
                    continue
                ball = [r for r in rs if r[2] == "NA"]
                if not ball:
                    continue
                flip = rs[0][9] == "left"
                norm = lambda r: (120 - float(r[10]), WIDTH - float(r[11])) if flip else (float(r[10]), float(r[11]))
                los, by = norm(ball[0])
                for r in rs:
                    if r[2] == "NA":
                        continue
                    x, y = norm(r)
                    pp = player.get((key[0], key[1], r[2]), {})
                    side = "O" if r[8] == p["possessionTeam"] else "D"
                    w.writerow([key[0], key[1], r[2], side, position.get(r[2], ""), round(x - los, 2), round(y, 2), round(by, 2)]
                               + [p[k] for k in PLAY] + [pp.get(k, "") for k in PLAYER])


if __name__ == "__main__":
    main()
