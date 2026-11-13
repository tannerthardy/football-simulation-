#!/usr/bin/env python3
"""Offline rushing distributions from the already pinned nflverse snapshot.

Freeze an operator/query receipt before collection; no downloads or engine fits.
"""
import argparse
import hashlib
import importlib.util
import json
import math
import platform
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HELPER_PATH = ROOT / "scripts/nflverse-reference.py"
CONTEXT_PATH = ROOT / "scripts/data/schematic_context_audit.py"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


reference = load_module("run_outcome_reference", HELPER_PATH)
context_audit = load_module("run_outcome_context_helper", CONTEXT_PATH)
INPUT_NAMES = ("play_by_play_2022.csv.gz", "play_by_play_2023.csv.gz",
               "roster_2022.csv", "roster_2023.csv", "ftn_charting_2022.csv")
QUERY = {
    "schema": "run-outcome-context-query-v1",
    "seasons": [2022, 2023],
    "selection": "Same REG/live pass-run and kneel/spike/two-point exclusions as schematic_context_audit. Designed runs exclude scrambles; scramble means qb_scramble=true, rush_attempt=true and observed dropback. Retain all runner positions and touchdowns/fumbles; do not infer the original RPO call.",
    "outcomes": "Require penalty=false and finite yards_gained. Live flagged/missing-flag runs are counted separately. This is an explicit penalty-flag filter, not reconstructed acceptance/enforcement.",
    "gains": "Whole-play yards_gained, not individual rushing_yards. Report interpolated p10/p25/p50/p75/p90/p95/p99, mean/max, disjoint bins below0/zero/positiveUnder4/4toUnder7/7toUnder10/10toUnder20/20plus, negative<0, stuff<=0,10plus,20plus.",
    "success": "Known positive ydstogo and down1-4: gain>=40% on first,60% on second,100% on third/fourth. Separately report gain>=ydstogo, recorded first_down_rush or rush_touchdown, and positive model-derived EPA. Turnovers retain their gain but have separate recorded fumble_lost and distance-gain-without-turnover counts.",
    "explosiveGeometry": "10+/20+ all-run rates plus eligible-field rates where yardline_100>=10/>=20 respectively. Excludes no touchdowns; geometry-conditioned rates are still selected mixtures, not NFL targets.",
    "carrier": "Exact season+rusher_player_id match to season roster gsis_id; QB, RB/FB, other or unknown. Roster position is not snap role. Conflicting listed positions for an identity remain ambiguous/unknown rather than guessed.",
    "context": "Reuse schematic pilot down,distance1to3/4to7/8to10/11to19/20plus, field0to20/21to50/51to100, scoretrailing9plus/within8/leading9plus, regulation-last600s vs earlier/overtime/unknown. Retain all thin cells and actual n.",
    "jointCells": ["season", "kind", "down", "distance", "field"],
    "margins": ["down", "distance", "field", "score", "period", "carrier", "run_location", "run_gap"],
    "chart2022": "Exact FTN game/play join. Separate known boolean QB sneak,motion,RPO strata and known integer0-11 n_defense_box strata<=5/6/7/8plus. Box count is charted presentation, never a called Over/Under/Odd/Tite/Bear front. Missing2023 charting is unavailable, not false/zero.",
    "boxContextCells": ["kind", "carrier", "down", "distance", "field", "box"],
    "witnesses": "Third and20plus; exact third-and27; ordinary RB/FB designed runs on down1/2,distance8to10,outside redzone,within8,earlier regulation. Declared before outcomes; witnesses never imply identified concepts/fronts.",
    "variation": "Describe 64 team-season designed-run distributions and their metric percentiles. Observed roster/opponent/game-script mixture, not confidence intervals, independent trials or generated-roster limits.",
    "limitations": "PBP has no blocking concept, all-22 front, contact force, tackle control or yards-before-contact field. Run_location/run_gap describe observed direction/location, not blocking scheme. No causal score/box effects, significance test or physical calibration.",
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def query_digest():
    return hashlib.sha256(json.dumps(QUERY, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def receipt():
    return {"query": QUERY, "querySha256": query_digest(),
            "collectorSha256": sha256(Path(__file__)),
            "helperSha256": sha256(HELPER_PATH), "contextHelperSha256": sha256(CONTEXT_PATH)}


def verify_inputs(raw_dir, manifest_path):
    entries = {e["name"]: e for e in json.loads(manifest_path.read_text())["files"]}
    checked = []
    for name in INPUT_NAMES:
        path = raw_dir / name
        entry = entries[name]
        if path.stat().st_size != entry["bytes"] or sha256(path) != entry["sha256"]:
            raise ValueError(f"Source differs from acquisition snapshot: {name}")
        checked.append(dict(entry, verifiedLocalSizeAndSha256=True))
    return checked


def roster_positions(rows):
    candidates = defaultdict(set)
    for row in rows:
        identity = row.get("gsis_id", "").strip()
        if identity:
            candidates[identity].add(row.get("position", "").strip())
    return {identity: next(iter(positions)) if len(positions) == 1 else None
            for identity, positions in candidates.items()}


def carrier_group(row, positions):
    position = positions.get(row.get("rusher_player_id", ""))
    return "QB" if position == "QB" else "RB_FB" if position in ("RB", "FB") else "other" if position else "unknown"


def run_kind(row):
    if context_audit.selection_reason(row) is not None:
        return None
    observed = reference.classify(row)
    if reference.flag(row.get("qb_scramble")) is True:
        return "scramble" if observed == "dropback" and reference.flag(row.get("rush_attempt")) is True else None
    return "designedRun" if observed == "designedRun" else None


def box_label(chart):
    value = reference.number(chart.get("n_defense_box")) if chart else None
    if value is None or value != int(value) or not 0 <= value <= 11:
        return "unknown"
    return "5orFewer" if value <= 5 else "6" if value == 6 else "7" if value == 7 else "8plus"


def gain_bin(gain):
    return "negative" if gain < 0 else "zero" if gain == 0 else "positiveUnder4" if gain < 4 else "4toUnder7" if gain < 7 else "7toUnder10" if gain < 10 else "10toUnder20" if gain < 20 else "20plus"


def distribution(values):
    xs = sorted(values)
    result = {"n": len(xs), "mean": sum(xs) / len(xs) if xs else None, "max": xs[-1] if xs else None}
    for percentile in (10, 25, 50, 75, 90, 95, 99):
        index = percentile / 100 * (len(xs) - 1)
        lo = math.floor(index)
        result[f"p{percentile}"] = (xs[lo] + (xs[min(lo + 1, len(xs) - 1)] - xs[lo]) * (index - lo)) if xs else None
    return result


class Aggregate:
    def __init__(self):
        self.counts = Counter()
        self.gains = []
        self.epa = []

    def add(self, row):
        self.counts["observedRuns"] += 1
        penalty = reference.flag(row.get("penalty"))
        if penalty is not False:
            self.counts["penaltyFlagTrue" if penalty is True else "penaltyFlagMissing"] += 1
            return
        self.counts["penaltyFlagFalse"] += 1
        gained = reference.number(row.get("yards_gained"))
        if gained is None:
            self.counts["missingGain"] += 1
            return
        self.gains.append(gained)
        self.counts["gainKnown"] += 1
        self.counts["gainBin_" + gain_bin(gained)] += 1
        for key, truth in (("negative", gained < 0), ("zero", gained == 0), ("stuff", gained <= 0),
                           ("explosive10plus", gained >= 10), ("explosive20plus", gained >= 20)):
            self.counts[key] += int(truth)
        distance, down = reference.number(row.get("ydstogo")), reference.number(row.get("down"))
        fumble = reference.flag(row.get("fumble_lost"))
        if fumble is not None:
            self.counts["fumbleLostKnown"] += 1
            self.counts["fumbleLost"] += int(fumble)
        if down in (1, 2, 3, 4) and distance is not None and distance > 0:
            self.counts["successKnown"] += 1
            self.counts["success4060100"] += int(gained >= distance * (.4 if down == 1 else .6 if down == 2 else 1))
            self.counts["gainDistanceConversion"] += int(gained >= distance)
            if fumble is not None:
                self.counts["distanceConversionTurnoverKnown"] += 1
                self.counts["gainDistanceWithoutLostFumble"] += int(gained >= distance and not fumble)
        first, td = reference.flag(row.get("first_down_rush")), reference.flag(row.get("rush_touchdown"))
        if first is not None and td is not None:
            self.counts["recordedFirstOrTDKnown"] += 1
            self.counts["recordedFirstOrTD"] += int(first or td)
        if td is not None:
            self.counts["touchdownKnown"] += 1
            self.counts["touchdown"] += int(td)
        epa = reference.number(row.get("epa"))
        if epa is not None:
            self.epa.append(epa)
            self.counts["epaKnown"] += 1
            self.counts["positiveEPA"] += int(epa > 0)
        field = reference.number(row.get("yardline_100"))
        for threshold in (10, 20):
            if field is not None and threshold <= field <= 100:
                self.counts[f"fieldEligible{threshold}"] += 1
                self.counts[f"fieldEligibleExplosive{threshold}"] += int(gained >= threshold)

    def result(self):
        pairs = {"negative": ("negative", "gainKnown"), "zero": ("zero", "gainKnown"),
                 "stuff": ("stuff", "gainKnown"), "explosive10plus": ("explosive10plus", "gainKnown"),
                 "explosive20plus": ("explosive20plus", "gainKnown"),
                 "success4060100": ("success4060100", "successKnown"),
                 "gainDistanceConversion": ("gainDistanceConversion", "successKnown"),
                 "gainDistanceWithoutLostFumble": ("gainDistanceWithoutLostFumble", "distanceConversionTurnoverKnown"),
                 "recordedFirstOrTD": ("recordedFirstOrTD", "recordedFirstOrTDKnown"),
                 "fumbleLost": ("fumbleLost", "fumbleLostKnown"), "touchdown": ("touchdown", "touchdownKnown"),
                 "positiveEPA": ("positiveEPA", "epaKnown"),
                 "fieldEligibleExplosive10plus": ("fieldEligibleExplosive10", "fieldEligible10"),
                 "fieldEligibleExplosive20plus": ("fieldEligibleExplosive20", "fieldEligible20")}
        return {"counts": dict(sorted(self.counts.items())), "yards": distribution(self.gains),
                "epa": distribution(self.epa),
                "rates": {key: reference.rate(self.counts[n], self.counts[d]) for key, (n, d) in pairs.items()}}


def collect(raw_dir, manifest_path):
    sources = verify_inputs(raw_dir, manifest_path)
    charts = context_audit.index_chart(reference.read_csv(raw_dir / "ftn_charting_2022.csv"))
    overall, by_season, margins, cells, score_period, teams, chart_strata, box_cells, witnesses = (defaultdict(Aggregate) for _ in range(9))
    audit = Counter()
    for season in QUERY["seasons"]:
        positions = roster_positions(reference.read_csv(raw_dir / f"roster_{season}.csv"))
        seen = set()
        for row in reference.read_csv(raw_dir / f"play_by_play_{season}.csv.gz"):
            audit["rawPbpRows"] += 1
            reason = context_audit.selection_reason(row)
            if reason:
                audit["excluded_" + reason] += 1
                continue
            key = reference.play_key(row)
            if key in seen:
                raise ValueError(f"Duplicate selected PBP game/play key: {key}")
            seen.add(key)
            audit["callingPlays"] += 1
            kind = run_kind(row)
            if kind is None:
                audit["otherObservedDropbacks"] += 1
                continue
            audit[kind] += 1
            ctx = context_audit.context(row)
            carrier = carrier_group(row, positions)
            overall[kind].add(row)
            by_season[(season, kind)].add(row)
            teams[(season, row["posteam"], kind)].add(row)
            cells[tuple(ctx[f] for f in ("season",)) + (kind,) + tuple(ctx[f] for f in ("down", "distance", "field"))].add(row)
            score_period[(season, kind, ctx["score"], ctx["period"])].add(row)
            for field in QUERY["margins"]:
                value = carrier if field == "carrier" else row.get(field, "").strip() or "unknown" if field in ("run_location", "run_gap") else ctx[field]
                margins[(kind, field, value)].add(row)
            if ctx["down"] == 3 and ctx["distance"] == "20plus":
                witnesses[(season, kind, "third20plus")].add(row)
            if ctx["down"] == 3 and reference.number(row.get("ydstogo")) == 27:
                witnesses[(season, kind, "thirdExactly27")].add(row)
            if (kind == "designedRun" and carrier == "RB_FB" and ctx["down"] in (1, 2)
                    and ctx["distance"] == "8to10" and ctx["field"] in ("plus21to50", "own51to100")
                    and ctx["score"] == "within8" and ctx["period"] == "earlierRegulation"):
                witnesses[(season, kind, "ordinaryBackRunContext")].add(row)
            if season != 2022:
                audit["runRowsWithoutAvailableChartSeason"] += 1
                continue
            chart = charts.get(key)
            if chart is None:
                audit["runRowsMissing2022ChartMatch"] += 1
                continue
            audit["matched2022RunRows"] += 1
            box = box_label(chart)
            chart_strata[(kind, "box", box)].add(row)
            box_cells[(kind, carrier, ctx["down"], ctx["distance"], ctx["field"], box)].add(row)
            for field in ("is_qb_sneak", "is_motion", "is_rpo"):
                flag = reference.flag(chart.get(field))
                chart_strata[(kind, field, "true" if flag is True else "false" if flag is False else "unknown")].add(row)
    def rows(groups, names):
        return [{"context": dict(zip(names, key)), **agg.result()}
                for key, agg in sorted(groups.items(), key=lambda kv: tuple(map(str, kv[0])))]
    team_rows = rows(teams, ("season", "team", "kind"))
    ranges = {}
    for kind in overall:
        selected = [r for r in team_rows if r["context"]["kind"] == kind]
        ranges[kind] = {"teamSeasons": len(selected), "cleanRunCount": distribution([r["yards"]["n"] for r in selected]),
                        "meanYards": distribution([r["yards"]["mean"] for r in selected if r["yards"]["mean"] is not None]),
                        **{metric + "Percent": distribution([r["rates"][metric]["percent"] for r in selected if r["rates"][metric]["percent"] is not None])
                           for metric in ("stuff", "explosive10plus", "explosive20plus", "success4060100")}}
    return {"schema": "run-outcome-context-v1", "provenance": {"sources": sources,
            "acquisitionManifest": str(manifest_path.relative_to(ROOT)) if manifest_path.is_relative_to(ROOT) else str(manifest_path),
            "acquisitionManifestSha256": sha256(manifest_path), "python": platform.python_version(), **receipt()},
            "audit": dict(sorted(audit.items())), "overall": {k: v.result() for k, v in sorted(overall.items())},
            "seasons": rows(by_season, ("season", "kind")), "margins": rows(margins, ("kind", "dimension", "value")),
            "jointCells": rows(cells, QUERY["jointCells"]), "scorePeriod": rows(score_period, ("season", "kind", "score", "period")),
            "chart2022Strata": rows(chart_strata, ("kind", "dimension", "value")),
            "box2022Cells": rows(box_cells, QUERY["boxContextCells"]), "witnesses": rows(witnesses, ("season", "kind", "witness")),
            "teamSeasons": team_rows, "teamSeasonRanges": ranges}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data/raw/nflverse")
    parser.add_argument("--manifest", type=Path, default=ROOT / "data/reviews/nflverse/input-manifest.json")
    parser.add_argument("--plan-only", type=Path)
    parser.add_argument("--query-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    if args.plan_only:
        data = {**receipt(), "declaredAtUtc": datetime.now(timezone.utc).isoformat()}
        path = args.plan_only
    else:
        if not args.query_receipt or not args.out:
            parser.error("Declare --plan-only first; then use --query-receipt and --out")
        plan = json.loads(args.query_receipt.read_text())
        if any(plan.get(key) != value for key, value in receipt().items()):
            raise ValueError("Query/operator bytes differ from pre-collection receipt")
        data = collect(args.raw_dir, args.manifest)
        data["declaredAtUtc"] = plan["declaredAtUtc"]
        data["collectedAtUtc"] = datetime.now(timezone.utc).isoformat()
        path = args.out
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"output": str(path), "querySha256": query_digest(), "audit": data.get("audit")}))


if __name__ == "__main__":
    main()
