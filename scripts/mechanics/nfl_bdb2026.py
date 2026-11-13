#!/usr/bin/env python3
"""Convert Big Data Bowl 2026 (2023 season, 18 weeks) into the common play
format for the ball-in-air metrics, and measure it with the shared code.

    python3 -I scripts/mechanics/nfl_bdb2026.py [--weeks 1 2 ...] \
        [--out data/reviews/mechanics/nfl-bdb2023-air.json]

Each play has the passer, route runners and coverage defenders up to the throw
("input"), then only the targeted receiver and the defenders the competition
chose to predict until the ball lands ("output"). Untracked players are left
empty after the throw, so these plays feed only the air.* metrics: a third
season for separation at the throw and how much defenders close in flight.
Input: data/raw/bdb2026 (python3 -I scripts/data/fetch_nfl_data.py bdb2026-2023).
"""
import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import DEFINITIONS, Collector  # noqa: E402
from nfl_bdb2025 import GROUP, WIDTH  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/raw/bdb2026/114239_nfl_competition_files_published_analytics_final"


def week_plays(week):
    inputs, outputs, meta = defaultdict(dict), defaultdict(dict), {}
    with open(DATA / f"train/input_2023_w{week:02d}.csv", newline="") as handle:
        for r in csv.DictReader(handle):
            key = (r["game_id"], r["play_id"])
            meta.setdefault(key, {"direction": r["play_direction"], "los": float(r["absolute_yardline_number"]),
                                  "players": {}, "target": None})
            meta[key]["players"][r["nfl_id"]] = (r["player_side"], r["player_position"])
            if r["player_role"] == "Targeted Receiver":
                meta[key]["target"] = r["nfl_id"]
            inputs[key].setdefault(r["nfl_id"], {})[int(r["frame_id"])] = (float(r["x"]), float(r["y"]))
    with open(DATA / f"train/output_2023_w{week:02d}.csv", newline="") as handle:
        for r in csv.DictReader(handle):
            key = (r["game_id"], r["play_id"])
            outputs[key].setdefault(r["nfl_id"], {})[int(r["frame_id"])] = (float(r["x"]), float(r["y"]))
    for key, m in meta.items():
        yield key, m, inputs[key], outputs.get(key, {})


def convert(key, m, before, after, coverage):
    if m["target"] is None or m["target"] not in after:
        return None
    left = m["direction"] == "left"

    def norm(point):
        x, y = point
        return (round(m["los"] - x, 2), round(WIDTH - y, 2)) if left else (round(x - m["los"], 2), round(y, 2))

    ids = sorted(m["players"], key=lambda i: (m["players"][i][0] != "Offense", i))
    players = []
    for i in ids:
        group = GROUP.get(m["players"][i][1])
        if group is None:
            return None
        players.append({"side": "O" if m["players"][i][0] == "Offense" else "D", "group": group})
    n_in = max(max(frames) for frames in before.values())
    n_out = max(max(frames) for frames in after.values())
    xy = []
    for f in range(1, n_in + 1):
        row = []
        for i in ids:
            point = before.get(i, {}).get(f)
            row += list(norm(point)) if point else [None, None]
        xy.append(row)
    for f in range(1, n_out + 1):
        row = []
        for i in ids:
            point = after.get(i, {}).get(f)
            row += list(norm(point)) if point else [None, None]
        xy.append(row)
    passer = next((j for j, i in enumerate(ids) if m["players"][i][1] == "QB"), 0)
    throw = round((n_in - 1) / 10, 2)
    return {"id": f"{key[0]}-{key[1]}", "source": "nfl-bdb2026", "kind": "air", "yards": None,
            "players": players, "dt": 0.1, "xy": xy, "ball_y": xy[0][2 * passer + 1],
            "events": {"pass_forward": throw, "pass_arrived": round(throw + n_out / 10, 2), "end": round(throw + n_out / 10, 2)},
            "carrier": None, "target": ids.index(m["target"]), "cell": {"concept": None, "coverage": coverage}}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--weeks", type=int, nargs="+", default=list(range(1, 19)))
    parser.add_argument("--out", type=Path, default=ROOT / "data/reviews/mechanics/nfl-bdb2023-air.json")
    args = parser.parse_args()
    if not DATA.is_dir():
        print("Missing data/raw/bdb2026; run python3 -I scripts/data/fetch_nfl_data.py bdb2026-2023", file=sys.stderr)
        return 2
    coverage = {}
    with open(DATA / "supplementary_data.csv", newline="") as handle:
        for r in csv.DictReader(handle):
            coverage[(r["game_id"], r["play_id"])] = r["team_coverage_type"]
    collector, skipped = Collector(), 0
    for week in args.weeks:
        print(f"week {week}", file=sys.stderr)
        for key, m, before, after in week_plays(week):
            play = convert(key, m, before, after, coverage.get(key))
            if play is None:
                skipped += 1
                continue
            collector.add(play)
    summary = {"source": "Big Data Bowl 2026: 2023 regular season weeks " + ",".join(map(str, args.weeks)) + " (ball in the air, selected players)",
               "provenance": {"archive": "nfl-big-data-bowl-2026-analytics.zip",
                              "archiveSha256": "360a32614d528e69220cacb39f6beddc580bfd2b9818c22194f1c3c394ccc1a1",
                              "commands": ["npm run nfl:fetch -- bdb2026-2023", "python3 -I scripts/mechanics/nfl_bdb2026.py"],
                              "note": "Aggregates only. After the throw only the target and selected defenders are tracked."},
               "skippedPlays": skipped, **collector.summary(), "definitions": DEFINITIONS}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(summary, indent=1) + "\n")
    print(f"{summary['plays']} plays measured, {skipped} skipped -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
