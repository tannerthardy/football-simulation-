"""Compare saved fixed-pass guards for the scramble carrier output change."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("recording", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with gzip.open(args.baseline, "rt") as stream:
        before = json.load(stream)
    with gzip.open(args.recording, "rt") as stream:
        after = json.load(stream)
    assert before["sourceBefore"] == before["sourceAfter"]
    assert after["sourceBefore"] == after["sourceAfter"]
    assert len(before["rows"]) == len(after["rows"]) == 96
    changed = []
    for old, new in zip(before["rows"], after["rows"]):
        assert old["observerVerified"] and new["observerVerified"]
        old, new = dict(old), dict(new)
        if new["stats"].get("scramble") is True:
            assert "rusher" not in old["stats"]
            assert isinstance(new["stats"].get("rusher"), str)
            new["stats"] = dict(new["stats"])
            new["stats"].pop("rusher")
            changed.append(new["id"])
        else:
            assert old["executionSha256"] == new["executionSha256"]
        old.pop("executionSha256")
        new.pop("executionSha256")
        assert old == new, old["id"]
    receipt = {
        "schema": "scramble-recording-passing-compatibility-v1",
        "baselineSource": before["sourceBefore"], "recordingSource": after["sourceBefore"],
        "rows96ExceptScrambleRusherAndDerivedExecutionHashExact": True,
        "unchangedNonScrambleExecutionHashes": 96 - len(changed),
        "observerPlainParity96": True, "scrambleCarrierAdded": len(changed), "ids": changed,
        "inputs": {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in (args.baseline, args.recording)},
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "limits": ["Derived endpoint signatures include the changed stats field; complete normalized native final states are separately checked by the eight-game collector.", "All stored passing rows, samples, decisions, events and outcomes match except the newly recorded carrier."]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"passes": 96, "addedScrambleIDs": len(changed), "compatible": True}))


if __name__ == "__main__":
    main()
