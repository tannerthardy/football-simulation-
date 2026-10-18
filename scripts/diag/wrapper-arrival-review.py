"""Reduce the three archived B03 probes; no simulator, sensing or random draws.

Usage: python3 scripts/diag/wrapper-arrival-review.py EVIDENCE_DIR OUTPUT.json
See docs/reviews/run-movement-audit/causal-followup.md for source limitations.
"""
import gzip
import hashlib
import json
import math
import pathlib
import sys


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def frame(row, t):
    f = min(row["frames"], key=lambda f: abs(f["t"] - t))
    assert abs(f["t"] - t) < 1e-7
    return f


def first_difference(a, b, key, actor=None):
    assert len(a["frames"]) == len(b["frames"])
    for x, y in zip(a["frames"], b["frames"]):
        assert x["t"] == y["t"]
        left, right = x[key], y[key]
        if actor is not None:
            left, right = left[actor], right[actor]
        if left != right:
            return x["t"]
    return None


def reduce(root):
    names = ["b03-native", "early-lead", "early-forecast"]
    tapes = {n: read(root / n / "trace.json.gz") for n in names}
    rows = {n: t["rows"][0] for n, t in tapes.items()}
    base = rows["b03-native"]
    expected = "fef5cb572d40e89ddb4e4bfbc1af39bf7c8a93de09e0cc7059642c2d93f17258"
    assert base["source"] == "fc968120f8dcaffbaacd2bfa81a3e302259d5fbf54a8c5f5ee9959446f6dced4"
    result = {}
    for name, row in rows.items():
        receipt = tapes[name]["receipt"]
        assert row["inputSha256"] == expected
        assert row["initial"] == base["initial"]
        assert receipt["flags"] == tapes["b03-native"]["receipt"]["flags"]
        assert receipt["worldDefaults"] == tapes["b03-native"]["receipt"]["worldDefaults"]
        loaded = [f["t"] for f in row["frames"] for e in f["afterReps"] if e["b"] == 4 and e["d"] == 15]
        impulses = [{"t": f["t"], **c} for f in row["frames"]
                    for c in f["report"]["contacts"]
                    if 4 in (c["i"], c["j"]) and c["impulse"] > 0]
        result[name] = {
            "receipt": receipt,
            "traceSha256": hashlib.sha256((root / name / "trace.json.gz").read_bytes()).hexdigest(),
            "phase": row["phase"], "endTime": row["endTime"],
            "outcome": row["outcome"], "gain": row["gain"],
            "firstContact": row["firstContact"],
            "firstRawDifference": first_difference(base, row, "raw"),
            "firstRngDifference": first_difference(base, row, "rng"),
            "runnerBodyIdentical": first_difference(base, row, "after", 6) is None,
            "firstOtherBodyDifference": next((
                {"t": x["t"], "actor": i}
                for x, y in zip(base["frames"], row["frames"])
                for i in range(22) if i != 4 and x["after"][i] != y["after"][i]), None),
            "firstOtherRawDifference": next((
                {"t": x["t"], "actor": i}
                for x, y in zip(base["frames"], row["frames"])
                for i in range(22) if i != 4 and x["raw"][i] != y["raw"][i]), None),
            "loadedLgMikeIntervals": loaded, "positiveLgImpulses": impulses,
            "timeline": [],
            "events": row["events"],
        }
        # Preserve failures and censoring. These are integrity assertions for
        # this archived experiment, not permanent required football endings.
        assert row["phase"] == "live" and row["outcome"] is None and row["gain"] is None
        assert not loaded and not impulses
        assert result[name]["firstRngDifference"] is None
        assert result[name]["runnerBodyIdentical"]
        for t in [1.05, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 2.9, 3, 3.2]:
            f = frame(row, t)
            call = next(c for c in row["calls"] if c["t"] == t and c["a"] == 4)
            result[name]["timeline"].append({
                "t": t, "routeIndex": call["after"]["pullIdx"], "read": call["read"],
                "raw": f["raw"][4], "final": f["final"][4],
                "bodies": {slot: f["before"][idx] for slot, idx in
                           [("LG", 4), ("RG", 5), ("RB", 6), ("Mike", 15)]},
                "actualMikeDistance": math.dist(f["before"][4]["pos"].values(), f["before"][15]["pos"].values()),
            })

    # Compare the restored prefix with the preexisting compact publication.
    old = next(r for r in read(root / "coord-summary.json.gz")["arms"]["fresh-front"]["rows"] if r["id"] == "B03")
    parity = 0
    for tick in old["timeline"]:
        if tick["t"] > 3.2:
            continue
        f = frame(base, tick["t"])
        for slot, saved in tick["bodies"].items():
            idx = next(a["idx"] for a in base["initial"] if a["slot"] == slot)
            for stage in ["before", "after"]:
                for field, value in saved[stage].items():
                    assert f[stage][idx][field] == value, (tick["t"], slot, stage, field)
            assert f["raw"][idx] == saved["raw"] and f["final"][idx] == saved["final"]
            parity += 1

    errors = []
    for t, dt in [(1.5, 1.15), (1.75, 1.05)]:
        seen = next(c["read"]["seen"] for c in base["calls"] if c["a"] == 4 and c["t"] == t)
        predicted = {k: seen["pos"][k] + seen["vel"][k] * dt for k in ["x", "y"]}
        actual = frame(base, t + dt)["before"][15]["pos"]
        errors.append({"pictureAt": t, "forecastAt": t + dt, "predicted": predicted,
                       "actual": actual, "errorYd": math.dist(predicted.values(), actual.values())})
    return {"schema": "wrapper-arrival-causal-review-v1", "restoredPublishedActorIntervals": parity,
            "qualification": "One historical held-research input; diagnostic overrides, no production candidate. Three live 3.25s prefixes, no completed outcomes. Forecast errors use future truth only as analyst validation.",
            "forecastErrors": errors, "arms": result,
            "nativeCollectorSeconds": sum(t["receipt"]["elapsedSeconds"] for t in tapes.values())}


if __name__ == "__main__":
    output = reduce(pathlib.Path(sys.argv[1]))
    pathlib.Path(sys.argv[2]).write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({k: output[k] for k in ["restoredPublishedActorIntervals", "nativeCollectorSeconds"]}))
