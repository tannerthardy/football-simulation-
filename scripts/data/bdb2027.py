#!/usr/bin/env python3
"""Summarize the downloaded BDB 2027 cohort, labels and combine drill coverage.

python3 scripts/data/bdb2027.py <csv-directory> [output-json]
Game trajectories are not analyzed by this summary. It describes availability
and selection, not calibrated engine parameters or official league statistics.
"""

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


def rows(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        yield from csv.DictReader(handle)


def missing(value):
    return value in (None, "", "NA", "NaN")


def count(values):
    return dict(sorted(Counter(values).items(), key=lambda item: (-item[1], item[0])))


def summarize(directory):
    games = list(rows(directory / "games.csv"))
    players = list(rows(directory / "players.csv"))
    combine = list(rows(directory / "combine_results.csv"))
    careers = list(rows(directory / "player_career_successes.csv"))
    player_ids = {row["nfl_id"] for row in players}
    game_ids = {row["game_id"] for row in games}
    season_of = {row["game_id"]: row["season"] for row in games}
    combine_ids = {row["nfl_id"] for row in combine}
    career_ids = {row["nfl_id"] for row in careers}
    continuous_fields = [key for key in combine[0] if key not in ("nfl_id", "draft_year", "combine_position")]

    pp_n = 0
    pp_players = set()
    pp_games = set()
    play_ids = set()
    player_play_ids = set()
    duplicate_rows = 0
    unknown_players = 0
    unknown_games = 0
    lined_up = Counter()
    nullified = Counter()
    pp_seasons = Counter()
    pressure = defaultdict(lambda: {"playerPlayRows": 0, "nonMissingPressureAllowedLabel": 0,
                                    "pressureAllowedTrue": 0})
    for row in rows(directory / "player_play.csv"):
        pp_n += 1
        pp_players.add(row["nfl_id"])
        pp_games.add(row["game_id"])
        play_ids.add((row["game_id"], row["play_id"]))
        identity = (row["game_id"], row["play_id"], row["nfl_id"])
        duplicate_rows += identity in player_play_ids
        player_play_ids.add(identity)
        unknown_players += row["nfl_id"] not in player_ids
        unknown_games += row["game_id"] not in game_ids
        lined_up[row["lined_up_position"]] += 1
        nullified[row["play_nullified_by_penalty"]] += 1
        pp_seasons[season_of.get(row["game_id"], "unknown")] += 1
        bucket = pressure[row["lined_up_position"]]
        bucket["playerPlayRows"] += 1
        bucket["nonMissingPressureAllowedLabel"] += not missing(row["pressure_allowed"])
        bucket["pressureAllowedTrue"] += row["pressure_allowed"].upper() in ("TRUE", "1")

    drill_types = Counter()
    drill_names = Counter()
    entity_types = Counter()
    combine_participants = set()
    combine_events = set()
    combine_n = 0
    for row in rows(directory / "combine_tracking.csv"):
        combine_n += 1
        drill_types[row["drill_type"]] += 1
        drill_names[row["drill_name"]] += 1
        entity_types[row["entity_type"]] += 1
        combine_events.add(row["event_id"])
        if row["entity_type"] == "PLAYER" and not missing(row["nfl_id"]):
            combine_participants.add(row["nfl_id"])

    return {
        "source": "NFL Big Data Bowl 2027",
        "note": "Selected 510-player draft cohort and linked 2023–2025 metadata/labels. Combine tracking was counted; game trajectories were not analyzed here. Role/exposure/season selection must be retained before deriving calibration targets. Career labels are future outcomes and require censoring/leakage controls.",
        "scope": {"gamesMetadata": len(games), "gamesBySeason": count(row["season"] for row in games),
                  "gamesByType": count(row["season_type"] for row in games), "players": len(players),
                  "playersByDraftYear": count(row["draft_year"] for row in players),
                  "nflPositions": count(row["nfl_position"] for row in players),
                  "combinePositions": count(row["combine_position"] for row in combine),
                  "gameTrackingFilesPresent": sorted(path.name for path in directory.glob("game_tracking_*.csv")),
                  "gameTrackingRowsAnalyzed": 0},
        "joins": {"combineRows": len(combine), "careerRows": len(careers),
                  "playersWithoutCombine": len(player_ids - combine_ids),
                  "playersWithoutCareerLabels": len(player_ids - career_ids),
                  "combineIdsOutsidePlayers": len(combine_ids - player_ids),
                  "careerIdsOutsidePlayers": len(career_ids - player_ids)},
        "combine": {"missingByField": {key: sum(missing(row[key]) for row in combine) for key in continuous_fields},
                    "trackingRows": combine_n, "trackingEvents": len(combine_events),
                    "trackedPlayerIds": len(combine_participants),
                    "trackedPlayersOutsideMetadata": len(combine_participants - player_ids),
                    "entityTypes": dict(entity_types), "drillTypesByRow": dict(drill_types),
                    "drillNamesByRow": dict(drill_names)},
        "playerPlay": {"rows": pp_n, "distinctPlayers": len(pp_players), "distinctGames": len(pp_games),
                       "distinctPlays": len(play_ids), "duplicatePlayerPlayRows": duplicate_rows,
                       "rowsWithoutPlayerMetadata": unknown_players, "rowsWithoutGameMetadata": unknown_games,
                       "rowsBySeason": dict(pp_seasons), "linedUpPositions": dict(lined_up),
                       "nullifiedFlagCounts": dict(nullified),
                       "pressureAllowedAvailabilityByLinedUpPosition": dict(pressure)},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", nargs="?", type=Path, default=Path("data/bdb2027-summary.json"))
    args = parser.parse_args()
    summary = summarize(args.directory)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}: {summary['scope']['players']} players, {summary['playerPlay']['rows']} player-play rows")


if __name__ == "__main__":
    main()
