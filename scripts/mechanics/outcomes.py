#!/usr/bin/env python3
"""Offline native-game outcomes, using the existing NFL and tracking operators.

python3 scripts/mechanics/outcomes.py --outcomes out/outcomes101.json \
    --tracking out/plays101.jsonl.gz --reference out/reference.json --out out/outcome-review.json
No engine parameters, downloads, inferred EPA, or causal accuracy attribution.
"""
import argparse
import gzip
import hashlib
import importlib.util
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


nfl = load("native_outcome_nfl", "scripts/mechanics/nfl-outcomes.py")
run, ref = nfl.run, nfl.ref
tracking = load("native_outcome_tracking", "scripts/mechanics/metrics.py")
number, flag, rate, flag_rate = ref.number, ref.flag, ref.rate, nfl.flag_rate
CATEGORIES = ("interception", "completion", "drop", "pbu", "throwaway", "otherIncomplete")


def pin(path):
    return {"path": str(path), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def adapt(play, game, positions):
    """Map native facts to nflverse action fields; never defensive return yards."""
    stats, events = play.get("stats") or {}, {e["type"] for e in play.get("events", [])}
    recorded_int = bool(stats.get("interceptedBy")) or "interception" in events
    sack, scramble = flag(stats.get("sacked")), flag(stats.get("scramble"))
    attempted = (flag(stats.get("attempted")) is True and not sack and not scramble
                 and bool(events & {"throw", "throwaway"}))
    interception = attempted and recorded_int
    complete = attempted and not interception and flag(stats.get("completed")) is True
    incomplete = attempted and not interception and not complete and bool(events & {"incomplete", "drop", "pbu"})
    own_td = (None if "touchdown" in events and play.get("touchdownTeam") not in ("O", "D")
              else play.get("touchdownTeam") == "O")
    # A subsequent offensive fumble recovery TD need not be a passing/rushing TD.
    specific_td = None if own_td is None or own_td and stats.get("fumbledBy") else own_td
    score, offense = play.get("score") or {}, play.get("offense")
    home, away = number(score.get("home")), number(score.get("away"))
    score_diff = None if home is None or away is None or offense not in (game["home"], game["away"]) else (home-away) * (1 if offense == game["home"] else -1)
    quarter, clock = number(play.get("quarter")), number(play.get("clock"))
    seconds = (4-quarter)*900 + clock if quarter in (1, 2, 3, 4) and clock is not None else None
    yardline = number(play.get("yardline"))
    row = {"game_id": str(play["gameSeed"]), "play_id": play["index"], "season_type": "REG",
           "play_type": play["kind"], "qb_kneel": False, "qb_spike": False, "two_point_attempt": False,
           "qb_dropback": play["kind"] == "pass", "pass_attempt": attempted,
           "rush_attempt": play["kind"] == "run" or scramble is True, "qb_scramble": scramble,
           "sack": sack, "complete_pass": complete, "incomplete_pass": incomplete, "interception": interception,
           "penalty": bool(play.get("nullified") or play.get("foul")),
           "yards_gained": number(play.get("yards")), "yards_after_catch": number(stats.get("yac")),
           "air_yards": number(stats.get("airYards")), "receiver_player_id": stats.get("target"),
           "down": play.get("down"), "ydstogo": play.get("distance"),
           "yardline_100": None if yardline is None else 100-yardline,
           "qtr": quarter, "game_seconds_remaining": seconds, "score_differential": score_diff,
           "pass_touchdown": specific_td if attempted else False,
           "rush_touchdown": specific_td if play["kind"] == "run" or scramble is True else False,
           "nativeOffensiveTD": own_td, "nativePressured": flag(stats.get("pressured")),
           "carrierGroup": "RB_FB" if positions.get(stats.get("rusher")) in ("RB", "FB") else "QB" if positions.get(stats.get("rusher")) == "QB" else "unknown",
           "id": play["id"], "posteam": offense, "plan": play.get("plan") or {}}
    row["category"] = ("interception" if interception else "completion" if complete else "drop" if stats.get("dropped") or "drop" in events else "pbu" if stats.get("passDefendedBy") or "pbu" in events else "throwaway" if stats.get("throwaway") or "throwaway" in events else "otherIncomplete")
    return row


def outcomes(rows):
    result = nfl.outcomes(rows)
    db = [r for r in rows if ref.classify(r) == "dropback"]
    throws = [r for r in db if ref.is_throw(r)]
    categories = Counter(r["category"] for r in throws)
    incomplete_n = len(throws)-result["completions"]-categories["interception"]
    result.update({"offensiveTDPerDropback": flag_rate(db, "nativeOffensiveTD"),
        "unclassifiedDropbacks": len(db)-len(throws)-sum(flag(r["sack"]) is True or flag(r["qb_scramble"]) is True for r in db),
        "unclassifiedDropbackIds": [r["id"] for r in db if not ref.is_throw(r) and not flag(r["sack"]) and not flag(r["qb_scramble"])],
        "finalOutcomes": {key: rate(categories[key], len(throws)) for key in CATEGORIES},
        "nonInterceptionIncompletions": incomplete_n, "dropShareOfIncompletions": rate(categories["drop"], incomplete_n)})
    for key in ("dropback", "throw", "completionGain", "designedRun", "designedRB_FB", "scramble"):
        result[key]["success4060100"]["missing"] = result[key]["plays"]-result[key]["success4060100"]["denominator"]
    result["wholePlayYardsPerThrow"] = result["throw"]["yards"]["mean"]
    result["wholePlayYardsPerCompletion"] = result["completionGain"]["yards"]["mean"]
    assert sum(categories.values()) == len(throws)
    return result


def pressure_association(rows):
    db = [r for r in rows if ref.classify(r) == "dropback"]
    return {field: {"rate": flag_rate(db, field), "groups": {
        label: outcomes([r for r in db if flag(r.get(field)) is value])
        for label, value in (("false", False), ("true", True), ("unknown", None))}}
        for field in ("geometricPressure", "nativePressured")}


def geometric_pressure(raw):
    """Preserve the shared pressure operator's unknown value in outcome groups."""
    play = tracking.Play(raw)
    qbs = play.who("O", "QB")
    value = play.pressure(qbs[0]).value if qbs else None
    return bool(value) if value is not None else None


def cells(rows, nfl_cells):
    grouped = defaultdict(list)
    for row in rows:
        ctx = run.context(row, row["carrierGroup"])
        grouped[(ctx["down"], ctx["distance"], ctx["field"])].append(row)
    return [{**dict(zip(("down", "distance", "field"), key)), "sparse": len(group) < 40,
             "outcomes": outcomes(group), "referenceCells": [{"season": n["season"], "sparse": n["sparse"],
                "outcomes": {k: n["cleanOutcomes"][k] for k in ("plays", "throws", "completions", "completion", "interception", "sackPerDropback", "twentyYardCompletionPerThrow")},
                "gainAndSuccess": {k: {"yards": n["cleanOutcomes"][k]["yards"], "success4060100": n["cleanOutcomes"][k]["success4060100"]}
                    for k in ("dropback", "completionGain", "designedRun")}} for n in nfl_cells
                if (n["down"], n["distance"], n["field"]) == key]}
            for key, group in sorted(grouped.items(), key=lambda item: str(item[0]))]


def standardize(native_panels, reference_report):
    """Descriptive common-support means/rates; never average quantiles."""
    if not reference_report.get("conditionalCells") or "pooled" not in reference_report:
        return {"available": False, "reason": "Supply an outcome reference with conditional cells"}
    paths = {"completion": ("completion",), "interception": ("interception",), "sackPerDropback": ("sackPerDropback",),
        "twentyYardCompletionPerThrow": ("twentyYardCompletionPerThrow",), "runSuccess4060100": ("designedRun", "success4060100"),
        "completionYards": ("completionGain", "yards"), "completedYAC": ("completedYAC",), "yardsPerThrow": ("throw", "yards")}
    def stat(summary, path):
        value = summary
        for field in path:
            value = value[field]
        n = value["denominator"] if "denominator" in value else value["n"]
        return n, value["count"] if "count" in value else n * value["mean"] if n else 0
    def key(cell):
        return cell["down"], cell["distance"], cell["field"]
    panels = {}
    for label, native_cells, native_summary in native_panels:
        panels[label] = {}
        for metric, path in paths.items():
            pooled_nfl = defaultdict(lambda: [0, 0])
            for cell in reference_report["conditionalCells"]:
                n, total = stat(cell["cleanOutcomes"], path)
                pooled_nfl[key(cell)][0] += n
                pooled_nfl[key(cell)][1] += total
            matched, excluded = [], Counter()
            for cell in native_cells:
                k = key(cell)
                sn, st = stat(cell["outcomes"], path)
                nn, nt = pooled_nfl[k]
                reason = "unknownContext" if "unknown" in k else "nativeTooThin" if sn < 20 else "nflTooThin" if nn < 100 else None
                if reason:
                    excluded[reason] += sn
                else:
                    matched.append({"down": k[0], "distance": k[1], "field": k[2], "nativeN": sn, "nativeTotal": st, "nflN": nn, "nflTotal": nt})
            sn, nn = sum(c["nativeN"] for c in matched), sum(c["nflN"] for c in matched)
            sa, st = stat(native_summary, path)
            na, nt = stat(reference_report["pooled"], path)
            for cell in matched:
                cell["weight"] = cell["nflN"] / nn
            panels[label][metric] = {"metric": metric, "units": "yards" if metric in ("completionYards", "completedYAC", "yardsPerThrow") else "fraction",
                "nativeAllKnown": sa, "nflAllKnown": na, "nativeMatchedKnown": sn, "nflMatchedKnown": nn,
                "nativeMatchedShare": sn/sa if sa else None, "nflMatchedShare": nn/na if na else None,
                "rawAllNative": st/sa if sa else None, "rawAllNFL": nt/na if na else None,
                "rawIncludedNative": sum(c["nativeTotal"] for c in matched)/sn if sn else None,
                "rawIncludedNFL": sum(c["nflTotal"] for c in matched)/nn if nn else None,
                "standardizedNative": sum(c["weight"]*c["nativeTotal"]/c["nativeN"] for c in matched) if nn else None,
                "standardizedNFL": sum(c["weight"]*c["nflTotal"]/c["nflN"] for c in matched) if nn else None,
                "excludedNativeKnownByFirstReason": dict(excluded), "matchedCells": matched}
    return {"available": True, "minimumNativeKnown": 20, "minimumNFLKnown": 100,
        "referenceSeasons": reference_report.get("query", {}).get("query", {}).get("seasons"),
        "weights": "Pooled NFL metric-specific denominator weights on each panel's common down/distance/field support; identical weights for both sides.",
        "limitations": "Descriptive only; per-cohort support differs. Talent, concepts, coverage, opponent, score/clock and selection into completions remain uncontrolled. Native runs are RB/FB here; all NFL designed carriers remain in the run comparison. Thin cells excluded, not broadened. No quantile averaging, causal claim, confidence interval or tuning target.",
        "panels": panels}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--outcomes", type=Path, nargs="+", required=True)
    parser.add_argument("--tracking", type=Path, nargs="+", required=True)
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--normalized-plays-out", type=Path, nargs="+", help="Optional derived common packets, one per cohort; adds actual receiver, preserving target")
    parser.add_argument("--mechanics-out", type=Path, help="Optional clean-play summary from the unchanged shared Collector")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if len(args.outcomes) != len(args.tracking):
        parser.error("Supply one common tracking file for each outcome sidecar, in the same order")
    if args.normalized_plays_out and len(args.normalized_plays_out) != len(args.tracking):
        parser.error("Supply one normalized output path per tracking input")
    inputs = {p.resolve() for p in args.outcomes + args.tracking + ([args.reference] if args.reference else [])}
    outputs = [args.out] + (args.normalized_plays_out or []) + ([args.mechanics_out] if args.mechanics_out else [])
    if any(p.resolve() in inputs for p in outputs) or len({p.resolve() for p in outputs}) != len(outputs):
        parser.error("Output paths must be distinct from each other and from all inputs")
    reference_report = json.loads(args.reference.read_text()) if args.reference else {}
    nfl_cells = reference_report.get("conditionalCells", [])
    all_rows, cohorts, provenance, ids = [], [], [], set()
    collector = tracking.Collector() if args.mechanics_out else None
    for cohort_index, (sidecar_path, tracking_path) in enumerate(zip(args.outcomes, args.tracking)):
        sidecar = json.loads(sidecar_path.read_text())
        if sidecar.get("schema") != "native-game-outcome-review-v1" or sidecar["sourceBefore"] != sidecar["sourceAfter"]:
            raise ValueError(f"Unsupported or changing engine snapshot: {sidecar_path}")
        opener = gzip.open if tracking_path.suffix == ".gz" else open
        common = {}
        with opener(tracking_path, "rt") as handle:
            for line in handle:
                play = json.loads(line)
                if play["id"] in common:
                    raise ValueError(f"Duplicated common play: {play['id']}")
                common[play["id"]] = play
        native = {p["id"]: p for p in sidecar["plays"]}
        receiver_changes = 0
        for play_id, play in common.items():
            if play_id not in native:
                raise ValueError(f"Common play has no paired native record: {play_id}")
            catch = next((e for e in native[play_id]["events"] if e["type"] == "catch"), None)
            receiver = catch.get("a") if catch else None
            if "receiver" in play and play["receiver"] != receiver:
                raise ValueError(f"Recorded receiver disagrees with native catch: {play_id}")
            play["receiver"] = receiver
            receiver_changes += catch is not None and receiver != play.get("target")
        derived = None
        if args.normalized_plays_out:
            path = args.normalized_plays_out[cohort_index]
            body = "".join(json.dumps(p, separators=(",", ":")) + "\n" for p in common.values()).encode()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(gzip.compress(body, mtime=0) if path.suffix == ".gz" else body)
            derived = pin(path)
        games = {g["seed"]: g for g in sidecar["games"]}
        positions = {p["id"]: p["position"] for team in sidecar["rosters"] for p in team["players"]}
        rows, audit = [], Counter(livePlays=len(sidecar["plays"]))
        for play in sidecar["plays"]:
            if play["id"] in ids:
                raise ValueError(f"Duplicated native play across cohorts: {play['id']}")
            ids.add(play["id"])
            audit["nullified"] += bool(play.get("nullified"))
            audit["foulFlag"] += bool(play.get("foul"))
            if play.get("nullified") or play.get("foul"):
                audit["excludedClean"] += 1
                continue
            row = adapt(play, games[play["gameSeed"]], positions)
            row["geometricPressure"] = None
            if collector is not None and play["id"] in common:
                collector.add(common[play["id"]])
            if ref.classify(row) == "dropback" and play["id"] in common:
                row["geometricPressure"] = geometric_pressure(common[play["id"]])
            audit["missingStats"] += not bool(play.get("stats"))
            rows.append(row)
        audit["cleanPlays"] = len(rows)
        all_rows.extend(rows)
        provenance.append({"sidecar": pin(sidecar_path), "tracking": pin(tracking_path),
            "normalizedTracking": derived, "normalization": "Join native first catch.a to common receiver by ID; shared actor order from the same exported replay; all other fields preserved.",
            "actualReceiverDiffersFromTarget": receiver_changes,
            "sourceBefore": sidecar["sourceBefore"], "sourceAfter": sidecar["sourceAfter"],
            "nativeCollectorSha256": sidecar["collectorSha256"], "cohort": sidecar["cohort"]})
        cohorts.append({"cohort": sidecar["cohort"], "audit": dict(audit), "outcomes": outcomes(rows),
            "pressureAssociation": pressure_association(rows), "conditionalCells": cells(rows, nfl_cells),
            "games": [{**game, "cleanOutcomes": outcomes([r for r in rows if r["game_id"] == str(game["seed"])]),
                "offenses": {team: outcomes([r for r in rows if r["game_id"] == str(game["seed"]) and r["posteam"] == team])
                    for team in (game["home"], game["away"])}} for game in sidecar["games"]]})
    report = {"schema": "native-outcome-analysis-v1", "provenance": provenance,
        "pressureOperator": tracking.PRESSURE_OPERATOR,
        "operators": {path: pin(ROOT / path) for path in ("scripts/mechanics/outcomes.py", "scripts/mechanics/nfl-outcomes.py", "scripts/mechanics/metrics.py",
            "scripts/data/rushing_benchmark.py", "scripts/data/run_outcome_context.py", "scripts/data/schematic_context_audit.py", "scripts/nflverse-reference.py")},
        "reference": pin(args.reference) if args.reference else None,
        "definitions": {"selection": "Native live run/pass; excludes nullified plays AND all foul flags, including declined fouls. NFL reference requires penalty=false; kneel/spike/two-point absent from native sidecar.",
            "mapping": "Native pass kind is dropback; sack/scramble flags retained. Recorded throws require attempted=true, throw/throwaway event, final completion/incompletion/interception, no sack/scramble. INT has priority. REG is classifier compatibility, not a claim simulated games are NFL games.",
            "yards": "Official native offensive whole-play yards, including turnover offenseYards. YPA/YPC here mean wholePlayYardsPerThrow/Completion; credited NFL passing_yards is a distinct unavailable native statistic.",
            "TD": "Actual touchdown event team=O. Specific pass/rush TD attribution unavailable after an offensive fumble; offensive TD remains known. Defensive touchdowns excluded.",
            "success": "Exact shared nfl-outcomes.py success operator: finite gain, down1-4, positive distance,40/60/100. Turnover gain remains yard-only success; EPA is unavailable.",
            "pressure": "Exact metrics.py pass_metrics operator on paired common tracking; native pressured flag separate. Unknown remains unknown. Association cannot identify pressure-caused inaccuracy or decision error.",
            "categories": "Final INT, completion, drop, PBU, throwaway, other incomplete, in that order. Overlapping native labels/events describe outcomes, not causal accuracy.",
            "cells": "Existing rushing down/distance/field bins; NFL cell references by same key and season, no fitting or sparse-cell averaging.",
            "cohorts": "Each cohort has its own generated roster pair, held across its declared games. Different cohort seeds are not matched counterfactual games. Per-game scores include special teams and flagged plays; clean outcome subsets do not."},
        "pooled": outcomes(all_rows), "pressureAssociation": pressure_association(all_rows),
        "conditionalCells": cells(all_rows, nfl_cells), "cohorts": cohorts}
    report["contextStandardization"] = standardize([("pooled", report["conditionalCells"], report["pooled"])] +
        [(str(c["cohort"]["seed"]), c["conditionalCells"], c["outcomes"]) for c in cohorts], reference_report)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    if collector is not None:
        args.mechanics_out.parent.mkdir(parents=True, exist_ok=True)
        args.mechanics_out.write_text(json.dumps({"source": "Native clean outcomes paired to original common tracking; derived actual receivers",
            "provenance": provenance, "operator": report["operators"]["scripts/mechanics/metrics.py"],
            **collector.summary(), "definitions": tracking.DEFINITIONS}, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"out": str(args.out), "cohorts": len(cohorts), "cleanPlays": len(all_rows),
                      "dropbacks": report["pooled"]["dropbacks"], "throws": report["pooled"]["throws"]}))


if __name__ == "__main__":
    main()
