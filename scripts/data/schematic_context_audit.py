#!/usr/bin/env python3
"""Small offline situational references from pinned nflverse PBP and FTN.

Freeze definitions before inspecting results:
  python3 scripts/data/schematic_context_audit.py --plan-only out/context-plan.json
  python3 scripts/data/schematic_context_audit.py --query-receipt out/context-plan.json \
      --out out/schematic-context.json

This collects observations, not mental traits, playbook truth or fitted policy.
Only Python's standard library and the existing reference helper are required.
"""
import argparse
import hashlib
import importlib.util
import json
import platform
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HELPER_PATH = ROOT / "scripts/nflverse-reference.py"
spec = importlib.util.spec_from_file_location("context_nflverse_reference", HELPER_PATH)
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)

QUERY = {
    "schema": "schematic-context-query-v1",
    "seasons": [2022, 2023],
    "selection": "REG live pass/run rows; exclude kneels, spikes and two-point attempts. No-play and special-teams records are outside this observed scrimmage cohort.",
    "choice": "Observed dropbacks include sacks and scrambles; designed runs exclude scrambles. This is realized action, not the staff's hidden planned call or RPO alternative.",
    "penalties": "Calling/motion cohorts keep live rows with a penalty flag. Depth, screen and gain cohorts require penalty flag=false. Missing penalty flags do not become clean plays.",
    "targetDepth": "Clean actual throws, nonempty receiver_player_id and finite air_yards. Depth perpendicular to LOS, not total flight distance. Categories: below0,0toUnder10,10toUnder20,20plus.",
    "screen": "FTN is_screen_pass among clean matched observed dropbacks with a known label, including sacks/scrambles if labelled. Not all designed screens or a negative-air-yard proxy.",
    "motion": "FTN is_motion among matched live calling plays with a known label; retains live penalty rows. Motion occurred before or at snap; no route, speed or recognition inference.",
    "distanceBins": ["1to3", "4to7", "8to10", "11to19", "20plus", "unknown"],
    "fieldBins": ["redZone0to20", "plus21to50", "own51to100", "unknown"],
    "scoreBins": ["trailing9plus", "within8", "leading9plus", "unknown"],
    "clockBins": ["earlierRegulation", "last10minRegulation", "overtime", "unknown"],
    "downBins": [1, 2, 3, 4, "unknown"],
    "jointCells": ["season", "down", "distance", "field", "period", "score"],
    "standardization": "Compare trailing9plus and leading9plus within identical season/down/distance/field/period cells. Common weights are the sum of both groups' metric denominators in each retained cell. Retain cells with at least20 calling plays per group for dropback share, or10 metric observations per group for named-target depth, FTN motion and screens. Descriptive common-support comparison, not a causal effect.",
    "minimumSupport": {"observedDropback": 20, "deepNamedTarget": 10, "motion": 10, "screen": 10},
    "extremeWitness": "Third down with distance20plus; report observed calling, clean gain and conversion, not the called defensive rush/drop structure.",
    "inference": "No fitting, significance claim or engine accuracy test. Raw variation across team-seasons is descriptive, not a confidence interval; frame/player rows are not independent play samples.",
}
CONTEXT_FIELDS = ("season", "down", "distance", "field", "period", "score")
INPUT_NAMES = ("play_by_play_2022.csv.gz", "play_by_play_2023.csv.gz", "ftn_charting_2022.csv")


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def plan_digest():
    return hashlib.sha256(json.dumps(QUERY, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def query_receipt():
    return {"query": QUERY, "querySha256": plan_digest(), "collectorSha256": sha256(Path(__file__))}


def verify_inputs(raw_dir, manifest_path):
    manifest = json.loads(manifest_path.read_text())
    entries = {entry["name"]: entry for entry in manifest["files"]}
    checked = []
    for name in INPUT_NAMES:
        entry = entries[name]
        path = raw_dir / name
        actual = {"bytes": path.stat().st_size, "sha256": sha256(path)}
        if actual["bytes"] != entry["bytes"] or actual["sha256"] != entry["sha256"]:
            raise ValueError(f"Input does not match reviewed acquisition manifest: {name}")
        checked.append(dict(entry, verification="Actual local size and SHA-256 match acquisition snapshot."))
    return checked


def selection_reason(row):
    if row.get("season_type") != "REG":
        return "notRegularSeason"
    if row.get("play_type") not in ("pass", "run"):
        return "notLivePassRun"
    if reference.flag(row.get("qb_kneel")):
        return "kneel"
    if reference.flag(row.get("qb_spike")):
        return "spike"
    if reference.flag(row.get("two_point_attempt")):
        return "twoPointAttempt"
    if reference.classify(row) is None:
        return "noObservedActionClass"
    return None


def context(row):
    distance = reference.number(row.get("ydstogo"))
    field = reference.number(row.get("yardline_100"))
    score = reference.number(row.get("score_differential"))
    seconds = reference.number(row.get("game_seconds_remaining"))
    quarter = reference.number(row.get("qtr"))
    down = reference.number(row.get("down"))
    if distance is None or distance <= 0:
        distance_bin = "unknown"
    else:
        distance_bin = "1to3" if distance <= 3 else "4to7" if distance <= 7 else "8to10" if distance <= 10 else "11to19" if distance < 20 else "20plus"
    if field is None or not 0 <= field <= 100:
        field_bin = "unknown"
    else:
        field_bin = "redZone0to20" if field <= 20 else "plus21to50" if field <= 50 else "own51to100"
    score_bin = "unknown" if score is None else "trailing9plus" if score <= -9 else "leading9plus" if score >= 9 else "within8"
    if quarter is not None and quarter >= 5:
        period = "overtime"
    elif quarter in (1, 2, 3, 4) and seconds is not None and 0 <= seconds <= 3600:
        period = "last10minRegulation" if seconds <= 600 else "earlierRegulation"
    else:
        period = "unknown"
    return {"season": int(reference.number(row.get("season")) or 0),
            "down": int(down) if down in (1, 2, 3, 4) else "unknown",
            "distance": distance_bin, "field": field_bin, "period": period, "score": score_bin}


def depth(row):
    if not reference.is_throw(row) or not row.get("receiver_player_id", "").strip():
        return None
    return reference.number(row.get("air_yards"))


def depth_category(value):
    return "below0" if value < 0 else "0toUnder10" if value < 10 else "10toUnder20" if value < 20 else "20plus"


def index_chart(rows):
    indexed = {}
    for row in rows:
        key = reference.play_key(row, chart=True)
        if key in indexed:
            raise ValueError(f"Duplicate FTN game/play key: {key}")
        indexed[key] = row
    return indexed


class Aggregate:
    def __init__(self):
        self.counts = Counter()
        self.air = []
        self.gains = defaultdict(list)

    def add(self, row, chart=None):
        kind = reference.classify(row)
        self.counts["callingPlays"] += 1
        self.counts[kind] += 1
        penalty = reference.flag(row.get("penalty"))
        self.counts["penaltyFlagTrue" if penalty is True else "penaltyFlagMissing" if penalty is None else "cleanCallingPlays"] += 1
        if chart is not None:
            self.counts["matchedChartCallingPlays"] += 1
            motion = reference.flag(chart.get("is_motion"))
            if motion is not None:
                self.counts["motionKnown"] += 1
                self.counts["motionTrue"] += int(motion)
        if penalty is not False:
            return
        self.counts["clean" + kind[0].upper() + kind[1:]] += 1
        gain = reference.number(row.get("yards_gained"))
        needed = reference.number(row.get("ydstogo"))
        if gain is not None:
            self.gains[kind].append(gain)
        if gain is not None and needed is not None and needed > 0:
            self.counts[kind + "ConversionKnown"] += 1
            self.counts[kind + "Converted"] += int(gain >= needed)
        if kind != "dropback":
            return
        if chart is not None:
            self.counts["matchedCleanChartDropbacks"] += 1
            screen = reference.flag(chart.get("is_screen_pass"))
            if screen is not None:
                self.counts["screenKnown"] += 1
                self.counts["screenTrue"] += int(screen)
        if reference.is_throw(row):
            self.counts["cleanThrows"] += 1
            value = depth(row)
            if value is not None:
                self.air.append(value)
                self.counts["namedTargetKnownDepth"] += 1
                self.counts["depth_" + depth_category(value)] += 1

    def metric(self, name):
        numerator, denominator = {
            "observedDropback": ("dropback", "callingPlays"),
            "deepNamedTarget": ("depth_20plus", "namedTargetKnownDepth"),
            "motion": ("motionTrue", "motionKnown"),
            "screen": ("screenTrue", "screenKnown"),
        }[name]
        return self.counts[numerator], self.counts[denominator]

    def result(self):
        return {
            "counts": dict(sorted(self.counts.items())),
            "observedDropbackShare": reference.rate(*self.metric("observedDropback")),
            "deepShareOfNamedTargetsWithKnownDepth": reference.rate(*self.metric("deepNamedTarget")),
            "namedTargetAirYards": reference.distribution(self.air),
            "ftnMotionAmongKnownMatchedCallingPlays": reference.rate(*self.metric("motion")),
            "ftnScreenAmongKnownMatchedCleanDropbacks": reference.rate(*self.metric("screen")),
            "cleanGains": {kind: reference.distribution(values) for kind, values in sorted(self.gains.items())},
            "cleanDistanceConversions": {kind: reference.rate(self.counts[kind + "Converted"], self.counts[kind + "ConversionKnown"])
                                         for kind in ("designedRun", "dropback")},
        }


def score_standardization(cells, metric, minimum=None):
    minimum = QUERY["minimumSupport"][metric] if minimum is None else minimum
    groups = defaultdict(dict)
    for key, aggregate in cells.items():
        if key[-1] in ("trailing9plus", "leading9plus"):
            groups[key[:-1]][key[-1]] = aggregate
    retained = []
    for key, pair in sorted(groups.items(), key=lambda item: tuple(map(str, item[0]))):
        if set(pair) != {"trailing9plus", "leading9plus"}:
            continue
        trail = pair["trailing9plus"].metric(metric)
        lead = pair["leading9plus"].metric(metric)
        if min(trail[1], lead[1]) < minimum:
            continue
        retained.append({"context": dict(zip(CONTEXT_FIELDS[:-1], key)),
                         "trailing": reference.rate(*trail), "leading": reference.rate(*lead),
                         "weightCount": trail[1] + lead[1]})
    total = sum(row["weightCount"] for row in retained)
    trail_pct = sum(row["weightCount"] * row["trailing"]["percent"] for row in retained) / total if total else None
    lead_pct = sum(row["weightCount"] * row["leading"]["percent"] for row in retained) / total if total else None
    return {"metric": metric, "minimumPerGroupPerCell": minimum, "candidateCells": len(groups),
            "retainedCells": len(retained), "weightDenominator": total,
            "trailingIncludedObservations": sum(row["trailing"]["denominator"] for row in retained),
            "leadingIncludedObservations": sum(row["leading"]["denominator"] for row in retained),
            "standardizedTrailingPercent": trail_pct, "standardizedLeadingPercent": lead_pct,
            "differencePercentagePoints": trail_pct - lead_pct if total else None, "cells": retained}


def collect(raw_dir, manifest_path):
    checked = verify_inputs(raw_dir, manifest_path)
    charts = index_chart(reference.read_csv(raw_dir / "ftn_charting_2022.csv"))
    cells = defaultdict(Aggregate)
    margins = defaultdict(Aggregate)
    score_period = defaultdict(Aggregate)
    team_seasons = defaultdict(Aggregate)
    pooled = Aggregate()
    extremes = defaultdict(Aggregate)
    counts = Counter()
    exclusions = Counter()
    seen = set()
    unknown = Counter()
    for season in QUERY["seasons"]:
        for row in reference.read_csv(raw_dir / f"play_by_play_{season}.csv.gz"):
            counts[f"rawPbpRows{season}"] += 1
            reason = selection_reason(row)
            if reason is not None:
                exclusions[reason] += 1
                continue
            key = reference.play_key(row)
            if key in seen:
                raise ValueError(f"Duplicate selected PBP game/play key: {key}")
            seen.add(key)
            counts[f"selectedCallingPlays{season}"] += 1
            c = context(row)
            for field, value in c.items():
                if value == "unknown":
                    unknown[field] += 1
            chart = charts.get(key) if season == 2022 else None
            counts["matchedChartCallingPlays2022" if chart is not None else "unmatchedChartCallingPlays2022" if season == 2022 else "noFtnSnapshotFor2023"] += 1
            pooled.add(row, chart)
            cells[tuple(c[field] for field in CONTEXT_FIELDS)].add(row, chart)
            for field, value in c.items():
                margins[(field, value)].add(row, chart)
            score_period[(c["season"], c["period"], c["score"])].add(row, chart)
            team_seasons[(season, row["posteam"])].add(row, chart)
            if c["down"] == 3 and c["distance"] == "20plus":
                extremes[season].add(row, chart)
    ordered = lambda items: sorted(items, key=lambda item: tuple(map(str, item[0])) if isinstance(item[0], tuple) else str(item[0]))
    return {
        "schema": "schematic-context-reference-v1", "query": QUERY, "querySha256": plan_digest(),
        "source": {"acquisitionManifest": str(manifest_path.relative_to(ROOT)) if manifest_path.is_relative_to(ROOT) else str(manifest_path),
                   "acquisitionManifestSha256": sha256(manifest_path), "inputs": checked,
                   "collectorSha256": sha256(Path(__file__)), "referenceHelperSha256": sha256(HELPER_PATH),
                   "python": platform.python_version(),
                   "attribution": "FTN Data via nflverse; derived FTN charting aggregates: CC-BY-SA 4.0. Other PBP fields retain NFL/nflfastR lineage."},
        "cohort": {"counts": dict(sorted(counts.items())), "exclusions": dict(sorted(exclusions.items())),
                   "unknownContextCounts": dict(sorted(unknown.items())), "rawFtnChartRows": len(charts),
                   "note": "Exact game/play joins; 2023 FTN is absent from this pinned snapshot, not zero motion or screens."},
        "pooled": pooled.result(),
        "margins": [{"dimension": key[0], "value": key[1], **aggregate.result()} for key, aggregate in ordered(margins.items())],
        "scorePeriod": [{"season": key[0], "period": key[1], "score": key[2], **aggregate.result()} for key, aggregate in ordered(score_period.items())],
        "jointCells": [{"context": dict(zip(CONTEXT_FIELDS, key)), **aggregate.result()} for key, aggregate in ordered(cells.items())],
        "standardizedScoreContrasts": {name: score_standardization(cells, name) for name in QUERY["minimumSupport"]},
        "thirdAnd20Plus": [{"season": season, **aggregate.result()} for season, aggregate in sorted(extremes.items())],
        "teamSeason": [{"season": key[0], "team": key[1], **aggregate.result()} for key, aggregate in ordered(team_seasons.items())],
        "teamSeasonObservedDropbackPercentDistribution": reference.distribution(
            aggregate.result()["observedDropbackShare"]["percent"] for aggregate in team_seasons.values()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data/raw/nflverse")
    parser.add_argument("--manifest", type=Path, default=ROOT / "data/reviews/nflverse/input-manifest.json")
    parser.add_argument("--plan-only", type=Path)
    parser.add_argument("--query-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.plan_only:
        args.plan_only.parent.mkdir(parents=True, exist_ok=True)
        args.plan_only.write_text(json.dumps(dict(query_receipt(), declaredAtUtc=datetime.now(timezone.utc).isoformat()), indent=2) + "\n")
        print(json.dumps({"plan": str(args.plan_only), "querySha256": plan_digest()}))
        return
    if args.out is None or args.query_receipt is None:
        parser.error("--out and a predeclared --query-receipt are required")
    declared = json.loads(args.query_receipt.read_text())
    if {key: declared.get(key) for key in query_receipt()} != query_receipt():
        raise ValueError("Query or collector differs from predeclared receipt; preserve the prior receipt and explicitly declare a new analysis.")
    report = collect(args.raw_dir.resolve(), args.manifest.resolve())
    report["source"]["queryReceiptSha256"] = sha256(args.query_receipt)
    report["source"]["queryDeclaredAtUtc"] = declared.get("declaredAtUtc")
    report["source"]["collectedAtUtc"] = datetime.now(timezone.utc).isoformat()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"report": str(args.out), "querySha256": report["querySha256"],
                      "selectedCallingPlays": report["pooled"]["counts"]["callingPlays"],
                      "jointCells": len(report["jointCells"])}))


if __name__ == "__main__":
    main()
