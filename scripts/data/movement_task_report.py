"""Measure NFL and simulated task paths identically; commit only aggregates.

python3 scripts/data/movement_task_report.py out/movement-inputs.json out/movement-trials.json out/movement-report.json
"""
import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd
from bdb2027_movement import grouped_report, motion, stats


def measured(points):
    return motion(pd.DataFrame(points, columns=["seconds", "x", "y", "vx", "vy"]))


def fixture_key(row):
    return row["event"], row["athlete"], row["drill"]


def build_report(fixtures, trials):
    observations, errors, rejected = [], defaultdict(list), Counter()
    references, eligible = {}, set()
    for f in fixtures["fixtures"]:
        key = fixture_key(f)
        if key in references:
            raise ValueError("Duplicate reference fixture")
        references[key] = f
        m = measured(f["points"])
        if m is None:
            rejected["referencePathsAfterTrim"] += 1
            continue
        eligible.add(key)
        group = f"{f['split']}/{f['group']}/{f['drill']}/NFL"
        observations.append((group, f["athlete"], m))
    seen = set()
    for t in trials["trials"]:
        key = fixture_key(t)
        f = references.get(key)
        if f is None or any(t[k] != f[k] for k in ("split", "group", "draftYear")):
            raise ValueError("Unmatched or differently labelled trial")
        paired_key = key, t["mode"], t["responseSeconds"]
        if paired_key in seen:
            raise ValueError("Duplicate simulated trial")
        seen.add(paired_key)
        if key not in eligible:
            rejected["trialsWithoutEligibleReference"] += 1
            continue
        group = f"{t['split']}/{t['group']}/{t['drill']}/{t['mode']}/response{t['responseSeconds']}"
        m = measured(t["frames"])
        if m is not None:
            observations.append((group, t["athlete"], m))
        # A failed/outlier simulated measurement remains in the error/fall
        # denominator. Never silently drop it to improve the distributions.
        errors[group].append({**t, "measurementRejected": m is None})
    expected = {(key, mode, response) for key in references
                for mode in ("footballMapping", "sprintFit") for response in (.15, .4)}
    if seen != expected:
        raise ValueError("Missing or unexpected mode/response trial: panel must stay paired")
    return {"sourceSha256": trials["sourceSha256"], "inputs": trials["inputs"],
            "inputSha256": trials["inputSha256"], "selection": trials["selection"],
            "scriptSha256": {"extractor": trials["fixtureExtractorSha256"],
                             "runner": trials["runnerSha256"],
                             "reporter": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                             "measurement": hashlib.sha256(Path(__file__).with_name("bdb2027_movement.py").read_bytes()).hexdigest()},
            "fixtureAudit": fixtures["audit"], "measurementAudit": dict(rejected),
            "fixtureCount": len(references), "eligibleFixtureCount": len(eligible),
            "athletes": len({f["athlete"] for f in references.values()}),
            "trialCount": len(trials["trials"]), "eligibleTrialCount": sum(map(len, errors.values())),
            "note": trials["note"], "measuredPaths": grouped_report(observations),
            "trackingErrors": {group: {"trials": len(rs), "fallen": sum(r["fallen"] for r in rs),
                 "simulatedMeasurementsRejected": sum(r["measurementRejected"] for r in rs),
                 "unknownContactTrials": sum(r["contactUnknown"] for r in rs),
                 "completeAgilityTrials": sum(r["completeAgility"] for r in rs),
                 "missingMeasurementCounts": dict(Counter(k for r in rs for k in r["missingMeasurements"])),
                 "rmseYd": stats([r["rmseYd"] for r in rs]), "maximumErrorYd": stats([r["maxErrorYd"] for r in rs]),
                 "maximumGroundImpulseFraction": max(r["maxGroundFraction"] for r in rs),
                 "maximumPlanarWorkResidual": max(r["workResidual"] for r in rs)} for group, rs in sorted(errors.items())}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("fixtures", type=Path)
    p.add_argument("trials", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    fixtures, trials = json.loads(args.fixtures.read_text()), json.loads(args.trials.read_text())
    if hashlib.sha256(args.fixtures.read_bytes()).hexdigest() != trials["inputSha256"]:
        raise ValueError("Trial inputs differ from measured reference fixtures")
    report = build_report(fixtures, trials)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(report["fixtureCount"], "fixtures;", report["trialCount"], "trials;", len(report["measuredPaths"]), "task/mode/split groups")


if __name__ == "__main__":
    main()
