#!/usr/bin/env python3
"""Summarize BDB 2023's 2021 pass/dropback labels, without reading trajectories.

python3 scripts/data/bdb2023.py <csv-directory> [output-json]
All plays are retained, including rows with fouls; these are descriptive label
cohorts, not reconciled official NFL statistics. Block codes stay untranslated.
"""

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


def load(directory, name):
    with (directory / name).open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def valid(value):
    return value not in (None, "", "NA")


def key(row):
    return row["gameId"], row["playId"]


def counts(values):
    return dict(sorted(Counter(values).items(), key=lambda item: (-item[1], item[0])))


def percent(numerator, denominator):
    return round(100 * numerator / denominator, 2) if denominator else None


def summarize(directory):
    games = load(directory, "games.csv")
    plays = load(directory, "plays.csv")
    players = load(directory, "players.csv")
    scouting = load(directory, "pffScoutingData.csv")
    play_keys = {key(row) for row in plays}
    game_ids = {row["gameId"] for row in games}
    player_ids = {row["nflId"] for row in players}
    positions = {row["nflId"]: row["officialPosition"] for row in players}
    by_play = defaultdict(list)
    for row in scouting:
        by_play[key(row)].append(row)

    rush_flags = ("pff_hit", "pff_hurry", "pff_sack")
    allowed_flags = ("pff_hitAllowed", "pff_hurryAllowed", "pff_sackAllowed")
    pressured_keys = {
        play_key for play_key, rows in by_play.items()
        if any(any(row.get(flag) == "1" for flag in rush_flags) for row in rows)
    }
    rush_count_groups = defaultdict(lambda: {"plays": 0, "withRushPressureLabel": 0})
    for play_key in play_keys:
        n = sum(row["pff_role"] == "Pass Rush" for row in by_play[play_key])
        bucket = rush_count_groups[str(n)]
        bucket["plays"] += 1
        bucket["withRushPressureLabel"] += play_key in pressured_keys
    for bucket in rush_count_groups.values():
        bucket["pressureLabelPct"] = percent(bucket["withRushPressureLabel"], bucket["plays"])

    block_rows = [row for row in scouting if valid(row.get("pff_blockType"))]
    block_groups = defaultdict(lambda: {"reps": 0, "withBlockedPlayerId": 0,
                                        "allowedFlagsObserved": 0, "withAllowedPressureLabel": 0,
                                        "beatenFlagObserved": 0, "beaten": 0})
    for row in block_rows:
        bucket = block_groups[row["pff_blockType"]]
        bucket["reps"] += 1
        bucket["withBlockedPlayerId"] += valid(row.get("pff_nflIdBlockedPlayer"))
        observed = all(valid(row.get(flag)) for flag in allowed_flags)
        bucket["allowedFlagsObserved"] += observed
        bucket["withAllowedPressureLabel"] += observed and any(row[flag] == "1" for flag in allowed_flags)
        bucket["beatenFlagObserved"] += valid(row.get("pff_beatenByDefender"))
        bucket["beaten"] += row.get("pff_beatenByDefender") == "1"
    for bucket in block_groups.values():
        bucket["allowedPressureLabelPct"] = percent(bucket["withAllowedPressureLabel"], bucket["allowedFlagsObserved"])
        bucket["beatenPct"] = percent(bucket["beaten"], bucket["beatenFlagObserved"])

    matched = [row for row in scouting if valid(row.get("pff_nflIdBlockedPlayer"))]
    role_of = {(key(row), row["nflId"]): row["pff_role"] for row in scouting}
    valid_matchups = sum((key(row), row["pff_nflIdBlockedPlayer"]) in role_of for row in matched)
    foul_names = [row.get(f"foulName{i}") for row in plays for i in (1, 2, 3)
                  if valid(row.get(f"foulName{i}"))]
    attempts = [row for row in plays if row["passResult"] in ("C", "I", "IN")]
    tracking_files = sorted(path.name for path in directory.glob("week*.csv"))
    return {
        "source": "NFL Big Data Bowl 2023",
        "note": "2021 weeks 1–8, selected pass/dropback plays. All metadata rows retained, including fouls. Pressure means any PFF hit/hurry/sack flag, not geometric proximity. Block codes are untranslated and rates are descriptive, not causal or standalone tuning targets.",
        "scope": {"seasons": counts(row["season"] for row in games),
                  "games": len(games), "gamesByWeek": counts(row["week"] for row in games),
                  "plays": len(plays), "players": len(players), "scoutingRows": len(scouting),
                  "trackingFilesPresent": tracking_files, "trackingRowsAnalyzed": 0},
        "dataQuality": {
            "duplicatePlayKeys": len(plays) - len(play_keys),
            "playsWithoutGameMetadata": sum(row["gameId"] not in game_ids for row in plays),
            "scoutingRowsWithoutPlay": sum(key(row) not in play_keys for row in scouting),
            "scoutingRowsWithoutPlayer": sum(row["nflId"] not in player_ids for row in scouting),
            "duplicatePlayerPlayRows": len(scouting) - len(role_of),
            "scoutingPlayersPerPlay": counts(str(len({row["nflId"] for row in by_play[k]})) for k in play_keys),
            "blockedPlayerReferences": len(matched), "blockedPlayerReferencesFoundInSamePlay": valid_matchups,
        },
        "passingLabels": {"passResults": counts(row["passResult"] for row in plays),
                          "attemptsIncludingFoulRows": len(attempts),
                          "completionPctIncludingFoulRows": percent(sum(row["passResult"] == "C" for row in attempts), len(attempts)),
                          "playActionPlays": sum(row["pff_playAction"] == "1" for row in plays),
                          "playsWithAnyFoul": sum(any(valid(row.get(f"foulName{i}")) for i in (1, 2, 3)) for row in plays),
                          "foulNameCounts": counts(foul_names),
                          "coverageCounts": counts(row["pff_passCoverage"] for row in plays)},
        "scouting": {"roles": counts(row["pff_role"] for row in scouting),
                     "blockTypes": dict(sorted(block_groups.items())),
                     "blockedPlayerRoles": counts(role_of.get((key(row), row["pff_nflIdBlockedPlayer"]), "missing") for row in matched),
                     "blockerPositions": counts(positions.get(row["nflId"], "unknown") for row in block_rows)},
        "pressureLabels": {"playsWithAnyRushHitHurrySack": len(pressured_keys & play_keys),
                           "pctOfAllIncludedPlays": percent(len(pressured_keys & play_keys), len(play_keys)),
                           "byInitialRusherCount": dict(sorted(rush_count_groups.items(), key=lambda item: int(item[0])))},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", type=Path, nargs="?", default=Path("data/bdb2023-summary.json"))
    args = parser.parse_args()
    summary = summarize(args.directory)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}: {summary['scope']['plays']} plays, {summary['scope']['scoutingRows']} scouting rows")


if __name__ == "__main__":
    main()
