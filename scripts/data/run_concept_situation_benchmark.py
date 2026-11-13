#!/usr/bin/env python3
"""Pinned, offline BDB concept/context rushing benchmark; not a scheme ranking.

  python3 -I scripts/data/run_concept_situation_benchmark.py --plan-only PLAN.json
  python3 -I scripts/data/run_concept_situation_benchmark.py --directory BDB_DIR \
      --query-receipt PLAN.json --out REPORT.json --markdown REPORT.md

Only metadata is used. Tracking proxies do not become named defensive fronts.
"""
import argparse
import csv
import gzip
import hashlib
import importlib.util
import json
import math
import platform
import random
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

_SPEC = importlib.util.spec_from_file_location("_bdb_context", Path(__file__).with_name("bdb_run_outcome_context.py"))
BASE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(BASE)
PINS = dict(BASE.PINS, **{
    "games.csv": {"bytes": 7128, "sha256": "166456ed4fa84277f18242defcb523bd45ef20d50486ef55ada71c4b71024477"},
})
THRESHOLDS = (10, 15, 20, 30, 40)
QUERY = {
    "schema": "bdb-concept-situation-rushing-query-v1",
    "inputs": PINS,
    "declarationScope": "A new extension after inspecting the existing descriptive 6223/6103 cohort and metadata field names. This is not an outcome-blind preregistration.",
    "population": "2022 weeks 1-9; exact existing provider-defined selection: non-nullified, non-dropback, no kneel/spike, observed run location and finite main yards. Baseline counts must remain 6223 designed and 6103 non-sneak ordinary runs.",
    "outcomes": "yardsGained main; prePenaltyYardsGained independently summarized. Stuff<=0, negative<0, success4060100 >= .4/.6/1 of positive yardsToGo by down. gainDistanceConversion is a yard threshold, not retained possession or recorded first down. Positive EPA is provider expectedPointsAdded>0, not an independent physical ground truth; the same provider EPA is retained alongside both yards operators, never recomputed from pre-penalty yards.",
    "tails": "Inclusive gain thresholds 10,15,20,30,40; raw rate plus field-eligible rate requires known opponent-goal distance >= threshold. No TD is dropped. Linear pooled-play percentiles; never average cell percentiles.",
    "labels": "Exact primary and raw semicolon secondary labels; token margins overlap and cannot be summed. MAN is not validated Duo, OUTSIDE ZONE is not validated Wide Zone or Toss. SPLIT is a modifier, not verification of slice technique. No named defensive front or box count exists in plays metadata.",
    "contexts": "Down; distance1,2to3,4to6,7to10,11to19,20plus; field0to5,6to10,11to20,21to50,51to80,81to100; offense score trailing9plus/trailing1to8/tied/leading1to8/leading9plus; regulation remaining0to120/121to600/601to1800/1801plus, overtime separately. Home/away identity comes only from games.csv. Exact formations and receiver alignments remain separate from simulator terms.",
    "personnel": "An observed listed-position count from exact offense player_play rows and players roster, requiring 11 distinct joined offense players. This is not a charted personnel package or alignment. Retain QB,RB,FB,TE,WR,OL and other positions; no 11-personnel name is assumed from a count.",
    "motion": "Exact offense player flags; any TRUE is positive; negative only when all 11 offense rows are present and all 11 flags known FALSE. Otherwise unknownOrIncomplete; missing never becomes no motion. For each flag expose known and positive row counts.",
    "tables": "All selected/ordinary/listed RB-FB/QB and sneaks; ordinary exact primary; raw secondary and overlapping tokens; primary-by-context, formation, alignment, listed-position composition, carrier, motion, RPO, coverage. Joint primary/down-distance/field and primary/formation/motion include every observed cell. Table frequencies use the 6103 ordinary-run universe; within-primary frequencies use that exact primary's ordinary count. Neither is league run-call frequency among all snaps. Thin cells retained with play/game/team/carrier exposure, no outcome-driven cell pruning. Neutral early-back witness matches the whole-season definition: listed RB/FB, first/second down, 8-10 to go, outside red zone, offense score within8, before final10 regulation minutes.",
    "uncertainty": "Deterministic game-block percentile bootstrap for ordinary exact-primary groups only: sample whole source games with replacement, 1500 draws seed20221009 shared across concepts. Conditional means/rates recomputed each draw. Report intervals only when n>=100 and >=20 exposed games; retain all groups without an interval if unsupported. One season, nine selected weeks; does not include provider-label error, repeated-player/team dependence between games or unseen seasons. Team margins are observed variation, not independent strength intervals.",
    "sensitivity": "Separate all-run and ordinary carrier cohorts, raw main/pre-penalty operator differences, known penalty field values, positive-sneak flag/primary disagreement, unknown context/labels/motion and exposures. Do not call non-nullified penalty-free.",
    "inference": "Descriptions conditional on observed calls, team mix and game script. No causal scheme superiority, outcome tuning, or direct match of generated simulator rosters is claimed.",
}


def query_digest():
    return hashlib.sha256(json.dumps(QUERY, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def quantile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    lower = int(math.floor(index))
    upper = int(math.ceil(index))
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)


def rate(count, denominator):
    return {"count": int(count), "denominator": int(denominator), "percent": round(100 * count / denominator, 6) if denominator else None}


def boolean(value):
    normalized = str(value).strip().upper()
    return True if normalized in {"TRUE", "1"} else False if normalized in {"FALSE", "0"} else None


def distance_to_goal(row):
    yardline = BASE.number(row.get("yardlineNumber"))
    if yardline is None or not 0 <= yardline <= 50:
        return None
    if yardline == 50:
        return 50.0
    side = row.get("yardlineSide")
    if side == row.get("possessionTeam") and side not in BASE.MISSING:
        return 100 - yardline
    if side == row.get("defensiveTeam") and side not in BASE.MISSING:
        return yardline
    return None


def clock_seconds(value):
    try:
        minute, second = map(int, value.split(":"))
        return minute * 60 + second if 0 <= minute <= 15 and 0 <= second < 60 and not (minute == 15 and second) else None
    except (AttributeError, ValueError):
        return None


def bucket(value, bounds, labels):
    if value is None:
        return "unknown"
    for upper, label in zip(bounds, labels):
        if value <= upper:
            return label
    return labels[-1]


def contexts(row, game):
    down = BASE.number(row.get("down"))
    distance = BASE.number(row.get("yardsToGo"))
    goal = distance_to_goal(row)
    quarter = BASE.number(row.get("quarter"))
    clock = clock_seconds(row.get("gameClock"))
    remaining = (4 - quarter) * 900 + clock if quarter in (1, 2, 3, 4) and clock is not None else None
    home = BASE.number(row.get("preSnapHomeScore"))
    away = BASE.number(row.get("preSnapVisitorScore"))
    offense = row.get("possessionTeam")
    differential = None
    if home is not None and away is not None:
        if offense == game.get("homeTeamAbbr"):
            differential = home - away
        elif offense == game.get("visitorTeamAbbr"):
            differential = away - home
    score = "unknown" if differential is None else "trailing9plus" if differential <= -9 else "trailing1to8" if differential < 0 else "tied" if differential == 0 else "leading1to8" if differential <= 8 else "leading9plus"
    return {
        "down": str(int(down)) if down in (1, 2, 3, 4) else "unknown",
        "distance": "unknown" if distance is None or distance <= 0 else bucket(distance, [1, 3, 6, 10, 19, float("inf")], ["1", "2to3", "4to6", "7to10", "11to19", "20plus"]),
        "field": bucket(goal, [5, 10, 20, 50, 80, 100], ["goal0to5", "goal6to10", "red11to20", "plus21to50", "own51to80", "backed81to100"]),
        "score": score,
        "clock": "overtime" if quarter is not None and quarter > 4 else bucket(remaining, [120, 600, 1800, 3600], ["final0to120", "late121to600", "secondHalf601to1800", "firstHalf1801plus"]),
        "quarter": str(int(quarter)) if quarter in (1, 2, 3, 4, 5) else "unknown",
    }


def player_annotation(offense_rows, all_rushers, positions):
    ids = [row["nflId"] for row in offense_rows]
    complete = len(ids) == 11 and len(set(ids)) == 11 and all(ident in positions and positions[ident] for ident in ids)
    counts = Counter(positions.get(ident) or "unknown" for ident in ids)
    ol = sum(counts[position] for position in ("C", "G", "T"))
    known_positions = {"QB", "RB", "FB", "TE", "WR", "C", "G", "T"}
    personnel = "unknownOrIncomplete" if not complete else "|".join([f"QB={counts['QB']}", f"RB={counts['RB']}", f"FB={counts['FB']}", f"TE={counts['TE']}", f"WR={counts['WR']}", f"OL={ol}", f"other={sum(counts[p] for p in counts if p not in known_positions)}"])
    motion = {}
    for flag in ("inMotionAtBallSnap", "motionSinceLineset", "shiftSinceLineset"):
        values = [boolean(row.get(flag)) for row in offense_rows]
        motion[flag] = {"class": "positive" if any(value is True for value in values) else "negativeAll11Known" if complete and all(value is False for value in values) else "unknownOrIncomplete", "knownRows": sum(value is not None for value in values), "positiveRows": sum(value is True for value in values), "offenseRows": len(values)}
    carrier = "missingRusher" if not all_rushers else "multipleRushers" if len(all_rushers) != 1 else positions.get(all_rushers[0]["nflId"]) or "missingPosition"
    group = "RB_FB" if carrier in ("RB", "FB") else "QB" if carrier == "QB" else "otherOrUnknown"
    lost_values = [BASE.number(row.get("fumbleLost")) for row in offense_rows]
    lost = True if any(value is not None and value > 0 for value in lost_values) else False if complete and all(value is not None for value in lost_values) else None
    return {"listedPersonnel": personnel, "listedPositionCounts": dict(sorted(counts.items())), "offenseRowsComplete": complete,
            "carrierPosition": carrier, "carrierGroup": group, "carrierId": all_rushers[0]["nflId"] if len(all_rushers) == 1 else "unknown",
            "motion": motion, "offenseLostFumble": lost}


def outcome_summary(samples, field):
    known = [(row, BASE.number(row.get(field))) for row in samples]
    known = [(row, value) for row, value in known if value is not None]
    gains = [value for _, value in known]
    success = [(row, value, BASE.number(row.get("down")), BASE.number(row.get("yardsToGo"))) for row, value in known]
    success = [(row, value, down, distance) for row, value, down, distance in success if down in (1, 2, 3, 4) and distance is not None and distance > 0]
    passing = [(row, value >= distance * (.4 if down == 1 else .6 if down == 2 else 1)) for row, value, down, distance in success]
    conversion = [(row, value, BASE.number(row.get("yardsToGo"))) for row, value in known]
    conversion = [(row, value, distance) for row, value, distance in conversion if distance is not None and distance > 0]
    epa = [BASE.number(row.get("expectedPointsAdded")) for row in samples]
    epa = [value for value in epa if value is not None]
    rates = {"stuff": rate(sum(value <= 0 for value in gains), len(gains)),
             "negative": rate(sum(value < 0 for value in gains), len(gains)),
             "zero": rate(sum(value == 0 for value in gains), len(gains)),
             "success4060100": rate(sum(passed for _, passed in passing), len(passing)),
             "successWithoutLostFumble": rate(sum(passed and row["_annotation"]["offenseLostFumble"] is False for row, passed in passing if row["_annotation"]["offenseLostFumble"] is not None), sum(row["_annotation"]["offenseLostFumble"] is not None for row, _ in passing)),
             "gainDistanceConversion": rate(sum(value >= distance for _, value, distance in conversion), len(conversion)),
             "positiveEPA": rate(sum(value > 0 for value in epa), len(epa))}
    for threshold in THRESHOLDS:
        rates[f"explosive{threshold}plus"] = rate(sum(value >= threshold for value in gains), len(gains))
        eligible = [(row, value) for row, value in known if row["_goal"] is not None and row["_goal"] >= threshold]
        rates[f"fieldEligibleExplosive{threshold}plus"] = rate(sum(value >= threshold for _, value in eligible), len(eligible))
    quantiles = {f"p{int(q*100)}": round(quantile(gains, q), 6) if gains else None for q in (.1, .25, .5, .75, .9, .95, .99)}
    top_count = max(1, math.ceil(len(gains) * .05)) if gains else 0
    total = sum(gains)
    top_yards = sum(sorted(gains, reverse=True)[:top_count])
    return {"yards": {"n": len(gains), "missing": len(samples) - len(gains), "mean": round(total / len(gains), 6) if gains else None, **quantiles, "max": max(gains) if gains else None},
            "rates": rates, "tailContribution": {"top5PercentPlayCount": top_count, "top5PercentGainSum": round(top_yards, 6), "allGainSum": round(total, 6), "shareOfNetGain": round(top_yards / total, 6) if total > 0 else None},
            "gainBins": {"negative": sum(v < 0 for v in gains), "zero": sum(v == 0 for v in gains), "1to3": sum(0 < v < 4 for v in gains), "4to6": sum(4 <= v < 7 for v in gains), "7to9": sum(7 <= v < 10 for v in gains), "10to14": sum(10 <= v < 15 for v in gains), "15to19": sum(15 <= v < 20 for v in gains), "20to29": sum(20 <= v < 30 for v in gains), "30to39": sum(30 <= v < 40 for v in gains), "40plus": sum(v >= 40 for v in gains)}}


def aggregate(samples):
    games = Counter(row["gameId"] for row in samples)
    teams = Counter(row["possessionTeam"] for row in samples)
    carriers = Counter(row["_annotation"]["carrierId"] for row in samples)
    paired = [(BASE.number(row.get("yardsGained")), BASE.number(row.get("prePenaltyYardsGained"))) for row in samples]
    paired = [(a, b) for a, b in paired if a is not None and b is not None]
    penalties = [BASE.number(row.get("penaltyYards")) for row in samples]
    support = "thin1to19" if len(samples) < 20 else "limited20to99" if len(samples) < 100 else "descriptive100plus"
    return {"plays": len(samples), "support": support,
            "exposure": {"games": len(games), "teams": len(teams), "knownCarriers": len(set(carriers) - {"unknown"}), "unknownCarrierPlays": carriers.get("unknown", 0),
                         "largestGameShare": round(max(games.values()) / len(samples), 6) if samples else None,
                         "largestTeamShare": round(max(teams.values()) / len(samples), 6) if samples else None},
            "main": outcome_summary(samples, "yardsGained"), "prePenalty": outcome_summary(samples, "prePenaltyYardsGained"),
            "operatorSensitivity": {"bothKnown": len(paired), "different": sum(a != b for a, b in paired), "meanMainMinusPrePenalty": round(sum(a - b for a, b in paired) / len(paired), 6) if paired else None},
            "penaltyField": {"missing": sum(value is None for value in penalties), "zero": sum(value == 0 for value in penalties), "nonzero": sum(value is not None and value != 0 for value in penalties)}}


def primary(row):
    return BASE.primary_label(row)


def label_value(row, field):
    value = row.get(field, "").strip()
    return value if value and value not in BASE.MISSING else "unknown"


def group_samples(samples, key):
    grouped = defaultdict(list)
    for row in samples:
        grouped[key(row)].append(row)
    return dict(sorted(grouped.items()))


def support_summary(table):
    counts = [cell["plays"] for cell in table.values()]
    return {"cells": len(counts), "n1to4": sum(1 <= n <= 4 for n in counts), "n5to19": sum(5 <= n <= 19 for n in counts), "n20to99": sum(20 <= n <= 99 for n in counts), "n100plus": sum(n >= 100 for n in counts)}


def neutral_early_back(row):
    needed = BASE.number(row.get("yardsToGo"))
    return (row["_annotation"]["carrierGroup"] == "RB_FB"
            and row["_context"]["down"] in ("1", "2")
            and needed is not None and 8 <= needed <= 10
            and row["_goal"] is not None and row["_goal"] > 20
            and row["_context"]["score"] in ("trailing1to8", "tied", "leading1to8")
            and row["_context"]["clock"] in ("firstHalf1801plus", "secondHalf601to1800"))


def game_cluster_bootstrap(grouped, game_ids, iterations=1500, seed=20221009):
    rng = random.Random(seed)
    game_ids = sorted(game_ids)
    vector_names = ("n", "sumYards", "stuff", "successKnown", "successYes", "tenPlus", "twentyPlus", "conversionKnown", "conversionYes")
    by_group = {}
    outputs = {}
    for label, samples in grouped.items():
        vectors = defaultdict(lambda: [0.0] * len(vector_names))
        for row in samples:
            gain = BASE.number(row.get("yardsGained"))
            down, needed = BASE.number(row.get("down")), BASE.number(row.get("yardsToGo"))
            v = vectors[row["gameId"]]
            v[0] += 1; v[1] += gain; v[2] += gain <= 0; v[5] += gain >= 10; v[6] += gain >= 20
            if needed is not None and needed > 0:
                v[7] += 1; v[8] += gain >= needed
                if down in (1, 2, 3, 4):
                    v[3] += 1; v[4] += gain >= needed * (.4 if down == 1 else .6 if down == 2 else 1)
        eligible = len(samples) >= 100 and len(vectors) >= 20
        outputs[label] = {"eligible": eligible, "plays": len(samples), "exposedGames": len(vectors), "reason": None if eligible else "requires >=100 plays and >=20 exposed games", "intervals": {}}
        if eligible:
            by_group[label] = {game: vector for game, vector in vectors.items()}
    draws = {label: defaultdict(list) for label in by_group}
    for _ in range(iterations):
        weights = Counter(game_ids[rng.randrange(len(game_ids))] for _ in game_ids)
        for label, vectors in by_group.items():
            total = [0.0] * len(vector_names)
            for game, vector in vectors.items():
                weight = weights.get(game, 0)
                if weight:
                    for i, value in enumerate(vector):
                        total[i] += value * weight
            if total[0]:
                draws[label]["meanYards"].append(total[1] / total[0])
                for metric, numerator, denominator in (("stuff", 2, 0), ("success4060100", 4, 3), ("explosive10plus", 5, 0), ("explosive20plus", 6, 0), ("gainDistanceConversion", 8, 7)):
                    if total[denominator]:
                        draws[label][metric].append(100 * total[numerator] / total[denominator])
    for label, metrics in draws.items():
        outputs[label]["intervals"] = {metric: {"low": round(quantile(values, .025), 6), "high": round(quantile(values, .975), 6), "validDraws": len(values), "units": "yards" if metric == "meanYards" else "percent"} for metric, values in sorted(metrics.items())}
    return {"method": "whole-game block percentile bootstrap, shared game draws across concept margins", "seed": seed, "iterations": iterations, "resampledSourceGames": len(game_ids), "nominalCentralPercent": 95, "limitations": "Conditional one-season/nine-week descriptive uncertainty; not NFL population, latent strength, provider error or independent-team uncertainty. Repeated players/teams across games can remain dependent.", "byOrdinaryExactPrimary": outputs}


def collect(directory, iterations=1500):
    sources = BASE.verify_inputs(directory, PINS)
    metadata = list(BASE.rows(directory / "plays.csv"))
    if len({BASE.play_key(row) for row in metadata}) != len(metadata):
        raise ValueError("Duplicate play key")
    games = {}
    for row in BASE.rows(directory / "games.csv"):
        if row["gameId"] in games:
            raise ValueError("Duplicate gameId")
        games[row["gameId"]] = row
    positions = {}
    for row in BASE.rows(directory / "players.csv"):
        if row["nflId"] in positions:
            raise ValueError("Duplicate roster nflId")
        positions[row["nflId"]] = row.get("position")
    selected, excluded = [], Counter()
    for row in metadata:
        reason = BASE.selection_reason(row)
        if reason:
            excluded[reason] += 1
        else:
            row["_goal"] = distance_to_goal(row)
            row["_context"] = contexts(row, games.get(row["gameId"], {}))
            selected.append(row)
    keys = {BASE.play_key(row): row for row in selected}
    offenses, rushers = defaultdict(list), defaultdict(list)
    player_rows_seen = set()
    for player in BASE.rows(directory / "player_play.csv"):
        key = BASE.play_key(player)
        if key not in keys:
            continue
        identity = key + (player["nflId"],)
        if identity in player_rows_seen:
            raise ValueError("Duplicate selected player/game/play row")
        player_rows_seen.add(identity)
        if player["teamAbbr"] == keys[key]["possessionTeam"]:
            offenses[key].append(player)
        if BASE.truth(player.get("hadRushAttempt")):
            rushers[key].append(player)
    for row in selected:
        key = BASE.play_key(row)
        row["_annotation"] = player_annotation(offenses[key], rushers[key], positions)
    ordinary = [row for row in selected if not BASE.is_sneak(row)]
    if len(selected) != 6223 or len(ordinary) != 6103:
        raise ValueError(f"Existing pinned baseline population changed: {len(selected)}/{len(ordinary)}")
    cohorts = {
        "providerDesigned": selected, "ordinaryNonSneak": ordinary,
        "positiveSneak": [row for row in selected if BASE.is_sneak(row)],
        "ordinaryListedRBFB": [row for row in ordinary if row["_annotation"]["carrierGroup"] == "RB_FB"],
        "ordinaryListedQB": [row for row in ordinary if row["_annotation"]["carrierGroup"] == "QB"],
        "ordinaryBackNeutralEarlyWitness8to10": [row for row in ordinary if neutral_early_back(row)],
    }
    selectors = {
        "byExactPrimary": lambda row: primary(row),
        "byCarrierPosition": lambda row: row["_annotation"]["carrierPosition"],
        "byListedPersonnel": lambda row: row["_annotation"]["listedPersonnel"],
        "byFormation": lambda row: label_value(row, "offenseFormation"),
        "byReceiverAlignment": lambda row: label_value(row, "receiverAlignment"),
        "byRawSecondary": lambda row: BASE.secondary_value(row),
        "byPrimaryRawSecondary": lambda row: primary(row) + "|" + BASE.secondary_value(row),
        "byPrimaryCarrier": lambda row: primary(row) + "|" + row["_annotation"]["carrierGroup"],
        "byPrimaryFormation": lambda row: primary(row) + "|" + label_value(row, "offenseFormation"),
        "byPrimaryReceiverAlignment": lambda row: primary(row) + "|" + label_value(row, "receiverAlignment"),
        "byPrimaryListedPersonnel": lambda row: primary(row) + "|" + row["_annotation"]["listedPersonnel"],
        "byPrimaryRPO": lambda row: primary(row) + "|" + ("positive" if boolean(row.get("pff_runPassOption")) is True else "negative" if boolean(row.get("pff_runPassOption")) is False else "unknown"),
        "byPrimaryCoverage": lambda row: primary(row) + "|" + label_value(row, "pff_passCoverage"),
        "byPrimaryRunLocation": lambda row: primary(row) + "|" + label_value(row, "rushLocationType"),
        "byPrimarySplitToken": lambda row: primary(row) + "|" + ("SPLIT_present" if "SPLIT" in BASE.secondary_tokens(row) else "no_SPLIT_recorded"),
        "jointPrimaryDownDistanceField": lambda row: "|".join([primary(row), row["_context"]["down"], row["_context"]["distance"], row["_context"]["field"]]),
        "jointPrimaryFormationSnapMotion": lambda row: "|".join([primary(row), label_value(row, "offenseFormation"), row["_annotation"]["motion"]["inMotionAtBallSnap"]["class"]]),
        "jointPrimaryScoreClock": lambda row: "|".join([primary(row), row["_context"]["score"], row["_context"]["clock"]]),
        "byPossessionTeam": lambda row: row["possessionTeam"],
        "byPrimaryTeam": lambda row: primary(row) + "|" + row["possessionTeam"],
    }
    for name in ("down", "distance", "field", "score", "clock", "quarter"):
        selectors["by" + name.title()] = lambda row, name=name: row["_context"][name]
        selectors["byPrimary" + name.title()] = lambda row, name=name: primary(row) + "|" + row["_context"][name]
    for name in ("inMotionAtBallSnap", "motionSinceLineset", "shiftSinceLineset"):
        selectors["by" + name[0].upper() + name[1:]] = lambda row, name=name: row["_annotation"]["motion"][name]["class"]
        selectors["byPrimary" + name[0].upper() + name[1:]] = lambda row, name=name: primary(row) + "|" + row["_annotation"]["motion"][name]["class"]
    primary_counts = Counter(primary(row) for row in ordinary)

    def table_cell(samples):
        result = aggregate(samples)
        result["frequencyWithinOrdinaryRuns"] = rate(len(samples), len(ordinary))
        labels = {primary(row) for row in samples}
        if len(labels) == 1:
            label = next(iter(labels))
            result["withinExactPrimary"] = {"label": label, **rate(len(samples), primary_counts[label])}
        return result

    tables = {name: {key: table_cell(rows) for key, rows in group_samples(ordinary, selector).items()} for name, selector in selectors.items()}
    tokens = defaultdict(list)
    primary_tokens = defaultdict(list)
    for row in ordinary:
        for token in BASE.secondary_tokens(row):
            tokens[token].append(row)
            primary_tokens[primary(row) + "|" + token].append(row)
    tables["bySecondaryTokenOverlapping"] = {key: table_cell(rows) for key, rows in sorted(tokens.items())}
    tables["byPrimarySecondaryTokenOverlapping"] = {key: table_cell(rows) for key, rows in sorted(primary_tokens.items())}
    availability = {}
    for filename in PINS:
        with (directory / filename).open(newline="") as stream:
            availability[filename] = next(csv.reader(stream))
    motion_coverage = {name: {"positivePlays": sum(row["_annotation"]["motion"][name]["class"] == "positive" for row in selected), "fullyKnownNegativePlays": sum(row["_annotation"]["motion"][name]["class"] == "negativeAll11Known" for row in selected), "unknownOrIncompletePlays": sum(row["_annotation"]["motion"][name]["class"] == "unknownOrIncomplete" for row in selected), "knownOffensePlayerRows": sum(row["_annotation"]["motion"][name]["knownRows"] for row in selected), "positiveOffensePlayerRows": sum(row["_annotation"]["motion"][name]["positiveRows"] for row in selected)} for name in ("inMotionAtBallSnap", "motionSinceLineset", "shiftSinceLineset")}
    return {
        "schema": "bdb-concept-situation-rushing-benchmark-v1", "querySha256": query_digest(),
        "collectorSha256": BASE.sha256(__file__), "dependencySha256": BASE.sha256(BASE.__file__), "sources": sources,
        "runtime": {"python": platform.python_version(), "dependencies": "Python standard library"},
        "sourceScope": {"seasons": sorted({game["season"] for game in games.values()}), "weeks": sorted({int(game["week"]) for game in games.values()}), "sourceGames": len(games), "metadataPlays": len(metadata), "selectedGames": len({row["gameId"] for row in selected}), "selectedTeams": len({row["possessionTeam"] for row in selected}), "trackingUsed": False},
        "definitions": QUERY,
        "audit": {"baselineDesigned6223": len(selected) == 6223, "baselineOrdinary6103": len(ordinary) == 6103,
                  "exclusions": dict(sorted(excluded.items())), "unknownGoalPlays": sum(row["_goal"] is None for row in selected),
                  "sneakFlagPrimaryDisagreements": sum(BASE.truth(row.get("qbSneak")) != (primary(row) == "SNEAK") for row in selected),
                  "motionFieldCoverageAllDesigned": motion_coverage,
                  "offense11PositionJoinedPlays": sum(row["_annotation"]["offenseRowsComplete"] for row in selected),
                  "boxCountField": None, "namedDefensiveFrontField": None, "chartedPersonnelField": None, "availableFields": availability},
        "cohorts": {name: aggregate(rows) for name, rows in cohorts.items()},
        "ordinaryTables": tables,
        "cellSupport": {name: support_summary(table) for name, table in tables.items()},
        "uncertainty": game_cluster_bootstrap(group_samples(ordinary, primary), set(games), iterations),
    }


def markdown(report):
    lines = ["# Nine-week 2022 concept and situation rushing benchmark", "", "This is a descriptive extension of the pinned BDB2025 reference, not a causal scheme ranking. It retains all 6,223 provider-designed runs and separates 120 positively charted sneaks from 6,103 ordinary non-sneak runs. Ordinary is not RB-only or penalty-free. No engine parameters change.", "", "## Exact primary concepts", "", "Main yards operator; every tail is inclusive. Success is 40/60/100% of positive yards to go. Intervals are a game-block bootstrap conditional on this one-season, nine-week sample.", "", "| Provider primary | n / games / teams | Mean [game-block interval] | Median / p90 / p95 | Stuff | Success | 10+ | 15+ | 20+ | 30+ |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    def percent(cell, key):
        r = cell["main"]["rates"][key]
        return f"{r['count']}/{r['denominator']} ({r['percent']:.2f}%)" if r["percent"] is not None else "unknown"
    table = report["ordinaryTables"]["byExactPrimary"]
    for label, cell in table.items():
        y = cell["main"]["yards"]; exposure = cell["exposure"]
        interval = report["uncertainty"]["byOrdinaryExactPrimary"][label]["intervals"].get("meanYards")
        bounds = f" [{interval['low']:.2f}, {interval['high']:.2f}]" if interval else " [unsupported]"
        lines.append(f"| {label} | {cell['plays']} / {exposure['games']} / {exposure['teams']} | {y['mean']:.2f}{bounds} | {y['p50']:g} / {y['p90']:g} / {y['p95']:g} | " + " | ".join(percent(cell, key) for key in ("stuff", "success4060100", "explosive10plus", "explosive15plus", "explosive20plus", "explosive30plus")) + " |")
    lines += ["", "## Cohorts that should stay separate", "",
              "| Cohort | n | Mean / median | Stuff | Success | 10+ | 20+ |",
              "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for label, cell in report["cohorts"].items():
        y = cell["main"]["yards"]
        lines.append(f"| {label} | {cell['plays']} | {y['mean']:.2f} / {y['p50']:g} | " + " | ".join(percent(cell, key) for key in ("stuff", "success4060100", "explosive10plus", "explosive20plus")) + " |")
    lines += ["", "The neutral early-back witness uses first/second down, 8–10 to go, more than 20 yards to goal, score within eight, and before the final ten regulation minutes. This matches the whole-season witness definition but retains this provider's non-nullified main yards rather than the whole-season clean-penalty operator.", "",
              "## A closer first-down context", "",
              "These ordinary runs have first down, 7–10 to go, and 51–80 yards to the opponent goal. The slice is chosen for relevance to ordinary lab runs, not because it identifies identical rosters, fronts or exact first-and-ten calls. Trap/Draw remain especially thin; their fractions should lead to film checks, not tuning.", "",
              "| Primary in this context | n / games | Mean / median | Stuff | Success | 10+ | 20+ |",
              "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for label in ("INSIDE ZONE", "OUTSIDE ZONE", "MAN", "POWER", "COUNTER", "DRAW", "TRAP"):
        cell = report["ordinaryTables"]["jointPrimaryDownDistanceField"].get(label + "|1|7to10|own51to80")
        if cell:
            y = cell["main"]["yards"]
            lines.append(f"| {label} | {cell['plays']} / {cell['exposure']['games']} | {y['mean']:.2f} / {y['p50']:g} | " + " | ".join(percent(cell, key) for key in ("stuff", "success4060100", "explosive10plus", "explosive20plus")) + " |")
    lines += ["", "## Situation and composition", "", "The JSON retains exact-primary margins for down, distance, field, offensive score differential, regulation clock, quarter, formation, alignment, listed carrier, listed-position composition, motion/shift, RPO, coverage and observed run location. Joint down/distance/field and score/clock cells stay separate; rates from them are usually too thin to become individual targets.", ""]
    for table_name in ("byDown", "byDistance", "byField", "byScore", "byClock", "byFormation"):
        lines += [f"### {table_name[2:]}", "", "| Context (ordinary non-sneak) | n | Mean / median | Stuff | Success | 10+ | 20+ |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
        for label, cell in report["ordinaryTables"][table_name].items():
            y = cell["main"]["yards"]
            lines.append(f"| {label} | {cell['plays']} | {y['mean']:.2f} / {y['p50']:g} | " + " | ".join(percent(cell, key) for key in ("stuff", "success4060100", "explosive10plus", "explosive20plus")) + " |")
        lines += [""]
    lines += ["## Labels, operators and missing data", "", "`MAN` is not established Duo. `OUTSIDE ZONE` does not distinguish our Wide Zone/Toss installations. Exact compound secondary annotations are disjoint raw values; the individual `SPLIT`, `PITCH`, `LEAD`, `READ OPTION` margins overlap. They cannot be summed as mutually exclusive concepts. A split label alone says nothing about the slice player's motion, kick/log read or block quality.", "", "Main `yardsGained` and `prePenaltyYardsGained` are kept independently in every cell; missing penalty yards do not imply no penalty. Provider positive EPA is separate from yard-based success. The yard-conversion operator does not promise possession after a lost fumble. Recorded first-down/TD fields are not present and are not guessed from descriptions.", "", "A short touchdown has limited room for a 20-yard gain. `fieldEligibleExplosive*plus` excludes only starts lacking enough known field, retaining touchdowns and reporting its own denominator. Conditional tails remain selected scheme/team/situation observations.", "", "Motion flags come from exact offense-player rows. An observed TRUE is positive. A negative label requires all 11 offense flags known FALSE; otherwise it is unknown, never no motion. Position-count composition is a roster-label proxy, not a charted personnel package. No box count or named front exists here. Coverage labels are context, not an independent run-fit description.", "", "## Exposure and uncertainty", "", "| Joint table | Cells | n1-4 | n5-19 | n20-99 | n100+ |", "| --- | ---: | ---: | ---: | ---: | ---: |"]
    for name in ("jointPrimaryDownDistanceField", "jointPrimaryFormationSnapMotion", "jointPrimaryScoreClock", "byPrimaryListedPersonnel", "byPrimaryCoverage"):
        s = report["cellSupport"][name]
        lines.append(f"| {name} | {s['cells']} | {s['n1to4']} | {s['n5to19']} | {s['n20to99']} | {s['n100plus']} |")
    lines += ["", "Every cell exposes distinct games, teams and known carriers plus the largest game/team contribution. The central 95% game-block intervals use 1,500 shared deterministic draws, supported only for at least 100 plays and 20 games. They retain both sides of a game together but cannot cover repeated-player/team dependence between games, unobserved seasons or label ambiguity. They are diagnostic intervals rather than a synthetic-roster acceptance band.", "", "## How to use it in the engine", "", "1. Compare an RB/FB non-sneak cohort to RB/FB references with similar down, field and score/clock composition; keep QB/sneak roles separate. Preserve concept, formation, generated roster and defensive call frequencies before comparing means.", "2. Inspect the full distribution: median, stuffs, success and tails together. A low median plus excessive 20+/30+ frequency suggests specific breakaway failures; a correct mean can hide both too many stuffs and too many explosives. Show top-five-percent yard contribution as an additional diagnostic.", "3. Treat Inside Zone and Outside Zone labels as broad observational guards. Verify visible aiming point, front assignment, contact, combo transfer and support/pursuit cues before blaming a difference on physics. Keep Wide Zone/Toss and Duo as simulator-specific groups until a defensible external label mapping exists.", "4. Separate physics stress tests from outcome benchmarks: mirrored support/load/momentum and repeatable sustained-contact behavior validate physical coherence. Scheme-specific outcomes require controller/assignment/vision evidence; never repair an apparent concept advantage with a hidden force multiplier.", "5. Use the detailed primary-plus-situation cells to choose film witnesses and uncertainty checks, not to force every cell to a precise target. Larger whole-season PBP references own multi-season context, while this packet owns exact provider scheme/modifier labels.", "", "## Mechanism hypotheses to test, not conclusions from these yards", "", "- Zone: first-step angle and leverage, whether a covered partner can retain the down defender before the uncovered blocker climbs, RB press/read/cut timing, and backside fit pursuit. The paired zone rates can motivate these tests but do not identify which one caused an outcome.", "- Power/Counter/Pull Lead: down-block feasibility, puller interception speed/base, kick versus log read, wrap arrival and penetration timing. Diagnose whether higher tails came from roster/call selection, free defenders, broken tackles or correct lanes before altering a physical capability.", "- Trap/Draw: keep their smaller exposure visible; defensive pass/run recognition and willingness to rush upfield are likely controller levers. Do not infer a universal strength or explosive bonus from a high small-sample mean.", "- Split/Read Option/Pitch: isolate modifier-positive film and preserve compound labels. Slice support and motion momentum, option cue ownership, edge conflict and runner timing are meaningful tests, while overlapping annotations cannot be treated as extra independent plays.", "", "## Reproduction", "", "```sh", "python3 -I scripts/data/run_concept_situation_benchmark.py --plan-only out/rushing-benchmark/concepts/query-plan.json", "python3 -I scripts/data/run_concept_situation_benchmark.py --directory /workspace/review-aids/bdb2025/big-data-bowl-data --query-receipt out/rushing-benchmark/concepts/query-plan.json --out out/rushing-benchmark/concepts/report.json.gz --markdown out/rushing-benchmark/concepts/README.md", "python3 -m unittest discover -s test -p test_run_concept_situation_benchmark.py", "```", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan-only", type=Path)
    parser.add_argument("--directory", type=Path)
    parser.add_argument("--query-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--markdown", type=Path)
    args = parser.parse_args()
    if args.plan_only:
        args.plan_only.parent.mkdir(parents=True, exist_ok=True)
        args.plan_only.write_text(json.dumps({"query": QUERY, "querySha256": query_digest(), "collectorSha256": BASE.sha256(__file__), "dependencySha256": BASE.sha256(BASE.__file__), "declaredAt": datetime.now(timezone.utc).isoformat()}, indent=2) + "\n")
        return
    if not args.directory or not args.query_receipt or not args.out:
        parser.error("--directory, --query-receipt and --out are required")
    receipt = json.loads(args.query_receipt.read_text())
    if receipt.get("query") != QUERY or receipt.get("querySha256") != query_digest() or receipt.get("collectorSha256") != BASE.sha256(__file__) or receipt.get("dependencySha256") != BASE.sha256(BASE.__file__):
        raise ValueError("Collector/dependency/query differ from the frozen plan")
    declared = datetime.fromisoformat(receipt["declaredAt"])
    if declared.tzinfo is None or declared > datetime.now(timezone.utc):
        raise ValueError("Receipt must contain a past timezone-aware timestamp")
    report = collect(args.directory)
    BASE.verify_inputs(args.directory, PINS)
    if receipt["collectorSha256"] != BASE.sha256(__file__) or receipt["dependencySha256"] != BASE.sha256(BASE.__file__):
        raise ValueError("Collector or dependency changed during collection")
    report["sourcePinsVerifiedBeforeAndAfter"] = True
    report["queryDeclaredAt"] = receipt["declaredAt"]
    report["collectedAt"] = datetime.now(timezone.utc).isoformat()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(report, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode()
    if args.out.suffix == ".gz":
        args.out.write_bytes(gzip.compress(payload, mtime=0))
    else:
        args.out.write_bytes(payload)
    if args.markdown:
        args.markdown.write_text(markdown(report))
    print(json.dumps({"out": str(args.out), "bytes": args.out.stat().st_size, "designed": report["cohorts"]["providerDesigned"]["plays"], "ordinary": report["cohorts"]["ordinaryNonSneak"]["plays"], "querySha256": report["querySha256"], "sourcePinsVerified": True}, sort_keys=True))


if __name__ == "__main__":
    main()
