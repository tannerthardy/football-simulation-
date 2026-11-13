#!/usr/bin/env python3
"""Offline metadata-only run outcomes from the pinned BDB 2025 snapshot.

Freeze a receipt after defining the query, then run the collector:
  python3 -I scripts/data/bdb_run_outcome_context.py --plan-only out/bdb-plan.json
  python3 -I scripts/data/bdb_run_outcome_context.py --directory /path/to/bdb2025 \
      --query-receipt out/bdb-plan.json --out out/bdb-labels.json

No tracking, inferred fronts, engine tuning or downloads are involved.
"""
import argparse
import csv
import hashlib
import json
import math
import platform
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

PINS = {
    "plays.csv": {"bytes": 6892353, "sha256": "a103cbc3a1ddf7678cb6d77ea5f9919c4292b5d55c7876f7cad6cce3d62dca04"},
    "player_play.csv": {"bytes": 52533762, "sha256": "4dfeba939d0b56e9fca6044c1df709879a22ed239389e155afba571915bd5852"},
    "players.csv": {"bytes": 104749, "sha256": "dc2b5f923e84a16d789d999e88aea670b5495436ab88c24aef7b97b07d723626"},
}
QUERY = {
    "schema": "bdb-run-outcome-context-query-v1",
    "source": "BDB 2025, 2022 weeks 1–9 play/player metadata; input SHA-256 and sizes match data/reviews/run-game-coordination/nfl-reference.json.",
    "inputs": PINS,
    "declarationScope": "Frozen before executing this NEW collector, after an initial descriptive audit of these metadata and existing summaries. This is not an outcome-blind preregistration.",
    "selection": "playNullifiedByPenalty=N, isDropback=FALSE, no kneel/spike, observed rushLocationType and finite yardsGained. Provider-defined designed runs; all runner positions retained, including QB runs and tricks.",
    "sneaks": "qbSneak=true OR pff_runConceptPrimary=SNEAK is a separate QB_SNEAK class. Raw primary labels remain unchanged; ordinaryRuns excludes this class. Any flag/label disagreement is reported.",
    "yards": "Main outcomes use finite yardsGained, matching the existing run-tracking/tendency references. prePenaltyYardsGained is a separate operator with its own known denominator; differences and missingness are reported. Neither is silently substituted for the other.",
    "penalties": "Keep non-nullified rows with recorded penaltyYards. Missing, zero and nonzero values are distinguished; field presence is not a complete penalty-event label. No assertion that non-nullified means penalty-free.",
    "outcomes": "Positive>0, zero=0, negative<0, stuff<=0, explosive>=10 and >=20 yards. Every rate reports numerator and known denominator. Gain-threshold success requires >=40% of yardsToGo on first down, >=60% on second and >=100% on third/fourth; this convention is not EPA success. Conversion requires gain>=positive yardsToGo.",
    "contexts": {"down": [1, 2, 3, 4, "unknown"], "distance": ["1to3", "4to7", "8to10", "11to19", "20plus", "unknown"], "field": ["redZone0to20", "plus21to50", "own51to100", "unknown"]},
    "fieldGeometry": "Yards to the opponent end zone derived from possessionTeam, yardlineSide and yardlineNumber; the 50 is midfield. Invalid/unknown side or distance stays unknown.",
    "labels": "Preserve exact pff_runConceptPrimary and raw pff_runConceptSecondary. MAN is not verified Duo; OUTSIDE ZONE does not isolate wide zone/toss. Secondary SPLIT/READ OPTION/LEAD/PITCH are provider modifiers, not verified simulator concept classes. Token margins overlap; raw single/compound values are also separate.",
    "support": "Retain every cell including thin cells. Expose cell counts in 1–4,5–19,20–99,100+ bins; all rates retain their actual denominator. Team and team/primary margins describe the observed nine-week snapshot, not confidence intervals or independent league-strength effects.",
    "rusher": "Exact game/play join to hadRushAttempt in player_play.csv and nflId to players.csv. No rusher, multiple rushers or missing roster position stays explicit, and does not exclude an otherwise eligible metadata play.",
    "box": "If n_defenders_in_box or defendersInBox exists, retain that numeric count and its denominator as a presentation label, never a defensive front or rush count. No value is invented when absent.",
    "inference": "Descriptive metadata outcomes only. No tracking/contact/footwork measurements, no causation, no confidence intervals, no direct engine accuracy claim. Concept/situation/team/personnel selection differs from controlled lab calls and the old personnel-filtered tendency cohort.",
}
MISSING = {"", "NA", "N/A", "null", "None"}


def number(value):
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else None
    except (TypeError, ValueError):
        return None


def truth(value):
    return str(value).strip().upper() in {"1", "TRUE"}


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def query_digest():
    return hashlib.sha256(json.dumps(QUERY, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def receipt():
    return {"query": QUERY, "querySha256": query_digest(), "collectorSha256": sha256(__file__),
            "declaredAt": datetime.now(timezone.utc).isoformat()}


def verify_receipt(plan):
    if plan.get("query") != QUERY or plan.get("querySha256") != query_digest():
        raise ValueError("Query differs from frozen receipt")
    if plan.get("collectorSha256") != sha256(__file__):
        raise ValueError("Collector differs from frozen receipt; freeze a new receipt")
    declared = datetime.fromisoformat(plan["declaredAt"])
    if declared.tzinfo is None or declared > datetime.now(timezone.utc):
        raise ValueError("Receipt must have a past UTC-aware declaration time")


def verify_inputs(directory, pins=PINS):
    checked = []
    for name, expected in pins.items():
        path = directory / name
        actual = {"bytes": path.stat().st_size, "sha256": sha256(path)}
        if actual != expected:
            raise ValueError(f"Input differs from frozen source pin: {name}")
        checked.append({"file": name, **actual})
    return checked


def rows(path):
    with path.open(newline="") as stream:
        reader = csv.DictReader(stream)
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError(f"Duplicate column names: {path.name}")
        yield from reader


def play_key(row):
    result = []
    for field in ("gameId", "playId"):
        value = number(row.get(field))
        if value is None or value != int(value):
            raise ValueError(f"Missing or fractional {field}")
        result.append(str(int(value)))
    return tuple(result)


def selection_reason(row):
    if row.get("playNullifiedByPenalty") != "N":
        return "nullifiedOrUnknownNullification"
    if row.get("isDropback") != "FALSE":
        return "dropbackOrUnknownDropback"
    if truth(row.get("qbKneel")):
        return "kneel"
    if truth(row.get("qbSpike")):
        return "spike"
    if row.get("rushLocationType", "NA") in MISSING:
        return "missingRunLocation"
    if number(row.get("yardsGained")) is None:
        return "missingMainYards"
    return None


def primary_label(row):
    value = row.get("pff_runConceptPrimary", "").strip()
    return value if value else "<missing>"


def secondary_value(row):
    value = row.get("pff_runConceptSecondary", "").strip()
    return value if value else "<missing>"


def secondary_tokens(row):
    value = secondary_value(row)
    if value in MISSING or value == "<missing>":
        return []
    return sorted(set(token.strip() for token in value.split(";") if token.strip()))


def is_sneak(row):
    return truth(row.get("qbSneak")) or primary_label(row) == "SNEAK"


def context(row):
    down, distance = number(row.get("down")), number(row.get("yardsToGo"))
    yardline = number(row.get("yardlineNumber"))
    if yardline is None or not 0 <= yardline <= 50:
        field = None
    elif yardline == 50:
        field = 50
    elif row.get("yardlineSide") == row.get("possessionTeam") and row.get("possessionTeam") not in MISSING:
        field = 100 - yardline
    elif row.get("yardlineSide") == row.get("defensiveTeam") and row.get("defensiveTeam") not in MISSING:
        field = yardline
    else:
        field = None
    distance_bin = "unknown" if distance is None or distance <= 0 else "1to3" if distance <= 3 else "4to7" if distance <= 7 else "8to10" if distance <= 10 else "11to19" if distance < 20 else "20plus"
    field_bin = "unknown" if field is None else "redZone0to20" if field <= 20 else "plus21to50" if field <= 50 else "own51to100"
    return {"down": int(down) if down in (1, 2, 3, 4) else "unknown", "distance": distance_bin, "field": field_bin}


def rate(numerator, denominator):
    return {"numerator": numerator, "denominator": denominator,
            "rate": round(numerator / denominator, 6) if denominator else None}


def outcome_summary(samples, field):
    values = [number(r.get(field)) for r in samples]
    values = [v for v in values if v is not None]
    known = len(values)
    conversion_n = conversion_yes = success_n = success_yes = 0
    for row in samples:
        gain, needed, down = number(row.get(field)), number(row.get("yardsToGo")), number(row.get("down"))
        if gain is None or needed is None or needed <= 0:
            continue
        conversion_n += 1
        conversion_yes += gain >= needed
        if down in (1, 2, 3, 4):
            success_n += 1
            threshold = .4 if down == 1 else .6 if down == 2 else 1
            success_yes += gain >= threshold * needed
    sorted_values = sorted(values)
    return {"known": known, "missing": len(samples) - known,
            "mean": round(statistics.mean(values), 6) if values else None,
            "median": statistics.median(values) if values else None,
            "p10": sorted_values[int(.1 * (known - 1))] if known else None,
            "p90": sorted_values[int(.9 * (known - 1))] if known else None,
            "positive": rate(sum(v > 0 for v in values), known),
            "negative": rate(sum(v < 0 for v in values), known),
            "zero": rate(sum(v == 0 for v in values), known),
            "stuff": rate(sum(v <= 0 for v in values), known),
            "tenPlus": rate(sum(v >= 10 for v in values), known),
            "twentyPlus": rate(sum(v >= 20 for v in values), known),
            "gainThresholdSuccess": rate(success_yes, success_n),
            "conversion": rate(conversion_yes, conversion_n)}


def aggregate(samples):
    paired = [(number(r.get("yardsGained")), number(r.get("prePenaltyYardsGained"))) for r in samples]
    both = [(a, b) for a, b in paired if a is not None and b is not None]
    penalty = [number(r.get("penaltyYards")) for r in samples]
    positions = Counter(r["_runnerPosition"] for r in samples)
    return {"plays": len(samples), "yardsGained": outcome_summary(samples, "yardsGained"),
            "prePenaltyYardsGained": outcome_summary(samples, "prePenaltyYardsGained"),
            "yardOperatorComparison": {"bothKnown": len(both), "different": sum(a != b for a, b in both),
                                       "meanMainMinusPrePenalty": round(statistics.mean(a - b for a, b in both), 6) if both else None},
            "penaltyYardsField": {"missing": sum(v is None for v in penalty), "zero": sum(v == 0 for v in penalty),
                                  "nonzero": sum(v is not None and v != 0 for v in penalty)},
            "runnerPositions": dict(sorted(positions.items()))}


def collect(directory):
    sources = verify_inputs(directory)
    available = {}
    for name in PINS:
        with (directory / name).open(newline="") as stream:
            available[name] = next(csv.reader(stream))
    positions = {}
    for row in rows(directory / "players.csv"):
        ident = row["nflId"]
        if ident in positions:
            raise ValueError("Duplicate roster nflId")
        positions[ident] = row.get("position", "")
    rushers = defaultdict(list)
    seen_player_rows = set()
    for row in rows(directory / "player_play.csv"):
        key = play_key(row)
        pair = key + (row["nflId"],)
        if pair in seen_player_rows:
            raise ValueError("Duplicate player/game/play row")
        seen_player_rows.add(pair)
        if truth(row.get("hadRushAttempt")):
            rushers[key].append(row["nflId"])
    selected, excluded, seen, disagreements = [], Counter(), set(), Counter()
    box_field = next((name for name in ("n_defenders_in_box", "defendersInBox") if name in available["plays.csv"]), None)
    for row in rows(directory / "plays.csv"):
        key = play_key(row)
        if key in seen:
            raise ValueError("Duplicate game/play metadata key")
        seen.add(key)
        reason = selection_reason(row)
        if reason:
            excluded[reason] += 1
            continue
        carriers = rushers[key]
        row["_runnerPosition"] = "<missing_rusher>" if not carriers else "<multiple_rushers>" if len(carriers) != 1 else positions.get(carriers[0]) or "<missing_position>"
        disagreements["flagAndPrimaryAgree" if truth(row.get("qbSneak")) == (primary_label(row) == "SNEAK") else "flagPrimaryDisagree"] += 1
        selected.append(row)
    primary, ordinary_primary, contexts, primary_context, raw_secondary, tokens, primary_secondary, teams, primary_team = (defaultdict(list) for _ in range(9))
    box, secondary_shape = defaultdict(list), Counter()
    for row in selected:
        label = primary_label(row)
        ctx = context(row)
        ctx_key = f"{ctx['down']}|{ctx['distance']}|{ctx['field']}"
        primary[label].append(row)
        team = row.get("possessionTeam") or "unknown"
        teams[team].append(row)
        primary_team[f"{label}|{team}"].append(row)
        if not is_sneak(row):
            ordinary_primary[label].append(row)
        contexts[ctx_key].append(row)
        primary_context[f"{label}|{ctx_key}"].append(row)
        value = secondary_value(row)
        raw_secondary[value].append(row)
        primary_secondary[f"{label}|{value}"].append(row)
        row_tokens = secondary_tokens(row)
        secondary_shape["missing" if not row_tokens else "compound" if ";" in value else "single"] += 1
        for token in row_tokens:
            tokens[token].append(row)
        if box_field:
            count = number(row.get(box_field))
            box[str(int(count)) if count is not None and count == int(count) and 0 <= count <= 11 else "unknown"].append(row)
    summaries = lambda grouped: {key: aggregate(value) for key, value in sorted(grouped.items())}
    support = lambda grouped: {"cells": len(grouped), "cellsWithN1to4": sum(1 <= len(v) <= 4 for v in grouped.values()),
                               "cellsWithN5to19": sum(5 <= len(v) <= 19 for v in grouped.values()),
                               "cellsWithN20to99": sum(20 <= len(v) <= 99 for v in grouped.values()),
                               "cellsWithN100plus": sum(len(v) >= 100 for v in grouped.values())}
    return {"schema": "bdb-run-outcome-context-v1", "querySha256": query_digest(), "sources": sources,
            "fieldAvailability": {"plays": available["plays.csv"], "boxCountField": box_field,
                                  "runConceptPrimary": "pff_runConceptPrimary" in available["plays.csv"],
                                  "runConceptSecondary": "pff_runConceptSecondary" in available["plays.csv"],
                                  "trackingUsed": False},
            "cohort": {"metadataRows": len(seen), "selectedRuns": len(selected), "excluded": dict(sorted(excluded.items())),
                       "sneakFlagPrimaryAgreement": dict(disagreements), "secondaryShapes": dict(secondary_shape)},
            "allRuns": aggregate(selected), "ordinaryRuns": aggregate([r for r in selected if not is_sneak(r)]),
            "qbSneaks": aggregate([r for r in selected if is_sneak(r)]),
            "byExactPrimary": summaries(primary), "byOrdinaryExactPrimary": summaries(ordinary_primary),
            "byPossessionTeam": summaries(teams), "byExactPrimaryAndTeam": summaries(primary_team),
            "byContext": summaries(contexts), "byExactPrimaryAndContext": summaries(primary_context),
            "byRawSecondaryValue": summaries(raw_secondary), "bySecondaryTokenOverlapping": summaries(tokens),
            "byExactPrimaryAndRawSecondary": summaries(primary_secondary),
            "byRecordedBoxCount": summaries(box),
            "cellSupport": {"primaryAndContext": support(primary_context), "primaryAndTeam": support(primary_team),
                            "primaryAndRawSecondary": support(primary_secondary)}, "query": QUERY}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path)
    parser.add_argument("--plan-only", type=Path)
    parser.add_argument("--query-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.plan_only:
        write_json(args.plan_only, receipt())
        print(f"Frozen query {query_digest()}; initial descriptive audit already occurred.")
        return
    if not args.directory or not args.query_receipt or not args.out:
        parser.error("Collection requires --directory, --query-receipt and --out")
    plan = json.loads(args.query_receipt.read_text())
    verify_receipt(plan)
    started = datetime.now(timezone.utc).isoformat()
    report = collect(args.directory)
    report.update({"declaredAt": plan["declaredAt"], "startedAt": started,
                   "finishedAt": datetime.now(timezone.utc).isoformat(),
                   "collectorSha256": sha256(__file__), "python": platform.python_version()})
    write_json(args.out, report)
    print(json.dumps({"out": str(args.out), "querySha256": query_digest(), "cohort": report["cohort"],
                      "ordinaryRuns": report["ordinaryRuns"]["plays"], "qbSneaks": report["qbSneaks"]["plays"]}))


if __name__ == "__main__":
    main()
