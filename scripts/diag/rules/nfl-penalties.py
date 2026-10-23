#!/usr/bin/env python3
"""NFL regular-season penalty context from existing nflverse CSV.gz files.

No downloads or simulations. Raw files stay outside the repository. Each PBP
row's penalty_type can describe only one call; parse plural descriptions and
retain declined, offsetting and unresolved dispositions separately. This is a
description-derived count, not an audited replacement for official box scores.
"""
import argparse
import collections
import csv
import gzip
import hashlib
import json
import pathlib
import re

CALL = re.compile(r"\bPENALTY\s+(?:on\s+)?([A-Z]{2,3})(?:-[^,]+)?,\s*([^,]+?)(?:,|\.)", re.I)


def calls(row):
    """Classify only represented calls; never turn an ambiguous row into a flag."""
    text = row.get("desc", "")
    matches = list(CALL.finditer(text))
    for i, match in enumerate(matches):
        tail = text[match.end():matches[i + 1].start() if i + 1 < len(matches) else len(text)]
        if re.search(r"\bdeclined\b", tail, re.I):
            status = "declined"
        elif re.search(r"\boffset(?:ting)?\b", tail, re.I):
            status = "offsetting"
        elif row.get("penalty") == "1":
            status = "accepted"
        else:
            status = "unresolved"
        yield {"team": match[1], "type": match[2].strip(), "status": status}


def measure(path):
    counts = {k: collections.Counter() for k in ("accepted", "declined", "offsetting", "unresolved")}
    sanctions = collections.Counter()
    source_types = collections.defaultdict(collections.Counter)
    snap_possession_team = collections.Counter()
    games, excluded, multi = set(), [], 0
    accepted_rows = 0
    with gzip.open(path, "rt", newline="") as stream:
        for row in csv.DictReader(stream):
            if row["season_type"] != "REG":
                continue
            games.add(row["game_id"])
            accepted_rows += row["penalty"] == "1"
            parsed = list(calls(row))
            multi += len(parsed) > 1
            for call in parsed:
                # A removal can accompany an underlying foul; it is not another
                # foul merely because the PBP description gives it an entry.
                if call["type"] == "Disqualification":
                    sanctions[call["status"]] += 1
                else:
                    counts[call["status"]][call["type"]] += 1
                    if call["status"] == "accepted":
                        source_types[row.get("play_type_nfl") or "unknown"][call["type"]] += 1
                        if call["team"] == row.get("posteam"):
                            snap_possession_team[call["type"]] += 1
            if row["penalty"] == "1" and not any(c["status"] == "accepted" for c in parsed):
                excluded.append({"game_id": row["game_id"], "play_id": row["play_id"],
                                 "reason": "accepted-penalty row without an unambiguous accepted description",
                                 "description": row["desc"]})
    team_games = 2 * len(games)
    return {"path": str(path.resolve()), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "games": len(games), "team_games": team_games,
            "accepted_penalty_rows": accepted_rows,
            "accepted_penalty_rows_per_team_game": accepted_rows / team_games,
            "multiple_call_rows": multi, "counts": {k: dict(sorted(v.items())) for k, v in counts.items()},
            "disqualification_entries": dict(sanctions),
            "accepted_by_source_play_type": {k: dict(v) for k, v in sorted(source_types.items())},
            "accepted_against_snap_possession_team": dict(snap_possession_team),
            "accepted_described_fouls_per_team_game": sum(counts["accepted"].values()) / team_games,
            "excluded_accepted_rows": excluded,
            "limitations": ["Description-derived calls; not an official box-score reconciliation",
                            "Disqualification entries are reported separately, not counted again as fouls",
                            "No inference of uncalled violations or referee accuracy",
                            "All phases included; native special-teams exposure is not equivalent",
                            "Snap-possession team is not always the ball-possessing team after a kick/turnover",
                            "PENALTY/UNSPECIFIED source play types do not prove the underlying run/pass/kick phase",
                            "NFL season is separate from the simulator's NFL-2026 rules edition"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbp", type=pathlib.Path, nargs="+")
    parser.add_argument("--out", type=pathlib.Path, required=True)
    args = parser.parse_args()
    result = {"measurement": "nfl-penalty-descriptions-v1", "seasons": [measure(p) for p in args.pbp]}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    for season in result["seasons"]:
        print(json.dumps({k: season[k] for k in ["path", "games", "team_games", "accepted_penalty_rows",
                                               "accepted_described_fouls_per_team_game"]}))
