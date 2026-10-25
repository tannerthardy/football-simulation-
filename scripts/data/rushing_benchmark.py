#!/usr/bin/env python3
"""Pinned, offline NFL rushing benchmarks with explicit populations and exposure.

Declare the query before collection. Inputs are additive raw-dir/manifest pairs;
no download, simulator fitting, or inference of a called front occurs here.
Only the Python standard library is required.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import platform
import random
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HELPER_PATH = ROOT / "scripts/data/run_outcome_context.py"
spec = importlib.util.spec_from_file_location("rushing_benchmark_operators", HELPER_PATH)
operators = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operators)
reference = operators.reference
THRESHOLDS = (10, 15, 20, 30, 40)
BASE_METRICS = {
    "negative": ("negative", "gainKnown"), "zero": ("zero", "gainKnown"),
    "stuff": ("stuff", "gainKnown"), "success4060100": ("success4060100", "successKnown"),
    "success4560100": ("success4560100", "successKnown"),
    "successWithoutLostFumble": ("successWithoutLostFumble", "successTurnoverKnown"),
    "gainDistanceConversion": ("gainDistanceConversion", "successKnown"),
    "gainDistanceWithoutLostFumble": ("gainDistanceWithoutLostFumble", "successTurnoverKnown"),
    "recordedFirstOrTD": ("recordedFirstOrTD", "recordedFirstOrTDKnown"),
    "positiveEPA": ("positiveEPA", "epaKnown"), "fumbleLost": ("fumbleLost", "fumbleLostKnown"),
    "touchdown": ("touchdown", "touchdownKnown"), "goalCensoredTD": ("goalCensoredTD", "goalCensorKnown"),
}
METRICS = {**BASE_METRICS,
           **{f"explosive{x}plus": (f"explosive{x}plus", "gainKnown") for x in THRESHOLDS},
           **{f"fieldEligibleExplosive{x}plus": (f"fieldEligibleExplosive{x}", f"fieldEligible{x}") for x in THRESHOLDS}}
BOOT_METRICS = ("stuff", "success4060100", "positiveEPA", "gainDistanceConversion",
                "explosive10plus", "explosive20plus", "fieldEligibleExplosive20plus", "fumbleLost")
MARGINS = ("down", "distance", "field", "score", "clock", "carrier", "shotgun", "noHuddle",
           "runLocation", "runGap", "goalToGo")
CELL_FIELDS = ("kind", "carrier", "down", "distance", "field")
SCORE_FIELDS = ("kind", "carrier", "score", "clock")
QUERY = {
    "schema": "rushing-benchmark-query-v1",
    "selection": "REG live pass/run rows; exclude kneels, spikes and two-point attempts. Designed runs exclude observed dropbacks and scrambles; scrambles require qb_dropback/pass_attempt classification plus qb_scramble=true and rush_attempt=true. Failed QB escapes recorded as sacks are not successful scrambles. This is realized action, not hidden designed-call intent.",
    "outcome": "Primary clean outcome requires penalty=false AND finite whole-play yards_gained. Keep all live flagged/missing-penalty populations and missing gains in audit. No-play penalties excluded by live selection remain audited separately, not silently counted as successful runs. No accepted/enforced-penalty reconstruction. Individual rushing_yards audited separately from whole-play gain.",
    "yardSuccess": "Chosen yard-based40/60/100 rule: gain >=40% ydstogo on first,60% on second,100% third/fourth; only valid down1-4 and positive finite distance. Not a universalNFL standard; include45/60/100 sensitivity. Preserve yard-only success on turnovers; successWithoutLostFumble separately needs known fumble_lost=false. PositiveEPA uses finite provider nflfastR expected-points-model EPA, distinct from yard success and immediate conversion.",
    "conversion": "Separate gain>=ydstogo; gain>=ydstogo without known lost fumble; recorded first_down_rush OR rush_touchdown with both flags known. No missing flag becomes false.",
    "distribution": "Whole-play gain; interpolated p10/25/50/75/90/95/99, max; bins negative,zero,positiveUnder4,4toUnder7,7toUnder10,10toUnder15,15toUnder20,20toUnder30,30toUnder40,40plus. Stuff<=0 differs from negative<0. Each tail's share of net gained yards and positive gained yards is a separate composition diagnostic, not an event rate. Report excess beyond threshold and upper-capped mean10/20 preserving losses, not truncated/excluded-tail mean.",
    "tails": "Separate10/15/20/30/40+ all-clean-gain frequencies. Field-eligible rates require valid yardline_100>=threshold; excluded short fields and unknown fields counted. TD at goal is a geometrically censored endpoint, not evidence the run could/could not continue. No invented latent yardage; retain short-field TDs.",
    "carrier": "Exact season roster gsis_id + listed position: RB_FB/QB/other/unknown. Conflicts remain unknown, no name matching. Position is not snap role. Sneak only positive/negative available FTN is_qb_sneak chart; missing charting unavailable, not false.",
    "situations": "Joint down×distance×field per carrier/run-kind and per season. Distance1/2to3/4to6/7to10/11to19/20plus; fieldgoalLine1to5/redZone6to20/plus21to50/own51to89/backedUp90to100. ScorelargeTrailing17plus/trailing9to16/trailing1to8/tied/leading1to8/leading9to16/largeLeading17plus; clockearlyRegulation/last10to2min/final2min/overtime; margins and score×clock, not giant all-variable cross.",
    "chart": "Exact game/play join to available FTN, with per-season missingness. Known positive integer1-11 box<=5/6/7/8plus; observed zero labelledzeroUnverified separately, not inferred zero defenders/lightbox. Actual number of offense backfield players (not11/12personnel), qb_location, starting_hash, motionbeforeORatsnap,RPO,trick,sneak. No charted blocking concept or named defensive front inferred. FTN and derived charted aggregates attributed CC-BY-SA-4.0.",
    "cohorts": "Declared ordinaryRB_FB: designed run,RB/FB,down1/2,distance8-10,outside20,scorewithin8,regulationbeforelast600s. Also allRB_FB, shortYardageLateDown (down3/4,1-2), goalLine (field1-5), third20plus, final2minLeading9plus, positivechartedSneak, and scramble. These are observational selected jobs, not causal treatment effects.",
    "bootstrap": "Season-stratified GAME-cluster percentile bootstrap, identical shared deterministic draws across strata. Sample each season's full live-game universe with replacement, retaining both teams and all selected plays from a sampled game; cells absent in a sampled game contribute zero. 95% percentile intervals require each metric's own denominator and games-with-known-denominator to meet declared exposure minima. Does not make games across repeated teams independent or give synthetic-roster tolerance bands. Under10 observed events flaggedrare; zero-event [0,0] only describes resampling observed games, not proofzero-risk or an unseen-event upper bound.",
    "variation": "Observed team-season and defense-team-season distributions retain gain and game exposure; do not confuse their across-team spread with uncertainty, isolated talent, causal scheme effect or generated-roster hardlimits.",
    "standardization": "Reference2022/23 versus holdout2024/25 common weights within kind×carrier×down×distance×field cells with >=30 clean gains per period; score leading9plus versus trailing9plus within season×kind×carrier×down×distance×field×clock with >=20 clean gains per group. Metric-specific denominators required and common weighting uses their summed denominators. Report excluded mass; common-support descriptive comparison, no causal score/box effect.",
    "fallback": "Lookup never averages thin exact rows: exact >=100 gains/>=20games else broaden by removing field, then distance, then down, retaining kind/carrier. A broader supported row is context-broader reference and reports discarded dimensions; no invented tiny-cell target. If none qualify return unavailable.",
    "limitations": "PBP cannot identify blocking force, grip, footing, contact timing, called front, inside/outside zone, gap exchange, particular run technique or causal counterfactual. Final outcome mismatches nominate film/first-transition diagnosis, not automatic strength or traction tuning. EPA is model-derived and engine adapter need not fabricate it.",
}


def sha256(path):
    return operators.sha256(path)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def receipt(seasons, replicates, seed, minimum_gains, minimum_games):
    query = {**QUERY, "seasons": seasons, "bootstrapReplicates": replicates, "bootstrapSeed": seed,
             "minimumBootstrapGains": minimum_gains, "minimumBootstrapGames": minimum_games}
    return {"query": query, "querySha256": digest(query), "collectorSha256": sha256(Path(__file__)),
            "operatorSha256": sha256(HELPER_PATH), "referenceHelperSha256": sha256(operators.HELPER_PATH),
            "contextHelperSha256": sha256(operators.CONTEXT_PATH)}


def verify_inputs(input_dirs, manifests, seasons):
    if len(input_dirs) != len(manifests):
        raise ValueError("Supply one manifest for each input directory")
    found, provenance = {}, []
    for folder, manifest in zip(input_dirs, manifests):
        entries = json.loads(manifest.read_text())["files"]
        provenance.append({"manifest": str(manifest), "sha256": sha256(manifest), "inputDir": str(folder)})
        for entry in entries:
            name = entry["name"]
            relevant = any(name in (f"play_by_play_{year}.csv.gz", f"roster_{year}.csv", f"roster_{year}.csv.gz", f"ftn_charting_{year}.csv", f"ftn_charting_{year}.csv.gz") for year in seasons)
            if not relevant:
                continue
            path = folder / name
            if path.stat().st_size != entry["bytes"] or sha256(path) != entry["sha256"]:
                raise ValueError(f"Input does not match acquisition pin: {path}")
            if name in found:
                raise ValueError(f"Ambiguous duplicated input filename: {name}")
            found[name] = (path, {**entry, "verifiedSizeAndSha256": True})
    inputs = {}
    for year in seasons:
        def choose(prefix, optional=False):
            candidates = [found[name] for name in (f"{prefix}_{year}.csv", f"{prefix}_{year}.csv.gz") if name in found]
            if len(candidates) != 1 and not (optional and not candidates):
                raise ValueError(f"Need exactly one pinned {prefix} file for {year}")
            return candidates[0] if candidates else None
        inputs[year] = {"pbp": choose("play_by_play"), "roster": choose("roster"), "chart": choose("ftn_charting", True)}
    return inputs, provenance


def gain_bin(gain):
    if gain < 0:
        return "negative"
    if gain == 0:
        return "zero"
    for threshold, label in ((4, "positiveUnder4"), (7, "4toUnder7"), (10, "7toUnder10"), (15, "10toUnder15"), (20, "15toUnder20"), (30, "20toUnder30"), (40, "30toUnder40")):
        if gain < threshold:
            return label
    return "40plus"


def context(row, carrier):
    n = reference.number
    d, field, score, qtr, seconds = (n(row.get(key)) for key in ("ydstogo", "yardline_100", "score_differential", "qtr", "game_seconds_remaining"))
    down = n(row.get("down"))
    distance = "unknown" if d is None or d <= 0 else "1" if d == 1 else "2to3" if d <= 3 else "4to6" if d <= 6 else "7to10" if d <= 10 else "11to19" if d < 20 else "20plus"
    field_bin = "unknown" if field is None or not 0 < field <= 100 else "goalLine1to5" if field <= 5 else "redZone6to20" if field <= 20 else "plus21to50" if field <= 50 else "own51to89" if field < 90 else "backedUp90to100"
    score_bin = "unknown" if score is None else "largeTrailing17plus" if score <= -17 else "trailing9to16" if score <= -9 else "trailing1to8" if score < 0 else "tied" if score == 0 else "leading1to8" if score < 9 else "leading9to16" if score < 17 else "largeLeading17plus"
    clock = "overtime" if qtr is not None and qtr >= 5 else "unknown" if qtr not in (1, 2, 3, 4) or seconds is None or not 0 <= seconds <= 3600 else "final2min" if seconds <= 120 else "last10to2min" if seconds <= 600 else "earlyRegulation"
    def boolean(key):
        value = reference.flag(row.get(key))
        return "true" if value is True else "false" if value is False else "unknown"
    return {"season": int(n(row.get("season")) or 0), "kind": operators.run_kind(row), "carrier": carrier,
            "down": int(down) if down in (1, 2, 3, 4) else "unknown", "distance": distance, "field": field_bin,
            "score": score_bin, "clock": clock, "shotgun": boolean("shotgun"), "noHuddle": boolean("no_huddle"),
            "goalToGo": boolean("goal_to_go"), "runLocation": row.get("run_location", "").strip() or "unknown",
            "runGap": row.get("run_gap", "").strip() or "unknown"}


def chart_context(chart):
    if chart is None:
        return {key: "unavailable" for key in ("box", "offenseBackfieldCount", "qbLocation", "hash", "motion", "rpo", "trick", "sneak")}
    count = reference.number(chart.get("n_offense_backfield"))
    box_count = reference.number(chart.get("n_defense_box"))
    result = {"box": "zeroUnverified" if box_count == 0 else operators.box_label(chart), "offenseBackfieldCount": int(count) if count is not None and count == int(count) and 0 <= count <= 11 else "unknown",
              "qbLocation": chart.get("qb_location", "").strip() or "unknown", "hash": chart.get("starting_hash", "").strip() or "unknown"}
    for key, field in (("motion", "is_motion"), ("rpo", "is_rpo"), ("trick", "is_trick_play"), ("sneak", "is_qb_sneak")):
        flag = reference.flag(chart.get(field))
        result[key] = "true" if flag is True else "false" if flag is False else "unknown"
    return result


def observation(row):
    """One clean outcome's sufficient counts. Missing never becomes zero/false."""
    counts = Counter(observedRuns=1)
    penalty = reference.flag(row.get("penalty"))
    counts["penaltyFlagFalse" if penalty is False else "penaltyFlagTrue" if penalty is True else "penaltyFlagMissing"] += 1
    if penalty is not False:
        return counts, None, None
    gain = reference.number(row.get("yards_gained"))
    if gain is None:
        counts["missingGain"] += 1
        return counts, None, None
    counts["gainKnown"] += 1
    counts["gainBin_" + gain_bin(gain)] += 1
    for key, truth in (("negative", gain < 0), ("zero", gain == 0), ("stuff", gain <= 0)):
        counts[key] += int(truth)
    down, distance = reference.number(row.get("down")), reference.number(row.get("ydstogo"))
    fumble = reference.flag(row.get("fumble_lost"))
    if fumble is not None:
        counts["fumbleLostKnown"] += 1
        counts["fumbleLost"] += int(fumble)
    if down in (1, 2, 3, 4) and distance is not None and distance > 0:
        success = gain >= distance * (.4 if down == 1 else .6 if down == 2 else 1)
        conversion = gain >= distance
        counts["successKnown"] += 1
        counts["success4060100"] += int(success)
        counts["success4560100"] += int(gain >= distance * (.45 if down == 1 else .6 if down == 2 else 1))
        counts["gainDistanceConversion"] += int(conversion)
        if fumble is not None:
            counts["successTurnoverKnown"] += 1
            counts["successWithoutLostFumble"] += int(success and not fumble)
            counts["gainDistanceWithoutLostFumble"] += int(conversion and not fumble)
    first, td = reference.flag(row.get("first_down_rush")), reference.flag(row.get("rush_touchdown"))
    if first is not None and td is not None:
        counts["recordedFirstOrTDKnown"] += 1
        counts["recordedFirstOrTD"] += int(first or td)
    if td is not None:
        counts["touchdownKnown"] += 1
        counts["touchdown"] += int(td)
    epa = reference.number(row.get("epa"))
    if epa is not None:
        counts["epaKnown"] += 1
        counts["positiveEPA"] += int(epa > 0)
    field = reference.number(row.get("yardline_100"))
    valid_field = field is not None and 0 <= field <= 100
    counts["fieldKnown" if valid_field else "fieldMissingOrInvalid"] += 1
    if valid_field and td is not None:
        counts["goalCensorKnown"] += 1
        counts["goalCensoredTD"] += int(td and gain >= field)
    if valid_field and gain > field:
        counts["gainExceedsDistanceToGoal"] += 1
    for threshold in THRESHOLDS:
        counts[f"explosive{threshold}plus"] += int(gain >= threshold)
        if valid_field:
            counts[f"fieldEligible{threshold}" if field >= threshold else f"fieldIneligible{threshold}"] += 1
            if field >= threshold:
                counts[f"fieldEligibleExplosive{threshold}"] += int(gain >= threshold)
    individual = reference.number(row.get("rushing_yards"))
    if individual is not None:
        counts["individualRushingYardsKnown"] += 1
        counts["wholeVsIndividualGainDifferent"] += int(individual != gain)
    return counts, gain, epa


class Aggregate:
    def __init__(self):
        self.counts = Counter()
        self.gains, self.epa = [], []
        self.games, self.teams, self.defenses, self.carriers = set(), set(), set(), set()
        self.clean_games = set()
        self.by_game = defaultdict(Counter)

    def add(self, row, prepared=None):
        counts, gain, epa = prepared if prepared is not None else observation(row)
        self.counts.update(counts)
        game = row.get("game_id", "").strip()
        if not game:
            raise ValueError("Selected run needs a game identity for cluster exposure")
        self.games.add(game)
        self.teams.add(row.get("posteam", "").strip() or "unknown")
        self.defenses.add(row.get("defteam", "").strip() or "unknown")
        self.carriers.add(row.get("rusher_player_id", "").strip() or "unknown")
        self.by_game[game].update(counts)
        if gain is not None:
            self.clean_games.add(game)
            self.gains.append(gain)
            self.by_game[game]["gainSum"] += gain
        if epa is not None:
            self.epa.append(epa)

    def result(self):
        net_gain = sum(self.gains)
        positive_gain = sum(gain for gain in self.gains if gain > 0)
        tails = {}
        for threshold in THRESHOLDS:
            tail_gain = sum(gain for gain in self.gains if gain >= threshold)
            tails[f"{threshold}plus"] = {"count": self.counts[f"explosive{threshold}plus"], "yards": tail_gain,
                                         "excessBeyondThreshold": sum(max(gain - threshold, 0) for gain in self.gains),
                                         "percentOfNetGain": 100 * tail_gain / net_gain if net_gain > 0 else None,
                                         "percentOfPositiveGain": 100 * tail_gain / positive_gain if positive_gain > 0 else None}
        yards = operators.distribution(self.gains)
        for upper in (10, 20):
            yards[f"cappedMean{upper}"] = sum(min(gain, upper) for gain in self.gains) / len(self.gains) if self.gains else None
        return {"counts": dict(sorted(self.counts.items())), "yards": yards,
                "epa": operators.distribution(self.epa),
                "tailYardContribution": {"netGain": net_gain, "positiveGain": positive_gain, "thresholds": tails},
                "rates": {key: reference.rate(self.counts[num], self.counts[den]) for key, (num, den) in METRICS.items()},
                "exposure": {"observedGames": len(self.games), "cleanGainGames": len(self.clean_games),
                             "offenseTeams": len(self.teams), "defenseTeams": len(self.defenses), "carrierIdentitiesIncludingUnknown": len(self.carriers)},
                "support": "unavailable" if not self.gains else "thin" if len(self.gains) < 100 or len(self.clean_games) < 20 else "broad"}


def cluster_draws(games_by_season, replicates, seed):
    """Keep full games together; use same draws for every conditional estimand."""
    rng = random.Random(seed)
    universe = {season: sorted(games) for season, games in sorted(games_by_season.items())}
    draws = []
    for _ in range(replicates):
        weights = Counter()
        for games in universe.values():
            weights.update(rng.choice(games) for _ in games)
        draws.append(weights)
    return draws


def interval(values):
    if not values:
        return {"validReplicates": 0, "lower": None, "upper": None}
    values = sorted(values)
    def quantile(p):
        x = p * (len(values) - 1)
        i = math.floor(x)
        return values[i] + (values[min(i + 1, len(values) - 1)] - values[i]) * (x - i)
    return {"validReplicates": len(values), "lower": quantile(.025), "upper": quantile(.975)}


def bootstrap(aggregate, draws, minimum_gains=100, minimum_games=20):
    if len(aggregate.gains) < minimum_gains or len(aggregate.clean_games) < minimum_games:
        return {"status": "insufficientExposure", "minimumGains": minimum_gains, "minimumCleanGainGames": minimum_games}
    values = defaultdict(list)
    # Do not build/re-aggregate plays: game-level sufficient statistics preserve
    # clustered numerator/denominator and both offenses in each sampled game.
    games = list(aggregate.by_game.items())
    metric_games = {metric: sum(source[METRICS[metric][1]] > 0 for _, source in games) for metric in BOOT_METRICS}
    supported = [metric for metric in BOOT_METRICS if aggregate.counts[METRICS[metric][1]] >= minimum_gains and metric_games[metric] >= minimum_games]
    needed = {"gainKnown", "gainSum"}
    for metric in supported:
        needed.update(METRICS[metric])
    for draw in draws:
        counts = Counter()
        for game, source in games:
            weight = draw.get(game, 0)
            if weight:
                for key in needed:
                    counts[key] += weight * source[key]
        if counts["gainKnown"]:
            values["meanYards"].append(counts["gainSum"] / counts["gainKnown"])
        for metric in supported:
            num, den = METRICS[metric]
            if counts[den]:
                values[metric].append(100 * counts[num] / counts[den])
    estimates = {"meanYards": interval(values["meanYards"])}
    for metric in BOOT_METRICS:
        numerator, denominator = METRICS[metric]
        n, d = aggregate.counts[numerator], aggregate.counts[denominator]
        estimates[metric] = {**interval(values[metric]), "observedNumerator": n, "observedDenominator": d,
                             "observedKnownMetricGames": metric_games[metric],
                             "status": "supported" if metric in supported else "insufficientMetricExposure",
                             "eventSupport": "unavailable" if not d else "zeroObservedNotZeroRisk" if not n else "rareUnder10" if n < 10 else "observed10plus"}
    return {"status": "descriptiveGameCluster95Percentile", "requestedReplicates": len(draws), "metrics": estimates}


def supported_fallback(groups, desired, minimum_gains=100, minimum_games=20):
    """Return an explicitly broader population, never fabricate sparse targets."""
    fields = list(CELL_FIELDS)
    discarded = []
    while True:
        key = tuple(desired[field] for field in fields)
        aggregate = groups.get((tuple(fields), key))
        if aggregate and len(aggregate.gains) >= minimum_gains and len(aggregate.clean_games) >= minimum_games:
            return {"status": "supported", "context": dict(zip(fields, key)), "discardedDimensions": discarded,
                    "counts": {"gains": len(aggregate.gains), "games": len(aggregate.clean_games)}}
        if len(fields) <= 2:
            return {"status": "unavailable", "discardedDimensions": discarded}
        discarded.append(fields.pop())


def standardized_pairs(groups, names, left, right, minimum):
    results = {}
    for metric in ("meanYards", "stuff", "success4060100", "explosive10plus", "explosive20plus"):
        retained, full_n = [], Counter()
        for key, pair in groups.items():
            for label, aggregate in pair.items():
                full_n[label] += len(aggregate.gains)
            if left not in pair or right not in pair or min(len(pair[left].gains), len(pair[right].gains)) < minimum:
                continue
            if metric == "meanYards":
                stats = {label: (sum(pair[label].gains), len(pair[label].gains)) for label in (left, right)}
            else:
                num, den = METRICS[metric]
                stats = {label: (pair[label].counts[num], pair[label].counts[den]) for label in (left, right)}
            if min(stats[left][1], stats[right][1]) < minimum:
                continue
            weight = stats[left][1] + stats[right][1]
            scale = 1 if metric == "meanYards" else 100
            retained.append({"context": dict(zip(names, key)), "weightCount": weight,
                             left: {"numerator": stats[left][0], "denominator": stats[left][1], "value": scale * stats[left][0] / stats[left][1]},
                             right: {"numerator": stats[right][0], "denominator": stats[right][1], "value": scale * stats[right][0] / stats[right][1]}})
        total = sum(row["weightCount"] for row in retained)
        results[metric] = {"minimumPerMetricGroupCell": minimum, "retainedCells": len(retained), "weightCount": total,
                           "groups": {label: {"standardizedValue": sum(row["weightCount"] * row[label]["value"] for row in retained) / total if total else None,
                                               "retainedMetricDenominator": sum(row[label]["denominator"] for row in retained),
                                               "allCleanGains": full_n[label]} for label in (left, right)}, "cells": retained}
    return results


def collect(inputs, source_manifests, query_receipt):
    overall, seasons, margins, cells, score_clock, teams, defense_teams, charts, chart_cells, cohorts, fallbacks = (defaultdict(Aggregate) for _ in range(11))
    games_by_season, audit, charts_audit = defaultdict(set), Counter(), defaultdict(Counter)
    time_pairs, score_pairs = defaultdict(lambda: defaultdict(Aggregate)), defaultdict(lambda: defaultdict(Aggregate))
    sources = []
    for season, files in sorted(inputs.items()):
        for role, item in files.items():
            if item:
                sources.append({"season": season, "role": role, **item[1]})
        positions = operators.roster_positions(reference.read_csv(files["roster"][0]))
        chart_index = operators.context_audit.index_chart(reference.read_csv(files["chart"][0])) if files["chart"] else {}
        seen = set()
        for row in reference.read_csv(files["pbp"][0]):
            audit["rawPbpRows"] += 1
            reason = operators.context_audit.selection_reason(row)
            if reason:
                audit["excluded_" + reason] += 1
                if row.get("play_type") == "no_play" and reference.flag(row.get("penalty")) is True:
                    audit["noPlayPenaltyRowsOutsideLiveRunDenominator"] += 1
                continue
            if reference.number(row.get("season")) != season:
                raise ValueError(f"Unexpected season in pinned PBP: {season}")
            identity = reference.play_key(row)
            if identity in seen:
                raise ValueError(f"Duplicate selected PBP game/play: {identity}")
            seen.add(identity)
            games_by_season[season].add(row["game_id"])
            audit["liveCallingPlays"] += 1
            kind = operators.run_kind(row)
            if kind is None:
                audit["otherObservedDropbacks"] += 1
                continue
            audit[kind] += 1
            carrier = operators.carrier_group(row, positions)
            ctx = context(row, carrier)
            chart = chart_index.get(identity)
            chart_ctx = chart_context(chart)
            charts_audit[season]["selectedRunRows"] += 1
            charts_audit[season]["matched" if chart is not None else "missingMatch" if files["chart"] else "unavailableSeason"] += 1
            prepared = observation(row)
            overall[kind].add(row, prepared)
            seasons[(season, kind)].add(row, prepared)
            teams[(season, row.get("posteam", "unknown"), kind, carrier)].add(row, prepared)
            defense_teams[(season, row.get("defteam", "unknown"), kind, carrier)].add(row, prepared)
            cells[tuple(ctx[field] for field in CELL_FIELDS)].add(row, prepared)
            cells[(season,) + tuple(ctx[field] for field in CELL_FIELDS)].add(row, prepared)
            score_clock[tuple(ctx[field] for field in SCORE_FIELDS)].add(row, prepared)
            for dimension in MARGINS:
                margins[(kind, dimension, ctx[dimension])].add(row, prepared)
            # Standardizations never mix scramble/back/QB and maintain context.
            period = "reference2022_2023" if season in (2022, 2023) else "holdout2024_2025" if season in (2024, 2025) else "other"
            time_pairs[tuple(ctx[field] for field in CELL_FIELDS)][period].add(row, prepared)
            score = reference.number(row.get("score_differential"))
            if score is not None and abs(score) >= 9:
                key = (season,) + tuple(ctx[field] for field in CELL_FIELDS) + (ctx["clock"],)
                score_pairs[key]["leading9plus" if score >= 9 else "trailing9plus"].add(row, prepared)
            for dimension, value in chart_ctx.items():
                charts[(season, kind, carrier, dimension, value)].add(row, prepared)
            if chart is not None:
                chart_cells[(kind, carrier, ctx["down"], ctx["distance"], ctx["field"], chart_ctx["box"])].add(row, prepared)
            chosen = []
            if kind == "scramble":
                chosen.append("scramble")
            else:
                if carrier == "RB_FB":
                    chosen.append("allRB_FB")
                    distance, field, seconds = (reference.number(row.get(key)) for key in ("ydstogo", "yardline_100", "game_seconds_remaining"))
                    if (ctx["down"] in (1, 2) and distance is not None and 8 <= distance <= 10 and field is not None and 20 < field <= 100
                            and score is not None and abs(score) <= 8 and ctx["clock"] == "earlyRegulation" and seconds is not None and seconds > 600):
                        chosen.append("ordinaryRB_FB")
                distance = reference.number(row.get("ydstogo"))
                if ctx["down"] in (3, 4) and distance is not None and 0 < distance <= 2:
                    chosen.append("shortYardageLateDown")
                if ctx["field"] == "goalLine1to5":
                    chosen.append("goalLine")
                if ctx["down"] == 3 and ctx["distance"] == "20plus":
                    chosen.append("third20plus")
                if ctx["clock"] == "final2min" and score is not None and score >= 9:
                    chosen.append("final2minLeading9plus")
                if chart_ctx["sneak"] == "true":
                    chosen.append("positiveChartedSneak")
            for name in chosen:
                cohorts[("all", name)].add(row, prepared)
                cohorts[(season, name)].add(row, prepared)
            for size in range(2, len(CELL_FIELDS) + 1):
                fields = CELL_FIELDS[:size]
                fallbacks[(fields, tuple(ctx[field] for field in fields))].add(row, prepared)
    draws = cluster_draws(games_by_season, query_receipt["query"]["bootstrapReplicates"], query_receipt["query"]["bootstrapSeed"])
    minimum_gains = query_receipt["query"]["minimumBootstrapGains"]
    minimum_games = query_receipt["query"]["minimumBootstrapGames"]
    def rows(groups, names, with_intervals=False):
        result = []
        for key, aggregate in sorted(groups.items(), key=lambda kv: tuple(map(str, kv[0]))):
            labels = names if len(key) == len(names) else ("season",) + tuple(names)
            row = {"context": dict(zip(labels, key)), **aggregate.result()}
            if with_intervals:
                row["uncertainty"] = bootstrap(aggregate, draws, minimum_gains, minimum_games)
            result.append(row)
        return result
    team_rows = rows(teams, ("season", "team", "kind", "carrier"))
    defense_rows = rows(defense_teams, ("season", "team", "kind", "carrier"))
    def exposure_ranges(table):
        groups = defaultdict(list)
        for row in table:
            groups[(row["context"]["kind"], row["context"]["carrier"])].append(row)
        return [{"kind": key[0], "carrier": key[1], "teamSeasons": len(group),
                 "cleanGainCount": operators.distribution([row["yards"]["n"] for row in group]),
                 "cleanGainGames": operators.distribution([row["exposure"]["cleanGainGames"] for row in group]),
                 "meanYards": operators.distribution([row["yards"]["mean"] for row in group if row["yards"]["mean"] is not None]),
                 "rates": {metric: operators.distribution([row["rates"][metric]["percent"] for row in group if row["rates"][metric]["percent"] is not None]) for metric in BOOT_METRICS}}
                for key, group in sorted(groups.items())]
    fallback_rows = [{"context": dict(zip(fields, key)), **aggregate.result()} for (fields, key), aggregate in sorted(fallbacks.items(), key=lambda item: (len(item[0][0]), tuple(map(str, item[0][1]))))]
    # Recheck all input pins after collection; a concurrent replacement cannot
    # silently make a report cover bytes other than its acquisition receipt.
    for files in inputs.values():
        for item in files.values():
            if item and sha256(item[0]) != item[1]["sha256"]:
                raise ValueError(f"Input changed during collection: {item[0]}")
    return {"schema": "rushing-benchmark-v1", "provenance": {**query_receipt, "python": platform.python_version(), "sources": sources, "acquisitionManifests": source_manifests,
              "attribution": "nflverse/nflfastR PBP; roster listed positions from nflverse; FTN Data via nflverse, charted aggregates CC-BY-SA-4.0"},
            "audit": dict(sorted(audit.items())), "chartAvailability": {str(year): dict(counts) for year, counts in sorted(charts_audit.items())},
            "bootstrapDesign": {"unit": "wholeGameBothTeams", "stratify": "season", "replicates": len(draws), "seed": query_receipt["query"]["bootstrapSeed"],
                                "gameUniverse": {str(year): len(games) for year, games in sorted(games_by_season.items())}, "drawWeightsSha256": digest([dict(sorted(draw.items())) for draw in draws])},
            "overall": {kind: {**aggregate.result(), "uncertainty": bootstrap(aggregate, draws, minimum_gains, minimum_games)} for kind, aggregate in sorted(overall.items())},
            "seasons": rows(seasons, ("season", "kind"), True), "margins": rows(margins, ("kind", "dimension", "value"), True),
            "jointCells": rows(cells, CELL_FIELDS), "scoreClock": rows(score_clock, SCORE_FIELDS, True),
            "chartedMargins": rows(charts, ("season", "kind", "carrier", "dimension", "value")),
            "chartedBoxContext": rows(chart_cells, CELL_FIELDS + ("box",)), "cohorts": rows(cohorts, ("season", "cohort"), True),
            "teamSeasons": team_rows, "defenseTeamSeasons": defense_rows,
            "teamSeasonRanges": exposure_ranges(team_rows), "defenseTeamSeasonRanges": exposure_ranges(defense_rows),
            "fallbackPopulations": fallback_rows,
            "fallbackReceipts": [{"requested": dict(zip(CELL_FIELDS, key)), **supported_fallback(fallbacks, dict(zip(CELL_FIELDS, key)), minimum_gains, minimum_games)} for key in sorted((key for key in cells if len(key) == len(CELL_FIELDS)), key=lambda key: tuple(map(str, key)))],
            "timeHoldoutStandardization": standardized_pairs(time_pairs, CELL_FIELDS, "reference2022_2023", "holdout2024_2025", 30),
            "timeHoldoutStandardizationByPopulation": {f"{kind}/{carrier}": standardized_pairs({key: pair for key, pair in time_pairs.items() if key[:2] == (kind, carrier)}, CELL_FIELDS, "reference2022_2023", "holdout2024_2025", 30) for kind, carrier in sorted({key[:2] for key in time_pairs})},
            "scoreCommonSupportStandardization": standardized_pairs(score_pairs, ("season",) + CELL_FIELDS + ("clock",), "trailing9plus", "leading9plus", 20),
            "scoreCommonSupportStandardizationByPopulation": {f"{kind}/{carrier}": standardized_pairs({key: pair for key, pair in score_pairs.items() if key[1:3] == (kind, carrier)}, ("season",) + CELL_FIELDS + ("clock",), "trailing9plus", "leading9plus", 20) for kind, carrier in sorted({key[1:3] for key in score_pairs})}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, action="append")
    parser.add_argument("--manifest", type=Path, action="append")
    parser.add_argument("--seasons", type=int, nargs="+", default=[2022, 2023])
    parser.add_argument("--bootstrap-replicates", type=int, default=250)
    parser.add_argument("--bootstrap-seed", type=int, default=20261011)
    parser.add_argument("--minimum-bootstrap-gains", type=int, default=100)
    parser.add_argument("--minimum-bootstrap-games", type=int, default=20)
    parser.add_argument("--plan-only", type=Path)
    parser.add_argument("--query-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.bootstrap_replicates < 1 or args.minimum_bootstrap_gains < 1 or args.minimum_bootstrap_games < 1:
        parser.error("Replicates and exposure minima must be positive")
    seasons = sorted(set(args.seasons))
    declared = receipt(seasons, args.bootstrap_replicates, args.bootstrap_seed, args.minimum_bootstrap_gains, args.minimum_bootstrap_games)
    if args.plan_only:
        data = {**declared, "declaredAtUtc": datetime.now(timezone.utc).isoformat()}
        path = args.plan_only
    else:
        if not args.query_receipt or not args.out:
            parser.error("Declare --plan-only first, then --query-receipt and --out")
        plan = json.loads(args.query_receipt.read_text())
        if any(plan.get(key) != value for key, value in declared.items()):
            raise ValueError("Collector/operator/query differs from declared pre-collection receipt")
        inputs, manifests = verify_inputs(args.input_dir or [ROOT / "data/raw/nflverse"], args.manifest or [ROOT / "data/reviews/nflverse/input-manifest.json"], seasons)
        data = collect(inputs, manifests, declared)
        data["declaredAtUtc"] = plan["declaredAtUtc"]
        data["collectedAtUtc"] = datetime.now(timezone.utc).isoformat()
        path = args.out
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"output": str(path), "querySha256": declared["querySha256"], "audit": data.get("audit")}))


if __name__ == "__main__":
    main()
