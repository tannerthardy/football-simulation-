"""Saved-only proof for the scramble carrier recording change.

Remove only the newly recorded rusher on pass-call scrambles. Keep source,
collector and snapshot differences explicit rather than calling raw packets equal.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def load(path):
    with gzip.open(path, "rt") as stream:
        return json.load(stream)


def normalize_stats(row):
    # The Game log names a try "two" even when its native call is a pass.
    if row.get("stats", {}).get("scramble") is True:
        row["stats"].pop("rusher", None)
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("recording", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    before, after = load(args.baseline), load(args.recording)
    assert before["sourceBefore"] == before["sourceAfter"]
    assert after["sourceBefore"] == after["sourceAfter"]
    assert before["leagueInputs"] == after["leagueInputs"]
    assert len(before["rows"]) == len(after["rows"]) == 8
    games, snaps, changed_ids = [], 0, []
    for baseline, recording in zip(before["rows"], after["rows"]):
        for key in ("gameIndex", "league", "seed", "home", "away", "score", "quarterScores", "beforeRosterSha256", "nativeCalls"):
            assert baseline[key] == recording[key], (baseline["gameIndex"], key)
        assert len(baseline["log"]) == len(recording["log"])
        native_count = 0
        for old, new in zip(baseline["log"], recording["log"]):
            old, new = json.loads(json.dumps(old)), json.loads(json.dumps(new))
            a, b = old.pop("nativeInput", None), new.pop("nativeInput", None)
            assert normalize_stats(old) == normalize_stats(new), (baseline["gameIndex"], old["index"], "log")
            if a is None:
                assert b is None
                continue
            assert b is not None
            native_count += 1
            assert a["finalSha256"] == b["scrambleCarrierNormalizedFinalSha256"], (baseline["gameIndex"], a["logIndex"], "complete normalized final snapshot")
            raw_a, raw_b = a.pop("raw"), b.pop("raw")
            if raw_a.get("kind") == "pass" and raw_a.get("stats", {}).get("scramble") is True:
                assert "rusher" not in raw_a["stats"]
                assert isinstance(raw_b["stats"].get("rusher"), str)
                changed_ids.append(f"G{baseline['gameIndex']}-P{old['index']:03d}")
            assert normalize_stats(raw_a) == normalize_stats(raw_b), (baseline["gameIndex"], a["logIndex"], "raw result")
            # These hashes include the changed output field or earlier log.
            # Complete final-state compatibility is asserted above; initial
            # snapshots, players, next RNG and every remaining input stay exact.
            for field in ("finalSha256", "resultSha256", "earlierLogSha256"):
                a.pop(field)
                b.pop(field)
            b.pop("scrambleCarrierNormalizedFinalSha256")
            assert a == b, (baseline["gameIndex"], a["logIndex"], "native input/RNG")
        games.append({"game": baseline["gameIndex"], "score": baseline["score"], "nativeSnaps": native_count, "normalizedAllLogRowsExact": True})
        snaps += native_count
    receipt = {
        "schema": "scramble-carrier-recording-compatibility-v1",
        "baselineSource": before["sourceBefore"], "recordingSource": after["sourceBefore"],
        "inputs": {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in (args.baseline, args.recording)},
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "games": games, "allNativeSnaps": snaps, "scrambleCarrierIdAdded": len(changed_ids), "changedIds": changed_ids,
        "exactNormalizedNativeFinalStates": True, "exactNativeInputsAndNextRng": True,
        "exactScoresAndOutcomes": True,
        "limits": ["Normalization removes only stats.rusher on observed pass-call scrambles; physical state, support, minds, perception, controller state and next RNG remain in the final snapshot hash.", "Derived source/collector/log/result hashes differ and are retained in the original inputs.", "Snapshots cover enumerable runtime state, not external module WeakMaps; this is the existing native snapshot operator."]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"games": 8, "snaps": snaps, "addedCarrierIds": len(changed_ids), "compatible": True}))


if __name__ == "__main__":
    main()
