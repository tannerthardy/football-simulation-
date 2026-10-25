"""Compare unchanged-collector 24-input OL panels; no simulation or outcome selection.

Usage: python3 data/reviews/physics-world/block-fit/compare.py \
  out/ol-base-review/after/raw.json.gz out/block-fit/simple/raw.json.gz \
  data/reviews/physics-world/block-fit

The before panel is the retained low-base implementation, not the earlier
missing-posture baseline. Archives all candidate first observations and six
predetermined full traces. Other 18 detailed traces can be regenerated from
the source/tool/input pins. All 24 force summaries remain in comparison.json.gz.
"""
import gzip
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

OL = {"LT", "LG", "C", "RG", "RT"}
CONCEPTS = ["iz_strong", "wz_strong", "power", "trap", "counter", "oz_strong"]
FIXED_IDS = [f"OLB-R1-{concept}-R-S3" for concept in CONCEPTS]
LOST_PHI = 1.1
WITNESS_ID = "OLB-R1-wz_strong-R-S3"
WITNESS_PAIR = (1, 11)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def stats(values):
    values = [v for v in values if v is not None]
    return {"n": len(values), "mean": sum(values) / len(values) if values else None,
            "min": min(values) if values else None, "max": max(values) if values else None}


def state(value):
    return {k: value[k] for k in ["idx", "slot", "pos", "vel", "speed", "facing", "firstLevel", "plan", "engagement", "support"]}


def acquisition(value):
    return {k: value[k] for k in ["t", "blocker", "defender", "successful", "distance", "relativeClosingSpeed", "actualPhi", "engagement"]} | {
        "beforeA": state(value["beforeA"]), "beforeB": state(value["beforeB"])}


def load(value):
    return {k: value[k] for k in ["interval", "requested", "bodyLoads", "handLoads", "strikes"]} | {
        "before": state(value["before"]), "after": state(value["after"])}


def cross_pair(row, i, j):
    """One OL/defender interaction, counted once regardless of report ordering."""
    players = row["players"]
    if players[i]["slot"] in OL and players[i]["team"] == "O" and players[j]["team"] == "D":
        return i, j
    if players[j]["slot"] in OL and players[j]["team"] == "O" and players[i]["team"] == "D":
        return j, i
    return None


def force_windows(row):
    """Preserve nonzero achieved reports by ordered OL/defender pair and 50ms bin."""
    pairs = {}
    for sample in row["rows"]:
        interval = {}

        def get(pair):
            return interval.setdefault(pair, {"interval": [sample["t"], sample["end"]],
                "handJointRecords": 0, "handNormalAbsoluteNetImpulse": 0.0,
                "handTangentAbsoluteNetImpulse": 0.0, "bodyRecords": 0,
                "bodyNormalImpulse": 0.0, "strikeRecords": 0, "strikeNetVectorNormImpulse": 0.0})

        for item in sample["deliveredHands"]:
            pair = cross_pair(row, item["a"], item["b"])
            if pair is None or not (item["normalImpulse"] or item["tangentialImpulse"]):
                continue
            record = get(pair)
            record["handJointRecords"] += 1
            record["handNormalAbsoluteNetImpulse"] += abs(item["normalImpulse"])
            record["handTangentAbsoluteNetImpulse"] += abs(item["tangentialImpulse"])
        for item in sample["report"]["contacts"]:
            pair = cross_pair(row, item["i"], item["j"])
            if pair is None or item["impulse"] <= 0:
                continue
            record = get(pair)
            record["bodyRecords"] += 1
            record["bodyNormalImpulse"] += item["impulse"]
        for item in sample["report"]["strikes"]:
            pair = cross_pair(row, item["i"], item["j"])
            magnitude = math.hypot(item["impulse"]["x"], item["impulse"]["y"])
            if pair is None or magnitude <= 0:
                continue
            record = get(pair)
            record["strikeRecords"] += 1
            record["strikeNetVectorNormImpulse"] += magnitude
        for pair, window in interval.items():
            pairs.setdefault(pair, []).append(window)
    return pairs


def forces(windows):
    all_windows = [window for pair_windows in windows.values() for window in pair_windows]
    bins = lambda field: {tuple(w["interval"]) for w in all_windows if w[field]}
    pair_bins = lambda field: sum(bool(w[field]) for w in all_windows)
    return {
        "pairsWithActualLoad": len(windows),
        "uniqueDecisionBinsWithAnyOlDefenderLoad": len({tuple(w["interval"]) for w in all_windows}),
        "uniqueDecisionBinsWithHandLoad": len(bins("handJointRecords")),
        "uniqueDecisionBinsWithBodyLoad": len(bins("bodyRecords")),
        "uniqueDecisionBinsWithStrikeLoad": len(bins("strikeRecords")),
        "loadedPairDecisionBins": len(all_windows),
        "handPairDecisionBins": pair_bins("handJointRecords"),
        "bodyPairDecisionBins": pair_bins("bodyRecords"),
        "strikePairDecisionBins": pair_bins("strikeRecords"),
        **{field: sum(w[field] for w in all_windows) for field in [
            "handJointRecords", "handNormalAbsoluteNetImpulse", "handTangentAbsoluteNetImpulse",
            "bodyRecords", "bodyNormalImpulse", "strikeRecords", "strikeNetVectorNormImpulse"]},
    }


def row_summary(row):
    acquisitions = [item for sample in row["rows"] for item in sample["acquisitions"] if item["successful"]]
    first = row["firstContacts"]
    falls = [{"interval": [s["t"], s["end"]], "idx": idx, "slot": row["players"][idx]["slot"]}
             for s in row["rows"] for idx in s["report"]["falls"]]
    windows = force_windows(row)
    return {
        "successfulOlAcquisitions": len(acquisitions),
        "lostActualLeverageAcquisitions": sum(item["actualPhi"] is not None and abs(item["actualPhi"]) >= LOST_PHI for item in acquisitions),
        "successfulAcquisitionAbsolutePhi": stats([abs(item["actualPhi"]) if item["actualPhi"] is not None else None for item in acquisitions]),
        "allOlFirstActualLoads": len(first),
        "firstLevelOlFirstActualLoads": sum(item["before"]["firstLevel"] for item in first),
        "allOlFirstLoadIntervalStart": stats([item["interval"][0] for item in first]),
        "allFalls": len(falls), "olFalls": sum(f["slot"] in OL for f in falls),
        "falls": falls, "actualForces": forces(windows),
        "actualForcesByPair": [{"blocker": pair[0], "blockerSlot": row["players"][pair[0]]["slot"],
            "defender": pair[1], "defenderSlot": row["players"][pair[1]]["slot"],
            "summary": forces({pair: pair_windows})} for pair, pair_windows in sorted(windows.items())],
        "allSuccessfulAcquisitions": [acquisition(item) for item in acquisitions],
        "firstAcquisitions": [acquisition(item) for item in row["firstAcquisitions"]],
        "firstActualLoads": [load(item) for item in first],
        "end": row["end"], "endpointSignature": row["signature"], "invariants": row["invariants"],
    }


def aggregate(rows):
    numeric = ["successfulOlAcquisitions", "lostActualLeverageAcquisitions", "allOlFirstActualLoads",
               "firstLevelOlFirstActualLoads", "allFalls", "olFalls"]
    return {"inputs": len(rows), **{key: sum(row[key] for row in rows) for key in numeric},
            "actualForces": {key: sum(row["actualForces"][key] for row in rows)
                             for key in rows[0]["actualForces"]},
            "allOlFirstLoadIntervalStart": stats([item["interval"][0] for row in rows for item in row["firstActualLoads"]]),
            "successfulAcquisitionAbsolutePhi": stats([abs(item["actualPhi"]) if item["actualPhi"] is not None else None
                for row in rows for item in row["allSuccessfulAcquisitions"]])}


def first_divergence(before, after):
    for b, a in zip(before["rows"], after["rows"]):
        assert b["t"] == a["t"]
        for idx, (b_command, a_command) in enumerate(zip(b["requested"], a["requested"])):
            if b_command != a_command:
                return {"t": b["t"], "idx": idx, "slot": before["players"][idx]["slot"],
                        "beforeRequested": b_command, "afterRequested": a_command,
                        "beforePhysical": state(b["before"][idx]), "afterPhysical": state(a["before"][idx])}
    return None


def pack(raw, raw_path, output):
    archived = {key: value for key, value in raw.items() if key != "rows"}
    archived.update(schema="block-fit-fixed-traces-v1", originalSchema=raw["schema"], originalRawSha256=sha(raw_path),
        traceSelection={"fixedIds": FIXED_IDS, "policy": "First roster, unflipped six concepts, fixed before outcomes.",
            "preserved": "All 24 inputs, profiles, initial/end states, first acquisitions, actual first-load records, summaries and invariants. All physical tick traces for six fixed clips.",
            "omitted": "Detailed tick traces for other 18 inputs; regenerate with pinned collector and engine source. All 24 force summaries retained in comparison.json.gz."})
    archived["rows"] = [{key: value for key, value in row.items() if key != "rows" or row["id"] in FIXED_IDS} for row in raw["rows"]]
    output.write_bytes(gzip.compress((json.dumps(archived, separators=(",", ":")) + "\n").encode(), compresslevel=9, mtime=0))


def main():
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    before_path, after_path, output = map(Path, sys.argv[1:])
    before, after = read(before_path), read(after_path)
    output.mkdir(parents=True, exist_ok=True)
    assert len(before["rows"]) == len(after["rows"]) == 24
    for report in [before, after]:
        assert report["sourceBefore"] == report["sourceAfter"]
        assert report["scriptBefore"] == report["scriptAfter"]
        assert len(report["observerChecks"]) == 6
        assert all(check["passed"] and check["observedSignature"] == check["plainSignature"] and
                   check["observedInitialSignature"] == check["plainInitialSignature"] for check in report["observerChecks"])
        assert sum(row["id"] in FIXED_IDS for row in report["rows"]) == 6
    pin_keys = ["inputs", "inputSha256", "profileSha256", "scriptBefore", "scriptAfter", "decisionDt", "inspectionSeconds"]
    assert all(before[key] == after[key] for key in pin_keys)
    assert before["moduleSha256"]["src/physics/world.ts"] == after["moduleSha256"]["src/physics/world.ts"]
    rows, load_changes, first_acq_changes, adverse = [], [], [], []
    for b, a in zip(before["rows"], after["rows"]):
        assert all(b[key] == a[key] for key in ["id", "input", "players", "initial", "initialContext", "initialSignature", "profileSha256", "fixture", "resolvedOffCall", "physics"])
        bs, ass = row_summary(b), row_summary(a)
        rows.append({"id": b["id"], "input": b["input"], "pinsEqual": True,
                     "firstChangedFinalCommand": first_divergence(b, a), "before": bs, "after": ass})
        b_loads = {item["before"]["slot"]: item for item in b["firstContacts"]}
        a_loads = {item["before"]["slot"]: item for item in a["firstContacts"]}
        for slot in sorted(set(b_loads) | set(a_loads)):
            old, new = b_loads.get(slot), a_loads.get(slot)
            if not old or not new:
                load_changes.append({"id": b["id"], "slot": slot, "kind": "gained" if new else "lost",
                                     "before": load(old) if old else None, "after": load(new) if new else None})
            elif old["interval"][0] != new["interval"][0]:
                load_changes.append({"id": b["id"], "slot": slot, "kind": "delayed" if new["interval"][0] > old["interval"][0] else "earlier",
                                     "before": load(old), "after": load(new)})
        b_acq = {item["beforeA"]["slot"]: item for item in b["firstAcquisitions"]}
        a_acq = {item["beforeA"]["slot"]: item for item in a["firstAcquisitions"]}
        for slot in sorted(set(b_acq) | set(a_acq)):
            old, new = b_acq.get(slot), a_acq.get(slot)
            if old != new:
                first_acq_changes.append({"id": b["id"], "slot": slot, "before": acquisition(old) if old else None,
                    "after": acquisition(new) if new else None,
                    "absolutePhiChange": abs(new["actualPhi"]) - abs(old["actualPhi"]) if old and new and old["actualPhi"] is not None and new["actualPhi"] is not None else None,
                    "intervalStartChange": new["t"] - old["t"] if old and new else None})
        new_falls = [fall for fall in ass["falls"] if fall not in bs["falls"]]
        adverse.append({"id": b["id"], "moreAllFalls": ass["allFalls"] > bs["allFalls"],
            "moreOlFalls": ass["olFalls"] > bs["olFalls"], "newFallReports": new_falls,
            "firstLoadLostOrDelayed": [{"slot": item["slot"], "kind": item["kind"]} for item in load_changes if item["id"] == b["id"] and item["kind"] in ["lost", "delayed"]],
            "firstAcquisitionPhiWorse": [{"slot": item["slot"], "absolutePhiChange": item["absolutePhiChange"]} for item in first_acq_changes if item["id"] == b["id"] and item["absolutePhiChange"] is not None and item["absolutePhiChange"] > 0],
            "deliveredForceChanges": {key: ass["actualForces"][key] - bs["actualForces"][key] for key in bs["actualForces"]}})
    witness = {}
    for label, report in [("before", before), ("after", after)]:
        row = next(row for row in report["rows"] if row["id"] == WITNESS_ID)
        pair_windows = force_windows(row).get(WITNESS_PAIR, [])
        witness[label] = {"pair": list(WITNESS_PAIR), "actualForceWindows": pair_windows,
            "actualForceSummary": forces({WITNESS_PAIR: pair_windows}) if pair_windows else forces({}),
            "successfulAcquisitions": [acquisition(item) for s in row["rows"] for item in s["acquisitions"]
                if item["successful"] and (item["blocker"], item["defender"]) == WITNESS_PAIR],
            "consumedObservationsAtAcquisition": [{"t": s["t"], "observations": [item for item in s["observations"] if (item["observer"], item["target"]) == WITNESS_PAIR]}
                for s in row["rows"] if any(item["successful"] and (item["blocker"], item["defender"]) == WITNESS_PAIR for item in s["acquisitions"])],
            "postTickEngagedBins": [s["t"] for s in row["rows"] if s["afterTick"][WITNESS_PAIR[0]]["engagement"] and
                s["afterTick"][WITNESS_PAIR[0]]["engagement"]["defender"] == WITNESS_PAIR[1]]}
    comparison = {
        "schema": "block-fit-comparison-v1",
        "rawArtifacts": {"before": {"path": str(before_path), "sha256": sha(before_path)}, "after": {"path": str(after_path), "sha256": sha(after_path)}},
        "source": {"before": before["sourceBefore"], "after": after["sourceBefore"]},
        "tool": {"before": before["scriptBefore"], "after": after["scriptBefore"]},
        "modules": {"before": before["moduleSha256"], "after": after["moduleSha256"]},
        "pinsEqual": {key: before[key] == after[key] for key in pin_keys},
        "inputSha256": before["inputSha256"], "profileSha256": before["profileSha256"],
        "definitions": {
            "scope": "All 24 predetermined 11v11 Ace/4-3 Over/Cover3 inputs; two generated rosters, six concepts, two flips, seed3, ordinary physics, 3s inspection.",
            "acquisition": "Successful sim.engage calls observed for OL, including regrabs. abs(actualPhi)>=1.1 is lost actual drive leverage. Candidate explicitly rejects similarly lost perceived commitment: the count change is partly a direct gate, not independent evidence of better football.",
            "firstLoad": "Every OL's first nonzero OL-to-defender hand/body/strike load, including pullers and second-level blocks. Subset firstLevel uses executed plan at first load. Reported 50ms interval, not precise onset, block win or sustain.",
            "forceScope": "All nonzero OL-to-defender reports, counted once per pair; teammate contact, receiver/TE blocks and non-OL tackles excluded.",
            "bins": "Unique decision bins and pair-decision bins are distinct; bins are not continuous contact durations. Summing across inputs is not independent-player inference.",
            "impulses": "Hands: sum absolute net normal and tangent joint impulses reported within each 50ms interval. Body: sum reported nonnegative normal impulses. Strikes: sum norms of each reported net impulse vector. These do not recover absolute substep force, force direction, contact quality or successful block outcomes.",
            "commands": "First changed command is the final post-spacing World request, not the behavior's raw command. Existing vision outputs copied as consumed; no added observations.",
            "endpoints": "All cases remain live at 3s and are inspection-censored. No whistle, credited rushing gain or NFL efficiency claim. Formation flips are reused input controls, not exact physical mirrors.",
            "adverse": "Retains every case's new fall reports, lost/delayed first loads, worsened first-acquisition geometry and signed force-count/impulse changes. A shifted fall report need not be an additional fall. More force is not necessarily better.",
        },
        "observerChecks": {"before": before["observerChecks"], "after": after["observerChecks"]},
        "collectorOverall": {"before": before["overall"], "after": after["overall"]},
        "aggregate": {label: aggregate([row[label] for row in rows]) for label in ["before", "after"]},
        "byConcept": {concept: {label: aggregate([row[label] for row in rows if row["input"]["concept"] == concept])
                         for label in ["before", "after"]} for concept in CONCEPTS},
        "rows": rows, "firstLoadChanges": load_changes, "firstAcquisitionChanges": first_acq_changes,
        "adverseCases": adverse, "wideZoneLtWitness": {"id": WITNESS_ID, **witness},
        "unchangedFullEndpointSignatures": [row["id"] for row in rows if row["before"]["endpointSignature"] == row["after"]["endpointSignature"]],
    }
    assert len([row for row in rows if row["input"]["concept"] == "counter"]) == 4
    assert all(row["before"]["endpointSignature"] == row["after"]["endpointSignature"] for row in rows if row["input"]["concept"] == "counter")
    (output / "comparison.json.gz").write_bytes(gzip.compress(
        (json.dumps(comparison, separators=(",", ":")) + "\n").encode(), mtime=0))
    pack(after, after_path, output / "after-traces.json.gz")
    film_path = after_path.with_name("film.json.gz")
    film = read(film_path)
    assert film["sourceBefore"] == after["sourceBefore"]
    assert film["inputSha256"] == after["inputSha256"] and film["profileSha256"] == after["profileSha256"]
    assert sorted(play["id"] for play in film["plays"]) == sorted(FIXED_IDS)
    assert all(play["recordingVerified"] for play in film["plays"])
    shutil.copyfile(film_path, output / "after-film.json.gz")
    print(json.dumps({"aggregate": comparison["aggregate"], "loadCoverageChanges": [
        {"id": item["id"], "slot": item["slot"], "kind": item["kind"]} for item in load_changes if item["kind"] in ["lost", "gained"]],
        "unchangedEndpointSignatures": comparison["unchangedFullEndpointSignatures"],
        "witnessForces": {label: witness[label]["actualForceSummary"] for label in ["before", "after"]},
        "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
