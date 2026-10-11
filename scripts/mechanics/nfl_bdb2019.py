#!/usr/bin/env python3
"""Convert Big Data Bowl 2019 tracking (2017 season, weeks 1-6, 91 games, all
22 players) into the common play format and measure it with the shared code.

    python3 -I scripts/mechanics/nfl_bdb2019.py [--plays-out out/mechanics/nfl2017-plays.jsonl.gz] \
        [--out data/reviews/mechanics/nfl-bdb2017.json]

A second season for the run, contact and movement metrics. This data has no
per-player labels, so the ball carrier (after a handoff) and the pass target are
inferred: the offensive player nearest the ball 0.3 s after the handoff, and
nearest the ball when the pass arrives. Designed runs are plays with a handoff
and no pass; dropbacks are plays with a pass or a sack.
Input: data/raw/bdb2019/Data (python3 -I scripts/data/fetch_nfl_data.py bdb2019-2017).
"""
import argparse
import csv
import gzip
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import DEFINITIONS, Collector  # noqa: E402
from nfl_bdb2025 import END_EVENTS, GROUP, WIDTH  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/bdb2019/Data"
POSITION = {**GROUP, "OT": "OL", "OG": "OL", "ILB": "LB", "MLB": "LB", "OLB": "LB", "SAF": "DB", "S": "DB"}
KEEP = {"handoff", "pass_forward", "pass_arrived", "first_contact", "pass_outcome_caught", "qb_sack"}


def read_csv(path):
    with open(path, newline="") as handle:
        yield from csv.DictReader(handle)


def load_meta():
    position = {r["nflId"]: r["PositionAbbr"] for r in read_csv(DATA / "players.csv")}
    games = {r["gameId"]: r for r in read_csv(DATA / "games.csv")}
    plays = {}
    for r in read_csv(DATA / "plays.csv"):
        if r["isSTPlay"] == "TRUE" or r["isPenalty"] == "TRUE":
            continue
        try:
            yards = float(r["PlayResult"])
        except ValueError:
            continue
        game = games.get(r["gameId"])
        if not game:
            continue
        side = "home" if r["possessionTeam"] == game["homeTeamAbbr"] else "away"
        plays[(r["gameId"], r["playId"])] = {"yards": yards, "offense": side, "result": r["PassResult"],
                                             "description": r["playDescription"].lower()}
    return position, plays


def convert(key, rows, meta, position):
    tracks, ball, events = {}, {}, {}
    for r in rows:
        frame = int(r["frame.id"])
        if r["x"] == "NA" or r["y"] == "NA":
            continue  # a missing sample; the frame is carried forward below
        point = (float(r["x"]), float(r["y"]))
        if r["team"] == "ball":
            ball[frame] = point
        else:
            tracks.setdefault(r["nflId"], (r["team"], {}))[1][frame] = point
        if r["event"] not in ("NA", ""):
            events.setdefault(r["event"], frame)
    if "ball_snap" not in events or len(tracks) != 22:
        return None
    snap = events["ball_snap"]
    if snap not in ball:
        return None
    if "kneel" in meta["description"] or "spike" in meta["description"]:
        return None
    if "pass_forward" in events or "pass_shovel" in events or "qb_sack" in events:
        kind = "pass"
    elif "handoff" in events and meta["result"] in ("NA", ""):
        kind = "run"
    else:
        return None
    offense = [i for i, (team, _) in tracks.items() if team == meta["offense"]]
    if len(offense) != 11 or any(snap not in tracks[i][1] for i in tracks):
        return None
    bx, by = ball[snap]
    left = sum(tracks[i][1][snap][0] for i in offense) / 11 > bx  # offense behind the ball when moving right

    def norm(point):
        x, y = point
        return (round(bx - x, 2), round(WIDTH - y, 2)) if left else (round(x - bx, 2), round(y, 2))

    ids = sorted(tracks, key=lambda i: (tracks[i][0] != meta["offense"], i))
    players = []
    for i in ids:
        group = POSITION.get(position.get(i, ""))
        if group is None:
            return None
        players.append({"side": "O" if tracks[i][0] == meta["offense"] else "D", "group": group})
    last = max(f for _, frames in tracks.values() for f in frames)
    xy, carry = [], {}
    for f in range(snap, last + 1):
        row = []
        for i in ids:
            point = tracks[i][1].get(f, carry.get(i))
            if point is None:
                return None
            carry[i] = point
            row += list(norm(point))
        xy.append(row)

    def nearest_to_ball(frame):
        if frame not in ball:
            return None
        bxf, byf = ball[frame]
        return min(range(11), key=lambda j: math.dist(tracks[ids[j]][1].get(frame, (1e9, 1e9)), (bxf, byf)))

    ev = {name: round((frame - snap) / 10, 2) for name, frame in events.items() if name in KEEP and frame >= snap}
    if "pass_shovel" in events and "pass_forward" not in ev:
        ev["pass_forward"] = round((events["pass_shovel"] - snap) / 10, 2)
    if "pass_outcome_caught" in ev:
        ev["catch"] = ev.pop("pass_outcome_caught")
    ends = [frame for name, frame in events.items() if name in END_EVENTS and frame >= snap]
    ev["end"] = round(((min(ends) if ends else last) - snap) / 10, 2)
    carrier = target = None
    if kind == "run":
        carrier = nearest_to_ball(events["handoff"] + 3)
    elif "pass_arrived" in events:
        target = nearest_to_ball(events["pass_arrived"])
    return {"id": f"{key[0]}-{key[1]}", "source": "nfl-bdb2019", "kind": kind, "yards": meta["yards"],
            "players": players, "dt": 0.1, "xy": xy, "ball_y": norm((bx, by))[1], "events": ev,
            "carrier": carrier, "target": target, "cell": {"concept": None, "coverage": None}}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--plays-out", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "data/reviews/mechanics/nfl-bdb2017.json")
    args = parser.parse_args()
    if not DATA.is_dir():
        print("Missing data/raw/bdb2019/Data; run python3 -I scripts/data/fetch_nfl_data.py bdb2019-2017", file=sys.stderr)
        return 2
    position, plays = load_meta()
    collector, skipped = Collector(), 0
    if args.plays_out:
        args.plays_out.parent.mkdir(parents=True, exist_ok=True)
    sink = gzip.open(args.plays_out, "wt") if args.plays_out else None
    files = sorted(DATA.glob("tracking_gameId_*.csv"))
    for n, path in enumerate(files, 1):
        by_play = defaultdict(list)
        for r in read_csv(path):
            by_play[(r["gameId"], r["playId"])].append(r)
        for key, rows in by_play.items():
            if key not in plays:
                continue
            play = convert(key, rows, plays[key], position)
            if play is None:
                skipped += 1
                continue
            collector.add(play)
            if sink:
                sink.write(json.dumps(play, separators=(",", ":")) + "\n")
        if n % 10 == 0:
            print(f"{n}/{len(files)} games", file=sys.stderr)
    if sink:
        sink.close()
    summary = {"source": "Big Data Bowl 2019: 2017 regular season weeks 1-6, 91 games (all 22 players; carrier and target inferred)",
               "provenance": {"archive": "Big-Data-Bowl-master.zip",
                              "archiveSha256": "see data/sources.json (bdb2019-2017)",
                              "commands": ["npm run nfl:fetch -- bdb2019-2017", "python3 -I scripts/mechanics/nfl_bdb2019.py"],
                              "note": "Aggregates only. No per-player labels: carrier/target are the offensive player nearest the ball."},
               "skippedPlays": skipped, **collector.summary(), "definitions": DEFINITIONS}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=1) + "\n")
    print(f"{summary['plays']} plays measured, {skipped} skipped -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
