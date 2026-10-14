"""Reuse frozen pass evidence; no engine execution or scheme ranking."""
import collections
import hashlib
import json
import pathlib
import statistics
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[2]
started = time.perf_counter()
baseline = "4ded6b600fd3785e65034aa5623d7a9f8f3c5db1"
runtime = "8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c"
profile = json.loads((root / "config/baseline.json").read_text())


def read(path):
    return json.loads((root / path).read_text())


def fingerprint(path):
    return hashlib.sha256((root / path).read_bytes()).hexdigest()


def mean(values):
    return statistics.mean(values) if values else None


paths = ["out/catch-pursuit/native3101.json", "out/catch-pursuit/native4202.json",
         "out/catch-pursuit/panel.json", "out/catch-pursuit/custom.json"]
packets = {p: read(p) for p in paths}
for packet in packets.values():
    assert packet["provenance"]["sourceSha256"] == runtime
    assert packet["provenance"]["flags"] == profile["flags"]

native = []
for path in paths[:2]:
    packet = packets[path]
    population = packet["population"]
    native.append({"cohort": packet["cohort"], "gameSeed": packet["seed"],
                   "calledDropbacks": len(population),
                   "completions": sum(c["completed"] for c in population),
                   "flags": sum(bool(c["flag"]) for c in population),
                   "naturalOutcomes": dict(collections.Counter(c["outcome"] for c in population)),
                   "actualConceptExposure": dict(collections.Counter(c["concept"] for c in population)),
                   "limits": "Population labels have no full attempt/sack/pressure denominator; do not infer those rates. Two roster pairs, two games; completion-only film is selected separately."})

panels = []
for path in paths[2:]:
    groups = collections.defaultdict(list)
    for clip in packets[path]["clips"]:
        groups[(clip["input"]["concept"], clip["input"]["arm"])].append(clip)
    cells = []
    for (concept, arm), clips in groups.items():
        results = [c["result"] for c in clips]
        completed = [c for c in clips if c["result"]["stats"].get("completed")]
        catches = [(c, seg) for c in completed for seg in c["result"]["segments"]
                   if seg["team"] == "O" and seg["how"] == "catch"]
        assert len(catches) == len(completed)
        cells.append({"concept": concept, "arm": arm, "n": len(clips),
                      "effectiveCoverage": dict(collections.Counter(c["input"]["effectiveCoverage"] for c in clips)),
                      "attempts": sum(r["stats"].get("attempted", False) for r in results),
                      "completions": len(completed),
                      "interceptions": sum(bool(r["stats"].get("interceptedBy")) for r in results),
                      "sacks": sum(r["stats"].get("sacked", False) for r in results),
                      "scrambles": sum(r["stats"].get("scramble", False) for r in results),
                      "flagged": sum(bool(r.get("penalty")) for r in results),
                      "censored": sum(r["outcome"] == "timeout" for r in results),
                      "meanOffenseYardsPerSnap": mean([r["offenseYards"] for r in results]),
                      "meanActualCatchDepthOnCompletions": mean([seg["startX"] - c["setup"]["los"] for c, seg in catches]),
                      "meanNativeYacOnCompletions": mean([c["result"]["stats"]["yac"] for c in completed]),
                      "actualRecipients": dict(collections.Counter(seg["carrier"] for c, seg in catches)),
                      "inputs": [{"id": c["id"], "seed": c["setup"]["seed"],
                                  "setupSha256": hashlib.sha256(json.dumps(c["setup"], separators=(",", ":"), ensure_ascii=False).encode()).hexdigest(),
                                  "finalSignature": c["signature"]} for c in clips]})
    panels.append({"path": path, "count": len(packets[path]["clips"]), "cells": cells,
                   "interpretation": "All original cells retained. Opposing populations may throw to different actual recipients; no paired catch-depth subtraction or NFL coverage superiority inference."})

source_paths = ["src/sim/coverage/judgment.ts", "src/sim/coverage/rules.ts",
                "src/sim/coverage/reads.ts", "src/sim/coverage/defender.ts",
                "src/sim/behaviors/receiver.ts", "src/sim/behaviors/qb.ts",
                "src/sim/qbmind.ts", "src/playbook/concepts.ts", "src/playbook/coverages.ts"]
source_checks = []
for path in source_paths:
    frozen = subprocess.check_output(["git", "show", f"{baseline}:{path}"], cwd=root)
    assert frozen == (root / path).read_bytes(), path
    source_checks.append({"path": path, "sha256": fingerprint(path), "matchesIntegration": True})
defense_path = "src/sim/behaviors/defense.ts"
current_defense = (root / defense_path).read_text()
baseline_defense = subprocess.check_output(["git", "show", f"{baseline}:{defense_path}"], cwd=root, text=True)
def coverage_part(text):
    return text[text.index("export class ManCoverage"):text.index("export function playBall")]
assert coverage_part(current_defense) == coverage_part(baseline_defense)
source_checks.append({"path": defense_path, "scope": "ManCoverage through immediately before playBall; its separate candidate arrival return is excluded",
                      "sectionSha256": hashlib.sha256(coverage_part(current_defense).encode()).hexdigest(),
                      "matchesIntegration": True})

option = read("out/pass-overview/option/summary.json")
assert option["provenance"]["sourceSha256"] == runtime
assert option["provenance"]["flags"] == profile["flags"]
receipts = ["out/pass-overview/typecheck-receipt.json", "out/pass-overview/option-receipt.json"]
report = {"schema": "general-pass-game-review-v1", "reviewCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
          "baseline": {"commit": baseline, "runtimeSha256": runtime, "remoteVerifiedDate": "2026-10-14"},
          "collectorSha256": fingerprint("scripts/diag/pass-game-overview.py"),
          "cachedEvidence": [{"path": p, "sha256": fingerprint(p), "provenance": packets[p]["provenance"]} for p in paths],
          "nativePopulation": native, "routePanels": panels, "sourceContracts": source_checks,
          "optionDependency": option,
          "newProbeReceipts": [{"path": p, "sha256": fingerprint(p), "receipt": read(p)} for p in receipts],
          "counting": {"reusedNativeDropbacks": sum(c["calledDropbacks"] for c in native),
                       "reusedCompletedRouteLabInputs": sum(c["count"] for c in panels),
                       "newFullPlays": 0, "newGames": 0, "newPrefixDecisionArms": 6,
                       "newComparedRouteUpdates": 6, "alreadyConvertedPreparationUpdates": 2,
                       "setupHashOperator": "SHA-256 of Python json.dumps with separators comma/colon and ensure_ascii=False; original final native signatures are reused unchanged",
                       "notCompletedOutcomes": "All new option decisions are censored. They establish hidden-information dependence, not movement, completions, YAC or field prevalence."},
          "recommendation": {"pauseActiveYacSearch": True, "retainYacCandidateAndAdverseSentinels": True,
                             "next": "Coverage information and pre-throw leverage: separate private QB-read removal from any body-direction replacement, with owned vertical/exchange controls.",
                             "second": "One installed receiver/QB option contract with independent observed leverage reads.",
                             "separateOwner": "Pass protection/pressure execution and shared physics.",
                             "defer": "More coverage names, broad call-pool expansion, fixed catch delays and rear-grip strengthening."},
          "limitations": ["Historical NFL and QB-cue experiments are context, not current measurements.",
                          "Route lab cells contain twelve inputs with clustered rosters and seeds; not coverage win-rate estimates.",
                          "General coverage bust frequency and option-route outcome impact remain unmeasured.",
                          "Review checkout retains the separate unpromoted moving-catch candidate. Reused measurements and new option probe use unchanged integration runtime; source-contract files above match integration exactly."]}
report["analysisWallSeconds"] = time.perf_counter() - started
destination = root / "data/reviews/current/pass-game-overview.json"
destination.write_text(json.dumps(report, separators=(",", ":")) + "\n")
print(json.dumps({"output": str(destination.relative_to(root)), "reusedDropbacks": report["counting"]["reusedNativeDropbacks"],
                  "reusedLabInputs": report["counting"]["reusedCompletedRouteLabInputs"], "analysisWallSeconds": report["analysisWallSeconds"]}))
