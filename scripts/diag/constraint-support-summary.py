"""Reduce source-pinned constraint diagnostics; never fit or modify the engine.

python3 scripts/diag/constraint-support-summary.py out/foot-restraint \
    data/reviews/physics-world/constraint-support
Raw reports remain reproducible with the TypeScript diagnostics in the review.
"""
import hashlib
import json
import math
import sys
from pathlib import Path


def read(path):
    return json.loads(path.read_text())


def pin(path):
    return {"path": str(path), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def format_json(value, depth=0):
    """Keep large measurement arrays at one row per line for reviewable diffs."""
    indent = "  " * depth
    child = indent + "  "
    if isinstance(value, dict):
        return "{\n" + ",\n".join(child + json.dumps(k) + ": " + format_json(v, depth + 1)
                                 for k, v in value.items()) + "\n" + indent + "}"
    if isinstance(value, list) and value:
        if len(value) > 8 and all(isinstance(v, dict) for v in value):
            items = [json.dumps(v, separators=(",", ":")) for v in value]
        else:
            items = [format_json(v, depth + 1) for v in value]
        return "[\n" + ",\n".join(child + v for v in items) + "\n" + indent + "]"
    return json.dumps(value)


def body_witness(body, full_support=False):
    result = {key: body.get(key) for key in ("pos", "vel", "facing", "spin")}
    result["support"] = body.get("support") if full_support else {
        key: body["support"].get(key) for key in ("state", "xi", "feetLock")}
    return result


def foot_summary(report):
    rows = []
    for row in report["rows"]:
        reduced = {k: v for k, v in row.items() if k not in ("final", "frames")}
        reduced["final"] = [body_witness(b) for b in row["final"]]
        rows.append(reduced)
    return {"sourceSha256": report["sourceSha256"], "note": report["note"],
            "profile": report["profile"], "summaries": report["summaries"], "rows": rows}


def trace_summary(report):
    rows = []
    for row in report["rows"]:
        first = row["firstDifference"]
        rows.append({k: v for k, v in row.items() if k not in ("frames", "firstDifference")} | {
            "frames": len(row["frames"]),
            "firstDifference": None if first is None else {
                "t": first["t"], "actors": first["actors"], "commands": first["commands"],
                "plus": [body_witness(b, True) for b in first["plus"]],
                "minus": [body_witness(b, True) for b in first["minus"]]},
            "peakAbsSpin": max(abs(b.get("spin", 0)) for f in row["frames"]
                               for sign in ("plus", "minus") for b in f[sign]),
            "finalActors": row["frames"][-1]["actors"]})
    return {"sourceSha256": report["sourceSha256"], "note": report["note"], "rows": rows}


def moving_summary(report):
    reps = report["reps"]
    pairs, mirrors = [], []
    for row in reps:
        if row["substeps"] != 12:
            continue
        ref = next(r for r in reps if r["seed"] == row["seed"] and r["side"] == row["side"]
                   and r["scenario"] == row["scenario"] and r["substeps"] == 48)
        errors = {actor: math.hypot(row["frames"][-1][actor]["x"] - ref["frames"][-1][actor]["x"],
                                  row["frames"][-1][actor]["y"] - ref["frames"][-1][actor]["y"])
                  for actor in ("carrier", "defender")}
        pairs.append({"seed": row["seed"], "side": row["side"], "scenario": row["scenario"],
                      "endingErrorsYd": errors, "fallSetsDisagree": sorted(row["falls"]) != sorted(ref["falls"]),
                      "nativeFalls": row["falls"], "referenceFalls": ref["falls"]})
        if row["side"] == 1:
            other = next(r for r in reps if r["seed"] == row["seed"] and r["side"] == -1
                         and r["scenario"] == row["scenario"] and r["substeps"] == 12)
            actors = {}
            for actor in ("carrier", "defender"):
                samples = [(math.hypot(a[actor]["x"] - b[actor]["x"],
                                      a[actor]["y"] + b[actor]["y"] - 160 / 3), a["t"])
                           for a, b in zip(row["frames"], other["frames"])]
                error, time = max(samples, key=lambda sample: sample[0])
                actors[actor] = {"maxPathErrorYd": error, "time": time}
            mirrors.append({"seed": row["seed"], "scenario": row["scenario"], "actors": actors})
    reduced = []
    for row in reps:
        reduced.append({k: v for k, v in row.items() if k != "frames"} | {
            "initial": row["frames"][0], "final": row["frames"][-1], "sampleCount": len(row["frames"])})
    return {"sourceSha256": report["sourceSha256"], "note": report["note"],
            "summaries": report["summaries"], "nativeVs48": pairs, "nativeMirrors": mirrors, "reps": reduced}


def main():
    raw = Path(sys.argv[1])
    out = Path(sys.argv[2])
    names = ["foot-before", "foot-after", "long-trace-before", "long-trace-after", "moving-after"]
    paths = {name: raw / (name + ".json") for name in names}
    reports = {name: read(path) for name, path in paths.items()}
    before = reports["foot-before"]["sourceSha256"]
    after = reports["foot-after"]["sourceSha256"]
    assert reports["long-trace-before"]["sourceSha256"] == before
    assert all(reports[name]["sourceSha256"] == after for name in names if name.endswith("after"))
    out.mkdir(parents=True, exist_ok=True)
    output = {"baselineSourceSha256": before, "adoptedSourceSha256": after,
              "rawInputs": {name: pin(path) for name, path in paths.items()},
              "foot": {phase: foot_summary(reports["foot-" + phase]) for phase in ("before", "after")},
              "longContact": {phase: trace_summary(reports["long-trace-" + phase]) for phase in ("before", "after")},
              "movingAfter": moving_summary(reports["moving-after"])}
    (out / "comparison.json").write_text(format_json(output) + "\n")


if __name__ == "__main__":
    main()
