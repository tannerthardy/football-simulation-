#!/usr/bin/env python3
"""Convert Big Data Bowl 2025 tracking (2022 season, weeks 1-9, all 22 players)
into the common play format and measure it with the shared metrics.

    python3 -I scripts/mechanics/nfl_bdb2025.py [--weeks 1 2 ...] \
        [--plays-out out/mechanics/nfl-plays.jsonl.gz] \
        [--out data/reviews/mechanics/nfl-bdb2022.json]

Input: data/raw/bdb2025/big-data-bowl-data (python3 -I scripts/data/fetch_nfl_data.py).
Only the aggregate summary is meant for Git; --plays-out keeps the converted
plays in ignored out/ so later questions do not need to re-read 8 GB of CSV.
"""
import argparse
import csv
import gzip
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import DEFINITIONS, Collector  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/bdb2025/big-data-bowl-data"
GROUP = {"QB": "QB", "RB": "RB", "FB": "RB", "WR": "WR", "TE": "TE", "T": "OL", "G": "OL", "C": "OL",
         "DE": "DL", "DT": "DL", "NT": "DL", "OLB": "LB", "ILB": "LB", "MLB": "LB", "LB": "LB",
         "CB": "DB", "SS": "DB", "FS": "DB", "DB": "DB"}
END_EVENTS = {"tackle", "out_of_bounds", "touchdown", "qb_sack", "qb_strip_sack", "pass_outcome_incomplete",
              "pass_outcome_interception", "qb_slide", "safety"}
KEEP_EVENTS = {"handoff", "pass_forward", "pass_arrived", "first_contact", "pass_outcome_caught"}
WIDTH = 160 / 3


def read_csv(name):
    with open(DATA / name, newline="") as handle:
        yield from csv.DictReader(handle)


def load_meta():
    position = {r["nflId"]: r["position"] for r in read_csv("players.csv")}
    plays = {}
    for r in read_csv("plays.csv"):
        if r["playNullifiedByPenalty"] == "Y" or r["qbSpike"] in ("1", "TRUE") or r["qbKneel"] in ("1", "TRUE"):
            continue
        try:
            yards = float(r["yardsGained"])
        except ValueError:
            continue
        if r["isDropback"] == "TRUE":
            kind = "pass"
        elif r["rushLocationType"] not in ("NA", ""):
            kind = "run"
        else:
            continue
        plays[(r["gameId"], r["playId"])] = {"kind": kind, "yards": yards, "offense": r["possessionTeam"],
                                             "week": None, "concept": r["pff_runConceptPrimary"],
                                             "coverage": r["pff_passCoverage"], "carrier": None, "target": None,
                                             "blocks": []}
    for r in read_csv("player_play.csv"):
        meta = plays.get((r["gameId"], r["playId"]))
        if meta is None:
            continue
        if r["hadRushAttempt"] == "1":
            meta["carrier"] = r["nflId"]
        if r["wasTargettedReceiver"] == "1":
            meta["target"] = r["nflId"]
        for column in ("blockedPlayerNFLId1", "blockedPlayerNFLId2", "blockedPlayerNFLId3"):
            if r[column] not in ("NA", ""):
                meta["blocks"].append((r["nflId"], r[column]))
    return position, plays


def convert(key, rows, meta, position):
    """rows: tracking rows (lists) for one play, after the snap."""
    gid, pid = key
    snap = None
    direction = rows[0][9]
    tracks, events, ball, orient = {}, {}, {}, {}
    for r in rows:
        frame = int(r[4])
        if r[5] == "SNAP":
            snap = frame
        x, y = float(r[10]), float(r[11])
        if direction == "left":
            x, y = 120 - x, WIDTH - y
        if r[2] == "NA":
            ball[frame] = (x, y)
        else:
            tracks.setdefault(r[2], (r[8], {}))[1][frame] = (x, y)
            # Orientation (NGS 'o': 0 deg = +y, clockwise) as a math angle in the normalized frame, degrees.
            if r[15] not in ("", "NA"):
                a = 90.0 - float(r[15]) + (180.0 if direction == "left" else 0.0)
                orient.setdefault(r[2], {})[frame] = round((a + 180.0) % 360.0 - 180.0, 1)
        if r[17] != "NA":
            events.setdefault(r[17], frame)
    if snap is None or snap not in ball or len(tracks) < 22:
        return None
    los, ball_y = ball[snap]
    last = max(f for _, frames in tracks.values() for f in frames)
    ids = sorted(tracks, key=lambda i: (tracks[i][0] != meta["offense"], i))
    players = []
    for i in ids:
        group = GROUP.get(position.get(i, ""), None)
        if group is None:
            return None
        players.append({"side": "O" if tracks[i][0] == meta["offense"] else "D", "group": group,
                        "id": i, "pos": position.get(i, "")})
    xy, carry, ori, ocarry = [], {}, [], {}
    for f in range(snap, last + 1):
        row, orow = [], []
        for i in ids:
            point = tracks[i][1].get(f, carry.get(i))
            if point is None:
                return None
            carry[i] = point
            row += [round(point[0] - los, 2), round(point[1], 2)]
            o = orient.get(i, {}).get(f, ocarry.get(i))
            ocarry[i] = o
            orow.append(o)
        xy.append(row)
        ori.append(orow)
    ev = {name: round((frame - snap) / 10, 2) for name, frame in events.items() if name in KEEP_EVENTS and frame >= snap}
    if "pass_outcome_caught" in ev:
        ev["catch"] = ev.pop("pass_outcome_caught")
    ends = [frame for name, frame in events.items() if name in END_EVENTS and frame >= snap]
    ev["end"] = round(((min(ends) if ends else last) - snap) / 10, 2)
    return {"id": f"{gid}-{pid}", "source": "nfl-bdb2025", "kind": meta["kind"], "yards": meta["yards"],
            "players": players, "dt": 0.1, "xy": xy, "o": ori, "ball_y": round(ball_y, 2), "events": ev,
            "carrier": ids.index(meta["carrier"]) if meta["carrier"] in ids else None,
            "target": ids.index(meta["target"]) if meta["target"] in ids else None,
            "blocks": [[ids.index(b), ids.index(d)] for b, d in meta["blocks"] if b in ids and d in ids],
            "cell": {"concept": meta["concept"], "coverage": meta["coverage"]}}


def stream(weeks, plays, position):
    for week in weeks:
        path = DATA / f"tracking_week_{week}.csv"
        print(f"week {week}: {path.name}", file=sys.stderr)
        with open(path, newline="") as handle:
            reader = csv.reader(handle)
            next(reader)
            key, rows = None, []
            for r in reader:
                k = (r[0], r[1])
                if k != key:
                    if key in plays and rows:
                        yield key, rows
                    key, rows = k, []
                if r[5] != "BEFORE_SNAP" and k in plays:
                    rows.append(r)
            if key in plays and rows:
                yield key, rows


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--weeks", type=int, nargs="+", default=list(range(1, 10)))
    parser.add_argument("--plays-out", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "data/reviews/mechanics/nfl-bdb2022.json")
    args = parser.parse_args()
    if not DATA.is_dir():
        print(f"Missing {DATA.relative_to(ROOT)}; run python3 -I scripts/data/fetch_nfl_data.py bdb2025-2022", file=sys.stderr)
        return 2
    position, plays = load_meta()
    collector, skipped, seen = Collector(), 0, set()
    if args.plays_out:
        args.plays_out.parent.mkdir(parents=True, exist_ok=True)
    sink = gzip.open(args.plays_out, "wt") if args.plays_out else None
    for key, rows in stream(args.weeks, plays, position):
        if key in seen:
            skipped += 1  # a play split across non-contiguous rows; keep the first
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
    summary = {"source": "Big Data Bowl 2025: 2022 regular season weeks " + ",".join(map(str, args.weeks)) + " (all 22 players)",
               "provenance": {"archive": "archive.zip (Big Data Bowl 2025)",
                              "archiveSha256": "743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3",
                              "commands": ["npm run nfl:fetch -- bdb2025-2022",
                                           "npm run mech:nfl -- --out data/reviews/mechanics/nfl-bdb2022.json"],
                              "note": "Aggregates only. Raw tracking stays in ignored data/raw/; competition terms apply to the raw data."},
               "skippedPlays": skipped, **collector.summary(), "definitions": DEFINITIONS}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=1) + "\n")
    print(f"{summary['plays']} plays measured, {skipped} skipped -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
