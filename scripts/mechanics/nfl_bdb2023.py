#!/usr/bin/env python3
"""Convert Big Data Bowl 2023 tracking (2021 season, weeks 1-8, dropbacks only)
into the common play format and measure it with the shared metrics.

    python3 -I scripts/mechanics/nfl_bdb2023.py [--weeks 1 2 ...] \
        [--plays-out out/mechanics/nfl2021-plays.jsonl.gz] \
        [--out data/reviews/mechanics/nfl-bdb2021-pass.json]

A second season for the pass-protection, pass-rush and route metrics. Tracking
stops shortly after the throw, so nothing after the catch is measured here.
Block pairs come from PFF's pff_nflIdBlockedPlayer.
Input: data/raw/bdb2023 (python3 -I scripts/data/fetch_nfl_data.py bdb2023-2021).
"""
import argparse
import csv
import gzip
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import DEFINITIONS, Collector  # noqa: E402
from nfl_bdb2025 import GROUP, WIDTH  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/bdb2023"
SNAP = {"ball_snap", "autoevent_ballsnap"}
THROW = {"pass_forward", "autoevent_passforward"}
END = {"qb_sack", "qb_strip_sack"}


def read_csv(name):
    with open(DATA / name, newline="") as handle:
        yield from csv.DictReader(handle)


def load_meta():
    position = {r["nflId"]: r["officialPosition"] for r in read_csv("players.csv")}
    plays = {}
    for r in read_csv("plays.csv"):
        if r["passResult"] not in ("C", "I", "S", "IN", "R"):
            continue
        try:
            yards = float(r["playResult"])
        except ValueError:
            continue
        plays[(r["gameId"], r["playId"])] = {"yards": yards, "offense": r["possessionTeam"],
                                             "coverage": r["pff_passCoverage"], "blocks": []}
    for r in read_csv("pffScoutingData.csv"):
        meta = plays.get((r["gameId"], r["playId"]))
        if meta and r["pff_role"] == "Pass Block" and r["pff_nflIdBlockedPlayer"] not in ("NA", ""):
            meta["blocks"].append((r["nflId"], r["pff_nflIdBlockedPlayer"]))
    return position, plays


def convert(key, rows, meta, position):
    direction = rows[0][7]
    tracks, ball, events = {}, {}, {}
    for r in rows:
        frame = int(r[3])
        x, y = float(r[8]), float(r[9])
        if direction == "left":
            x, y = 120 - x, WIDTH - y
        if r[6] == "football":
            ball[frame] = (x, y)
        else:
            tracks.setdefault(r[2], (r[6], {}))[1][frame] = (x, y)
        if r[15] not in ("None", "NA"):
            events.setdefault(r[15], frame)
    snaps = [f for name, f in events.items() if name in SNAP]
    if not snaps or len(tracks) < 22:
        return None
    snap = min(snaps)
    if snap not in ball:
        return None
    los, ball_y = ball[snap]
    last = max(f for _, frames in tracks.values() for f in frames)
    ids = sorted(tracks, key=lambda i: (tracks[i][0] != meta["offense"], i))
    players = []
    for i in ids:
        group = GROUP.get(position.get(i, ""))
        if group is None:
            return None
        players.append({"side": "O" if tracks[i][0] == meta["offense"] else "D", "group": group})
    xy, carry = [], {}
    for f in range(snap, last + 1):
        row = []
        for i in ids:
            point = tracks[i][1].get(f, carry.get(i))
            if point is None:
                return None
            carry[i] = point
            row += [round(point[0] - los, 2), round(point[1], 2)]
        xy.append(row)
    ev = {}
    throws = [f for name, f in events.items() if name in THROW and f >= snap]
    if throws:
        ev["pass_forward"] = round((min(throws) - snap) / 10, 2)
    ends = [f for name, f in events.items() if name in END and f >= snap]
    ev["end"] = round(((min(ends) if ends else last) - snap) / 10, 2)
    return {"id": f"{key[0]}-{key[1]}", "source": "nfl-bdb2023", "kind": "pass", "yards": meta["yards"],
            "players": players, "dt": 0.1, "xy": xy, "ball_y": round(ball_y, 2), "events": ev,
            "carrier": None, "target": None,
            "blocks": [[ids.index(b), ids.index(d)] for b, d in meta["blocks"] if b in ids and d in ids],
            "cell": {"concept": None, "coverage": meta["coverage"]}}


def stream(weeks, plays):
    for week in weeks:
        print(f"week {week}", file=sys.stderr)
        with open(DATA / f"week{week}.csv", newline="") as handle:
            reader = csv.reader(handle)
            next(reader)
            key, rows = None, []
            for r in reader:
                k = (r[0], r[1])
                if k != key:
                    if key in plays and rows:
                        yield key, rows
                    key, rows = k, []
                if k in plays:
                    rows.append(r)
            if key in plays and rows:
                yield key, rows


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--weeks", type=int, nargs="+", default=list(range(1, 9)))
    parser.add_argument("--plays-out", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "data/reviews/mechanics/nfl-bdb2021-pass.json")
    args = parser.parse_args()
    if not DATA.is_dir():
        print("Missing data/raw/bdb2023; run python3 -I scripts/data/fetch_nfl_data.py bdb2023-2021", file=sys.stderr)
        return 2
    position, plays = load_meta()
    collector, skipped, seen = Collector(), 0, set()
    if args.plays_out:
        args.plays_out.parent.mkdir(parents=True, exist_ok=True)
    sink = gzip.open(args.plays_out, "wt") if args.plays_out else None
    for key, rows in stream(args.weeks, plays):
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        play = convert(key, rows, plays[key], position)
        if play is None:
            skipped += 1
            continue
        collector.add(play)
        if sink:
            sink.write(json.dumps(play, separators=(",", ":")) + "\n")
    if sink:
        sink.close()
    summary = {"source": "Big Data Bowl 2023: 2021 regular season weeks " + ",".join(map(str, args.weeks)) + " (dropbacks, tracking to just after the throw)",
               "provenance": {"archive": "nfl-big-data-bowl-2023.zip",
                              "archiveSha256": "129ad4fc656919ffb13fcc6f7670d15040add6c60a655e5dd9aa269e1aea72b3",
                              "commands": ["npm run nfl:fetch -- bdb2023-2021",
                                           "python3 -I scripts/mechanics/nfl_bdb2023.py"],
                              "note": "Aggregates only. Pass metrics before and at the throw; no catch or after-catch data."},
               "skippedPlays": skipped, **collector.summary(), "definitions": DEFINITIONS}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=1) + "\n")
    print(f"{summary['plays']} plays measured, {skipped} skipped -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
