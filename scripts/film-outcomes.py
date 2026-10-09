"""Measure all scrimmage clips, rather than a highlighted selection.

python3 scripts/film-outcomes.py viewer/film-room.html --out out/film-outcomes.json
The film cohort has fixed teams. Pressure is an annotation, not a proven cause
of an incompletion. Missing throw/mechanics telemetry stays unclassified.
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


def read_film(path):
    raw = Path(path).read_bytes()
    data = json.loads(raw.decode().split("const REPLAY = ", 1)[1].split(";\n", 1)[0])
    return data, hashlib.sha256(raw).hexdigest()


def rate(numerator, denominator):
    return {"count": numerator, "denominator": denominator,
            "percent": 100 * numerator / denominator if denominator else None}


def study(data, input_sha):
    plays = [p for p in data["plays"] if p["kind"] in ("pass", "run") and not p["nullified"]]
    result = {}
    for kind, threshold in (("pass", 20), ("run", 10)):
        rows = [p for p in plays if p["kind"] == kind]
        # Conventional 40/60/100% success definition, including sacks in pass
        # plays. This is a yards-based heuristic, not EPA or a game-state model.
        successful = lambda p: p["yds"] >= p["dist"] * (0.4 if p["down"] == 1 else 0.6 if p["down"] == 2 else 1)
        result[kind] = {"plays": len(rows), "explosiveYardsThreshold": threshold,
                        "explosive": rate(sum(p["yds"] >= threshold for p in rows), len(rows)),
                        "success": rate(sum(successful(p) for p in rows), len(rows)),
                        "successByDown": {str(d): rate(sum(successful(p) for p in rows if p["down"] == d),
                                                            sum(p["down"] == d for p in rows)) for d in range(1, 5)}}
    throws = [p for p in plays if p["kind"] == "pass" and any(e[1] == "throw" for e in p.get("ev", []))]
    counts = Counter()
    annotated = Counter()
    for p in throws:
        events = {e[1] for e in p.get("ev", [])}
        # Final outcome first: a drop can lead to an interception, and a catch
        # can lead to a fumble. These are not incomplete passes.
        outcome = "interception" if "interception" in events else "completion" if p["flags"]["complete"] else "drop" if "drop" in events else "pbu" if "pbu" in events else "other_incomplete"
        counts[outcome] += 1
        if p.get("stats", {}).get("pressure2yd"):
            annotated[outcome] += 1
    incomplete = sum(counts[k] for k in ("drop", "pbu", "other_incomplete"))
    result["passingOutcomes"] = {"throwsWithEvent": len(throws), "counts": dict(counts),
        "withGeometricPressureBeforeThrow": dict(annotated),
        "incompletionsExcludingInterceptions": incomplete,
        "dropShareOfIncompletions": rate(counts["drop"], incomplete),
        "twentyYardCompletionsPerThrow": rate(sum(p["flags"]["complete"] and p["yds"] >= 20 for p in throws), len(throws)),
        "unclassifiedCauseNote": "Other incompletions cannot be separated into accuracy, pressure, mechanics or decision errors from these events. Pressure overlaps outcomes and does not establish causation."}
    return {"sourceSha256": data["meta"].get("sourceSha256"), "filmSha256": input_sha,
            "cohort": {"games": len(data["games"]), "seeds": [g["seed"] for g in data["games"]],
                       "includedPlays": len(plays), "excludedNullified": sum(p.get("nullified", False) for p in data["plays"]),
                       "note": "Fixed film teams; not the independently generated league cohort used by calibrate.ts. Explosive pass-play denominator includes sacks and scrambles; explosive completion denominator is throws."},
            "definitions": {"success": "At least 40% of yards to go on first down, 60% on second, 100% on third/fourth; nullified plays and kneels excluded.",
                            "pressure": "Recorded defender within 2 yards before throw; association only."}, **result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("film")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    data, digest = read_film(args.film)
    report = study(data, digest)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
