#!/usr/bin/env python3
"""Saved-only native engine adapter for the shared NFL rushing benchmark.

No simulation, network access, player-name matching or physical calibration.
The CLI freezes operator/tool receipts and verifies engine producer/source pins.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = "ordinary-eight-game-native-index-v1"
OUTPUT_SCHEMA = "engine-rushing-benchmark-v1"
MEAN_METRICS = {"meanYards": "mean", "cappedMean10": "cappedMean10", "cappedMean20": "cappedMean20"}
PIN = re.compile(r"^[0-9a-f]{64}$")
VERIFIED_COMMON = "6f15feb1273df667aebbb66842f66b40e472e5ca74b037867adb94540a87eeae"
VERIFIED_COLLECTORS = {
    "c13d6ceee5c2e1510aa2a0d6f1f2820e327ce8e424d84fb2463aa2d9807eefa5",
    "5e2670bef92c09685047f70fdf5f79d878b5f777f83ecf8fce3238445abdd60f",
    # Same full rawResult/common producer; additionally hashes a copied final
    # snapshot without the new scramble-carrier metadata for parity auditing.
    "7aae5bb1bc756efef52ab6bd9abc380e564bf5a2d59596d74629ab1ca66edc35",
}
HELPER_PATH = ROOT / "scripts/data/rushing_benchmark.py"
spec = importlib.util.spec_from_file_location("engine_rushing_operators", HELPER_PATH)
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)
QUERY = {
    "schema": "engine-rushing-benchmark-query-v1",
    "source": "Published ordinary eight-game native indexes only; no fixed-lab pooling.",
    "selection": "Native scrimmage, actual post-audible offCall run => designedRun; actual pass call and raw scramble=true and sacked!=true => scramble. Failed escape sacks audited separately. Two-point and non-scrimmage plays excluded. Native known called intent is richer than observational NFL realized-action classification.",
    "penalty": "For the verified full-native producer only, optional undefined raw.penalty is omitted by JSON and means no native flagged foul. Object means flagged even when declined; malformed/null penalty or missing raw means unknown. Nullified plays excluded. Engine flags are not complete NFL officiating flags.",
    "yards": "Primary settled GameLog.yards; retain native raw.offenseYards and flag differences. No terminal coordinate inference or substitution. Rounded-whole-yard sensitivity is separate, never changes saved outcomes.",
    "context": "Actual nativeInput.state before snap: down, distance, yardline, score, quarter, clock. yardline_100=100-state.yardline and los=10+state.yardline. Preserve firstDownX-los separately, never replace missing state.distance with it.",
    "carrier": "Exact raw.stats.rusher ID to selected offense team's saved league roster; ambiguity/missing stays unknown. Never infer names, slot or QB from scramble label.",
    "unavailable": "EPA, NFL positive-EPA success, observed run_location/run_gap, charted box and NFL concepts/fronts remain unavailable. Generated offensive scheme and called defense labels remain engine-only margins; Duo is not renamed MAN.",
    "cohort": "Same immutable source/rosters/game seeds retained; divergent baseline/candidate play streams are not paired snap trials.",
    "standardization": "Fixed coarse backoff with minimum NFL support declared before comparison; report common support/excluded engine exposure. Weighted NFL conditional means/rates, not pooled quantiles or an engine EPA model.",
    "declarationScope": "Existing engine outcome summaries were already viewed. New adapter/query is declared before executing its NFL comparison, not outcome-blind preregistration.",
}


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def hash_json(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def file_sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def saved_json_sha(value):
    """Verify the documented JSON.stringify encoding of these saved producers."""
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def read_json(path):
    path = Path(path)
    with (gzip.open(path, "rt") if path.suffix == ".gz" else path.open()) as stream:
        return json.load(stream)


def check_pin(value, name):
    if not isinstance(value, str) or not PIN.fullmatch(value):
        raise ValueError(f"Missing/malformed {name}")


def validate_index(index, expected_source=None, expected_collector=None):
    if index.get("schema") != SCHEMA:
        raise ValueError("Unsupported engine native-index producer schema")
    for field in ("sourceBefore", "sourceAfter", "collectorSha256", "commonSha256"):
        check_pin(index.get(field), field)
    if index["sourceBefore"] != index["sourceAfter"]:
        raise ValueError("Engine source changed during native collection")
    if index["commonSha256"] != VERIFIED_COMMON or index["collectorSha256"] not in VERIFIED_COLLECTORS:
        raise ValueError("Native omission/penalty semantics not audited for this producer")
    if expected_source is not None and index["sourceBefore"] != expected_source:
        raise ValueError("Engine source differs from expected source")
    if expected_collector is not None and index["collectorSha256"] != expected_collector:
        raise ValueError("Engine collector differs from expected producer")
    if not isinstance(index.get("leagueInputs"), list) or not isinstance(index.get("rows"), list):
        raise ValueError("Missing saved league rosters or native games")
    league_ids, game_ids = set(), set()
    for league in index["leagueInputs"]:
        if league.get("league") in league_ids:
            raise ValueError("Duplicate saved league identity")
        league_ids.add(league.get("league"))
        check_pin(league.get("rosterSha256"), "saved roster source")
        if not isinstance(league.get("teams"), list):
            raise ValueError("Missing saved league teams")
        if saved_json_sha(league["teams"]) != league["rosterSha256"]:
            raise ValueError("Saved league roster bytes differ from producer pin")
    for game in index["rows"]:
        identity = (game.get("league"), game.get("gameIndex"), game.get("seed"))
        if identity in game_ids or game.get("league") not in league_ids:
            raise ValueError("Duplicate game or unknown league")
        game_ids.add(identity)
        if game.get("sourceBefore") != index["sourceBefore"] or game.get("sourceAfter") != index["sourceAfter"]:
            raise ValueError("Per-game source differs from index")
        if not isinstance(game.get("log"), list):
            raise ValueError("Missing game log")
        teams = next(league["teams"] for league in index["leagueInputs"] if league["league"] == game["league"])
        by_id = {team.get("id"): team for team in teams}
        paired = [by_id.get(game.get(side, {}).get("id")) for side in ("home", "away")]
        if None in paired or saved_json_sha(paired) != game.get("beforeRosterSha256"):
            raise ValueError("Game starting rosters do not match saved league input")
        ids = [row.get("index") for row in game["log"]]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate game log index")
        if game.get("nativeCalls") != sum("nativeInput" in row for row in game["log"]):
            raise ValueError("Native call count does not reconcile")
        for row in game["log"]:
            if "nativeInput" not in row:
                continue
            native = row["nativeInput"]
            if not isinstance(native, dict) or native.get("logIndex") != row.get("index"):
                raise ValueError("Native input does not identify its settled log row")
    if index.get("games") != len(index["rows"]) or index.get("leagues") != len(index["leagueInputs"]):
        raise ValueError("Game/league counts do not reconcile")


def roster_index(index):
    result = {}
    for league in index["leagueInputs"]:
        for team in league["teams"]:
            key = (league["league"], team.get("id"))
            if key in result:
                raise ValueError("Duplicate team identity in saved league")
            players = defaultdict(set)
            for player in team.get("roster", []):
                identity = player.get("id")
                if isinstance(identity, str) and identity:
                    players[identity].add(player.get("position"))
            result[key] = {identity: next(iter(positions)) if len(positions) == 1 else None
                           for identity, positions in players.items()}
    return result


def penalty_status(native):
    raw = native.get("raw")
    if not isinstance(raw, dict):
        return "unknown"
    if "penalty" not in raw:
        return "unflaggedNative"
    penalty = raw["penalty"]
    if isinstance(penalty, dict) and isinstance(penalty.get("kind"), str) and penalty.get("against") in ("O", "D") and finite(penalty.get("yards")):
        return "flaggedNative"
    return "unknown"


def run_kind(native):
    call = native.get("offCall")
    raw = native.get("raw")
    if not isinstance(call, dict):
        return None
    if call.get("kind") == "run":
        return "designedRun"
    stats = raw.get("stats") if isinstance(raw, dict) and isinstance(raw.get("stats"), dict) else {}
    if call.get("kind") == "pass" and stats.get("scramble") is True and stats.get("sacked") is not True:
        return "scramble"
    return None


def context_values(game, log, native):
    state = native.get("state") if isinstance(native.get("state"), dict) else {}
    possession = state.get("possession")
    offense = game.get(possession, {}) if possession in ("home", "away") else {}
    if offense and log.get("offense") not in (offense.get("id"), offense.get("abbr")):
        raise ValueError("Log offense differs from true pre-snap possession")
    own = state.get("yardline")
    field = 100 - own if finite(own) and 0 <= own <= 100 else None
    los = native.get("los")
    if field is not None and finite(los) and abs(los - own - 10) > 1e-6:
        raise ValueError("Native LOS and pre-snap yardline disagree")
    score = state.get("score")
    differential = None
    if possession in ("home", "away") and isinstance(score, dict) and finite(score.get("home")) and finite(score.get("away")):
        other = "away" if possession == "home" else "home"
        differential = score[possession] - score[other]
    quarter, clock = state.get("quarter"), state.get("clock")
    seconds = (4 - quarter) * 900 + clock if quarter in (1, 2, 3, 4) and finite(clock) and 0 <= clock <= 900 else None
    first = native.get("firstDownX")
    return {"down": state.get("down"), "distanceToGain": state.get("distance"),
            "yardline100": field, "ownYardline": own if finite(own) else None,
            "los": los if finite(los) else None, "firstDownX": first if finite(first) else None,
            "geometricDistanceToGain": first - los if finite(first) and finite(los) else None,
            "quarter": quarter, "clock": clock if finite(clock) else None,
            "gameSecondsRemaining": seconds, "scoreDifferential": differential,
            "offenseTeamId": offense.get("id"), "offenseSide": possession,
            "defenseTeamId": game.get("away" if possession == "home" else "home", {}).get("id") if possession in ("home", "away") else None,
            "preSnapScore": score, "offenseIdentityKnown": bool(offense)}


def normalize_play(game, log, rosters):
    native = log["nativeInput"]
    if not isinstance(native, dict):
        raise ValueError("Malformed native input")
    ctx = context_values(game, log, native)
    raw = native.get("raw") if isinstance(native.get("raw"), dict) else {}
    stats = raw.get("stats") if isinstance(raw.get("stats"), dict) else {}
    identity = stats.get("rusher")
    positions = rosters.get((game["league"], ctx["offenseTeamId"]), {})
    position = positions.get(identity) if isinstance(identity, str) and identity else None
    carrier = "QB" if position == "QB" else "RB_FB" if position in ("RB", "FB") else "other" if position else "unknown"
    kind = run_kind(native)
    penalty = penalty_status(native)
    scrimmage = native.get("kind") == "scrimmage" and log.get("kind") in ("run", "pass")
    nullified = log.get("nullified") is True
    gain, raw_gain = log.get("yards"), raw.get("offenseYards")
    gain = gain if finite(gain) else None
    raw_gain = raw_gain if finite(raw_gain) else None
    call = native.get("offCall") if isinstance(native.get("offCall"), dict) else {}
    run = call.get("run") if isinstance(call.get("run"), dict) else {}
    pass_call = call.get("pass") if isinstance(call.get("pass"), dict) else {}
    concept = run.get("scheme") if call.get("kind") == "run" else pass_call.get("id")
    plan = log.get("plan", {})
    planned_concept = plan.get("concept") if isinstance(plan, dict) else None
    if planned_concept is not None and concept is not None and planned_concept != concept:
        raise ValueError("Settled log plan and actual post-audible native call disagree")
    turnover = raw.get("turnover") if isinstance(raw.get("turnover"), bool) else None
    fumble_lost = stats.get("fumbleLost", False) if isinstance(raw.get("stats"), dict) else None
    fumble_lost = fumble_lost if isinstance(fumble_lost, bool) else None
    score = raw.get("score")
    td = bool(isinstance(score, dict) and score.get("kind") == "TD" and score.get("team") == "O") if "score" in raw else None
    reasons = []
    if kind is None: reasons.append("notObservedRun")
    if not scrimmage: reasons.append("twoPointOrNonScrimmage")
    if nullified: reasons.append("nullified")
    if penalty != "unflaggedNative": reasons.append("flaggedNative" if penalty == "flaggedNative" else "unknownPenalty")
    if gain is None: reasons.append("missingSettledGain")
    game_id = f"league{game['league']}:game{game['gameIndex']}:seed{game['seed']}"
    nfl = {"game_id": game_id, "posteam": f"league{game['league']}:{ctx['offenseTeamId']}" if ctx["offenseTeamId"] else "unknown",
           "defteam": f"league{game['league']}:{ctx['defenseTeamId']}" if ctx["defenseTeamId"] else "unknown",
           "rusher_player_id": f"league{game['league']}:{ctx['offenseTeamId']}:{identity}" if position and isinstance(identity, str) else "unknown",
           "yards_gained": gain, "penalty": False if penalty == "unflaggedNative" else True if penalty == "flaggedNative" else None,
           "down": ctx["down"], "ydstogo": ctx["distanceToGain"], "yardline_100": ctx["yardline100"],
           "score_differential": ctx["scoreDifferential"], "qtr": ctx["quarter"], "game_seconds_remaining": ctx["gameSecondsRemaining"],
           "fumble_lost": fumble_lost, "first_down_rush": log.get("firstDown") if isinstance(log.get("firstDown"), bool) else None,
           "rush_touchdown": td, "epa": None}
    return {"id": f"G{game['gameIndex']}-P{log['index']:03d}",
            "gameId": game_id,
            "league": game["league"], "snapSeed": native.get("seed"), "kind": kind,
            "calledKind": call.get("kind"), "nativeKind": native.get("kind"), "logKind": log.get("kind"),
            "failedEscapeSack": call.get("kind") == "pass" and stats.get("scramble") is True and stats.get("sacked") is True,
            "scrimmage": scrimmage, "nullified": nullified, "penaltyStatus": penalty,
            "cleanEligible": not reasons, "exclusionReasons": reasons,
            "settledGain": gain, "rawPrePenaltyGain": raw_gain,
            "settledVsRawDifference": gain - raw_gain if gain is not None and raw_gain is not None else None,
            "carrierId": identity if isinstance(identity, str) and identity else None,
            "carrierPosition": position, "carrier": carrier, "contextValues": ctx,
            "turnover": turnover, "fumbleLost": fumble_lost,
            "fumbleEvent": any(e.get("type") == "fumble" for e in raw["events"] if isinstance(e, dict)) if isinstance(raw.get("events"), list) else None,
            "touchdown": td, "recordedFirstDown": nfl["first_down_rush"],
            "generatedConcept": concept, "generatedRunId": run.get("id"),
            "calledFront": native.get("defCall", {}).get("front", {}).get("id"),
            "calledCoverage": native.get("defCall", {}).get("coverage", {}).get("id"),
            "audible": plan.get("audible") if isinstance(plan, dict) and isinstance(plan.get("audible"), bool) else None,
            "nflMetricRow": nfl}


def normalize_index(index, expected_source=None, expected_collector=None):
    validate_index(index, expected_source, expected_collector)
    rosters = roster_index(index)
    return [normalize_play(game, log, rosters) for game in index["rows"]
            for log in game["log"] if "nativeInput" in log]


def context(play, metric_row=None):
    row = metric_row if metric_row is not None else play["nflMetricRow"]
    result = benchmark.context(row, play["carrier"])
    # Intent is saved directly by this engine; do not fabricate NFL PBP flags.
    result["kind"] = play["kind"]
    result.pop("season", None)
    return result


def cohorts(play, metric_row=None):
    row = metric_row if metric_row is not None else play["nflMetricRow"]
    ctx = context(play, row)
    if play["kind"] == "scramble":
        return ["scramble"]
    names = []
    if play["carrier"] == "RB_FB":
        names.append("allRB_FB")
        distance, field, score, seconds = (row.get(key) for key in
                                         ("ydstogo", "yardline_100", "score_differential", "game_seconds_remaining"))
        if (ctx["down"] in (1, 2) and finite(distance) and 8 <= distance <= 10
                and finite(field) and 20 < field <= 100 and finite(score) and abs(score) <= 8
                and ctx["clock"] == "earlyRegulation" and finite(seconds) and seconds > 600):
            names.append("ordinaryRB_FB")
    distance, score = row.get("ydstogo"), row.get("score_differential")
    if ctx["down"] in (3, 4) and finite(distance) and 0 < distance <= 2:
        names.append("shortYardageLateDown")
    if ctx["field"] == "goalLine1to5":
        names.append("goalLine")
    if ctx["down"] == 3 and ctx["distance"] == "20plus":
        names.append("third20plus")
    if ctx["clock"] == "final2min" and finite(score) and score >= 9:
        names.append("final2minLeading9plus")
    return names


def rounded_metric_row(row):
    result = dict(row)
    for field in ("yards_gained", "ydstogo", "yardline_100"):
        if finite(result.get(field)):
            # Explicit sensitivity, ties toward +infinity (not Python bankers).
            result[field] = math.floor(result[field] + .5)
    return result


def aggregate_plays(plays, rounded=False):
    overall, cells, score_clock, margins, selected_cohorts, games = (defaultdict(benchmark.Aggregate) for _ in range(6))
    included = []
    for play in plays:
        if play["kind"] is None or not play["scrimmage"] or play["nullified"]:
            continue
        row = rounded_metric_row(play["nflMetricRow"]) if rounded else play["nflMetricRow"]
        prepared = benchmark.observation(row)
        ctx = context(play, row)
        included.append(play)
        overall[play["kind"]].add(row, prepared)
        cells[tuple(ctx[field] for field in benchmark.CELL_FIELDS)].add(row, prepared)
        score_clock[tuple(ctx[field] for field in benchmark.SCORE_FIELDS)].add(row, prepared)
        games[(play["gameId"], play["kind"])].add(row, prepared)
        for dimension in benchmark.MARGINS:
            margins[(play["kind"], dimension, ctx[dimension])].add(row, prepared)
        for dimension in ("generatedConcept", "calledFront", "calledCoverage", "carrierPosition"):
            margins[(play["kind"], dimension, play[dimension] or "unknown")].add(row, prepared)
        for name in cohorts(play, row):
            selected_cohorts[(name,)].add(row, prepared)

    def rows(groups, names):
        return [{"context": dict(zip(names, key)), **aggregate.result()}
                for key, aggregate in sorted(groups.items(), key=lambda item: tuple(map(str, item[0])))]
    return {"overall": {kind: aggregate.result() for kind, aggregate in sorted(overall.items())},
            "jointCells": rows(cells, benchmark.CELL_FIELDS),
            "scoreClock": rows(score_clock, benchmark.SCORE_FIELDS),
            "margins": rows(margins, ("kind", "dimension", "value")),
            "cohorts": rows(selected_cohorts, ("cohort",)), "games": rows(games, ("gameId", "kind")),
            "inference": "Descriptive only: eight games/two generated leagues do not support NFL-like confidence or roster tolerance intervals."}


def reconcile(plays):
    counts = Counter()
    gains = []
    for play in plays:
        counts["nativeCalls"] += 1
        counts[f"nativeKind_{play['nativeKind']}"] += 1
        counts[f"actualCalledKind_{play['calledKind']}"] += 1
        counts[f"settledLogKind_{play['logKind']}"] += 1
        counts[f"penalty_{play['penaltyStatus']}"] += 1
        counts["failedEscapeSack"] += play["failedEscapeSack"]
        if play["calledKind"] == "run":
            counts["allNativeCalledRuns"] += 1
            counts[f"calledRunLogKind_{play['logKind']}"] += 1
            counts["calledRunNullified"] += play["nullified"]
            if play["logKind"] == "run" and not play["nullified"]:
                counts["officialNonNullifiedLogRuns"] += 1
                if play["settledGain"] is not None:
                    gains.append(play["settledGain"])
                counts[f"officialRunPenalty_{play['penaltyStatus']}"] += 1
        if play["kind"] is not None and play["scrimmage"] and not play["nullified"]:
            counts[f"observed_{play['kind']}"] += 1
            counts[f"observed_{play['kind']}_penalty_{play['penaltyStatus']}"] += 1
            counts[f"observed_{play['kind']}_carrier_{play['carrier']}"] += 1
        if play["cleanEligible"]:
            counts[f"clean_{play['kind']}"] += 1
            counts[f"clean_{play['kind']}_carrier_{play['carrier']}"] += 1
            counts["cleanGainDiffersFromRaw"] += play["settledVsRawDifference"] is not None and abs(play["settledVsRawDifference"]) > 1e-9
        for reason in play["exclusionReasons"]:
            counts[f"cleanExclusion_{reason}"] += 1
    return {"counts": dict(sorted(counts.items())), "officialLogRunYards": sum(gains),
            "officialLogRunMean": sum(gains) / len(gains) if gains else None,
            "officialLogRunGainCount": len(gains),
            "scope": "Old official non-nullified run summary retained separately; it includes declined native flags and differs from new strict clean populations. Exclusions overlap."}


def validate_nfl_report(report):
    if report.get("schema") != "rushing-benchmark-v1" or not isinstance(report.get("fallbackPopulations"), list):
        raise ValueError("Unsupported NFL benchmark/schema or missing reference populations")
    provenance = report.get("provenance", {})
    if provenance.get("querySha256") != benchmark.digest(provenance.get("query")):
        raise ValueError("NFL report query fingerprint does not verify")
    for key, value in dependency_pins().items():
        mapped = {"sharedModuleSha256": "collectorSha256", "operatorSha256": "operatorSha256",
                  "referenceHelperSha256": "referenceHelperSha256", "contextHelperSha256": "contextHelperSha256"}[key]
        if provenance.get(mapped) != value:
            raise ValueError("NFL report operators differ from adapter's shared operators")


def reference_lookup(report):
    result = {}
    for row in report["fallbackPopulations"]:
        ctx = row.get("context", {})
        size = len(ctx)
        fields = benchmark.CELL_FIELDS[:size]
        if size < 2 or size > len(benchmark.CELL_FIELDS) or set(ctx) != set(fields):
            raise ValueError("Unexpected NFL reference backoff dimensions")
        key = (fields, tuple(ctx[field] for field in fields))
        if key in result:
            raise ValueError("Duplicate NFL reference backoff population")
        result[key] = row
    return result


def choose_reference(lookup, desired, metric, minimum_gains=100, minimum_games=20, minimum_metric_denominator=100):
    fields = list(benchmark.CELL_FIELDS)
    discarded = []
    while True:
        row = lookup.get((tuple(fields), tuple(desired[field] for field in fields)))
        gain_count = row.get("yards", {}).get("n", 0) if row else 0
        games = row.get("exposure", {}).get("cleanGainGames", 0) if row else 0
        metric_count = gain_count if metric in MEAN_METRICS else row.get("rates", {}).get(metric, {}).get("denominator", 0) if row else 0
        value = row.get("yards", {}).get(MEAN_METRICS[metric]) if metric in MEAN_METRICS and row else row.get("rates", {}).get(metric, {}).get("percent") if row else None
        if gain_count >= minimum_gains and games >= minimum_games and metric_count >= minimum_metric_denominator and finite(value):
            return {"status": "supported", "context": dict(zip(fields, (desired[field] for field in fields))),
                    "discardedDimensions": list(discarded), "referenceGainCount": gain_count,
                    "referenceCleanGainGames": games, "referenceMetricDenominator": metric_count,
                    "referenceValue": value}
        if len(fields) <= 2:
            return {"status": "unavailable", "discardedDimensions": discarded}
        discarded.append(fields.pop())


def standardize(engine, nfl, minimum_gains=100, minimum_games=20, minimum_metric_denominator=100):
    lookup = reference_lookup(nfl)
    groups = defaultdict(list)
    for cell in engine["jointCells"]:
        groups[(cell["context"]["kind"], cell["context"]["carrier"])].append(cell)
    result = []
    for (kind, carrier), cells in sorted(groups.items()):
        metrics = {}
        for metric in tuple(MEAN_METRICS) + tuple(benchmark.METRICS):
            receipts = []
            total_den = retained_den = observed_num = expected_num = 0
            for cell in cells:
                if metric in MEAN_METRICS:
                    denominator = cell["yards"]["n"]
                    observed = cell["yards"].get(MEAN_METRICS[metric])
                else:
                    denominator = cell["rates"][metric]["denominator"]
                    observed = cell["rates"][metric]["percent"]
                total_den += denominator
                if not denominator or not finite(observed):
                    continue
                selected = choose_reference(lookup, cell["context"], metric, minimum_gains, minimum_games, minimum_metric_denominator)
                receipts.append({"engineContext": cell["context"], "engineMetricDenominator": denominator, **selected})
                if selected["status"] != "supported":
                    continue
                retained_den += denominator
                observed_num += denominator * observed if metric in MEAN_METRICS else cell["rates"][metric]["count"] * 100
                expected_num += denominator * selected["referenceValue"]
            metrics[metric] = {"engineAllMetricDenominator": total_den, "retainedEngineMetricDenominator": retained_den,
                               "excludedEngineMetricDenominator": total_den - retained_den,
                               "retainedEnginePercent": 100 * retained_den / total_den if total_den else None,
                               "engineValueOnCommonSupport": observed_num / retained_den if retained_den else None,
                               "nflExpectedAtEngineExposure": expected_num / retained_den if retained_den else None,
                               "engineObservedTotalOnCommonSupport": observed_num / (1 if metric in MEAN_METRICS else 100) if retained_den else None,
                               "nflExpectedTotalOnCommonSupport": expected_num / (1 if metric in MEAN_METRICS else 100) if retained_den else None,
                               "engineMinusExpected": (observed_num - expected_num) / retained_den if retained_den else None,
                               "units": "yards" if metric in MEAN_METRICS else "percentagePoints",
                               "totalUnits": "plays" if metric not in MEAN_METRICS else "yards" if metric == "meanYards" else "upperCappedYards", "cells": receipts}
        result.append({"kind": kind, "carrier": carrier, "metrics": metrics})
    return {"method": "Engine actual metric denominators weight NFL fixed-backoff conditional rates/means. Broader references explicitly discard context. Metrics may have different common support; no averaging of quantiles, no EPA substitution.",
            "minimumNflGains": minimum_gains, "minimumNflGames": minimum_games,
            "minimumNflPerMetricDenominator": minimum_metric_denominator, "groups": result}


def dependency_pins():
    return {"sharedModuleSha256": file_sha(HELPER_PATH), "operatorSha256": file_sha(benchmark.HELPER_PATH),
            "referenceHelperSha256": file_sha(benchmark.operators.HELPER_PATH),
            "contextHelperSha256": file_sha(benchmark.operators.CONTEXT_PATH)}


def receipt(index_path, nfl_path, expected_source, expected_collector, minimum_gains=100, minimum_games=20, minimum_metric_denominator=100, label="savedEngine"):
    check_pin(expected_source, "expected engine source")
    check_pin(expected_collector, "expected engine collector")
    query = {**QUERY, "minimumNflGains": minimum_gains, "minimumNflGames": minimum_games,
             "minimumNflPerMetricDenominator": minimum_metric_denominator}
    return {"query": query, "querySha256": hash_json(query), "adapterSha256": file_sha(Path(__file__)),
            **dependency_pins(), "engineIndexSha256": file_sha(index_path), "nflReportSha256": file_sha(nfl_path),
            "expectedEngineSourceSha256": expected_source, "expectedEngineCollectorSha256": expected_collector,
            "comparisonLabel": label}


def collect(index, nfl, declared):
    plays = normalize_index(index, declared["expectedEngineSourceSha256"], declared["expectedEngineCollectorSha256"])
    validate_nfl_report(nfl)
    engine = aggregate_plays(plays)
    rounded = aggregate_plays(plays, True)
    support_args = (declared["query"]["minimumNflGains"], declared["query"]["minimumNflGames"], declared["query"]["minimumNflPerMetricDenominator"])
    return {"schema": OUTPUT_SCHEMA, "provenance": {**declared,
            "engineSourceSha256": index["sourceBefore"], "nativeCollectorSha256": index["collectorSha256"],
            "nativeCommonSha256": index["commonSha256"],
            "rosterInputs": [{"league": league["league"], "rosterSha256": league["rosterSha256"]} for league in index["leagueInputs"]],
            "savedGameSeeds": [{"gameIndex": game["gameIndex"], "league": game["league"], "seed": game["seed"]} for game in index["rows"]],
            "nflQuerySha256": nfl["provenance"]["querySha256"], "nflSeasons": nfl["provenance"]["query"].get("seasons"),
            "nflAttribution": nfl["provenance"].get("attribution")},
            "reconciliation": reconcile(plays), **engine,
            "nflStandardization": standardize(engine, nfl, *support_args),
            "roundedWholeYardSensitivity": {"operator": "Round settled whole-play gain, state distance and derived yardline100 to nearest whole yard (ties toward +infinity); all recorded events/outcomes remain unchanged.",
                                           **rounded, "nflStandardization": standardize(rounded, nfl, *support_args)},
            "largestCleanNativeRuns": [{key: value for key, value in play.items() if key != "nflMetricRow"}
                                       for play in sorted((p for p in plays if p["cleanEligible"] and p["kind"] == "designedRun"),
                                                          key=lambda p: (-p["settledGain"], p["id"]))[:20]],
            "nativeWitnesses": [{key: value for key, value in play.items() if key != "nflMetricRow"}
                                for play in plays if play["kind"] is not None or play["failedEscapeSack"]]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--nfl-report", required=True, type=Path)
    parser.add_argument("--expected-source", required=True)
    parser.add_argument("--expected-collector", required=True)
    parser.add_argument("--label", default="savedEngine")
    parser.add_argument("--minimum-nfl-gains", type=int, default=100)
    parser.add_argument("--minimum-nfl-games", type=int, default=20)
    parser.add_argument("--minimum-nfl-metric-denominator", type=int, default=100)
    parser.add_argument("--plan-only", type=Path)
    parser.add_argument("--query-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if min(args.minimum_nfl_gains, args.minimum_nfl_games, args.minimum_nfl_metric_denominator) < 1:
        parser.error("Support minima must be positive")
    declared = receipt(args.index, args.nfl_report, args.expected_source, args.expected_collector,
                       args.minimum_nfl_gains, args.minimum_nfl_games, args.minimum_nfl_metric_denominator, args.label)
    if args.plan_only:
        data = {**declared, "declaredAtUtc": datetime.now(timezone.utc).isoformat()}
        path = args.plan_only
    else:
        if not args.query_receipt or not args.out:
            parser.error("Declare --plan-only first, then --query-receipt and --out")
        plan = read_json(args.query_receipt)
        if any(plan.get(key) != value for key, value in declared.items()):
            raise ValueError("Adapter/query/operators/input bytes changed after declaration")
        data = collect(read_json(args.index), read_json(args.nfl_report), declared)
        if declared != receipt(args.index, args.nfl_report, args.expected_source, args.expected_collector,
                                args.minimum_nfl_gains, args.minimum_nfl_games, args.minimum_nfl_metric_denominator, args.label):
            raise ValueError("Inputs or operators changed during collection")
        data["declaredAtUtc"] = plan["declaredAtUtc"]
        data["collectedAtUtc"] = datetime.now(timezone.utc).isoformat()
        path = args.out
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"output": str(path), "querySha256": declared["querySha256"], "reconciliation": data.get("reconciliation")}))


if __name__ == "__main__":
    main()
