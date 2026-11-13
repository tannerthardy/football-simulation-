"""Compact paired traffic trials without retaining all motion frames.

python3 scripts/data/traffic_contact_report.py out/traffic-contact-before.json out/traffic-contact-after.json out/traffic-contact-comparison.json
"""
import argparse
import json
from math import dist
from pathlib import Path


def key(rep):
    return rep["scenario"], rep["seed"], rep["side"], rep["substeps"]


def compact(report):
    reps = report["reps"]
    indexed = {key(rep): rep for rep in reps}
    convergence = []
    mirrors = []
    for scenario in sorted({rep["scenario"] for rep in reps}):
        native = [rep for rep in reps if rep["scenario"] == scenario and rep["substeps"] == 12]
        paired = [(rep, indexed[(scenario, rep["seed"], rep["side"], 48)]) for rep in native]
        errors = [max(dist((a["x"], a["y"]), (b["x"], b["y"]))
                      for a, b in zip(rep["frames"][-1]["pos"], ref["frames"][-1]["pos"]))
                  for rep, ref in paired]
        convergence.append({"scenario": scenario, "pairs": len(paired),
                            "maxEndingBodyErrorYd12vs48": max(errors),
                            "fallSetDisagreements": sum(set(rep["falls"]) != set(ref["falls"]) for rep, ref in paired)})
        for substeps in (6, 12, 48):
            left = [rep for rep in reps if rep["scenario"] == scenario and rep["side"] == 1 and rep["substeps"] == substeps]
            errors = []
            falls = 0
            for rep in left:
                mirrored = indexed[(scenario, rep["seed"], -1, substeps)]
                falls += set(rep["falls"]) != set(mirrored["falls"])
                assert len(rep["frames"]) == len(mirrored["frames"])
                for a, b in zip(rep["frames"], mirrored["frames"]):
                    assert a["t"] == b["t"]
                    errors.extend(dist((p["x"], p["y"]), (q["x"], 160 / 3 - q["y"]))
                                  for p, q in zip(a["pos"], b["pos"]))
            mirrors.append({"scenario": scenario, "substeps": substeps, "pairs": len(left),
                            "maxFullPathMirrorErrorYd": max(errors), "fallSetDisagreements": falls})
    trials = []
    for rep in reps:
        retained = {k: v for k, v in rep.items() if k != "frames"}
        retained["start"] = rep["frames"][0]
        retained["end"] = rep["frames"][-1]
        trials.append(retained)
    return {"sourceSha256": report["sourceSha256"], "note": report["note"],
            "summaries": report["summaries"], "convergence": convergence, "mirrors": mirrors, "trials": trials}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    before, after = (json.loads(p.read_text()) for p in (args.before, args.after))
    paired = {key(rep): rep for rep in before["reps"]}
    assert len(paired) == len(before["reps"]) == len(after["reps"])
    assert set(paired) == {key(rep) for rep in after["reps"]}
    assert all(rep["profiles"] == paired[key(rep)]["profiles"] for rep in after["reps"])
    result = {"note": "Paired synthetic traffic geometry; identical physical profiles verified. Native-12 summaries average peak closing over all trials, including zero when no contact. Not a tackle/fall rate or NFL validation. Retained start is the first 0.05-s sample, not initial conditions; regenerate raw frames for mirror checks.",
              "identicalPhysicalProfiles": True, "before": compact(before), "after": compact(after)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
