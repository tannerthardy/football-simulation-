"""Saved evidence only: compare actual motion, collection and random decisions."""
import gzip
import hashlib
import json
import math
from pathlib import Path

root = Path(__file__).parent
read = lambda p: json.loads(gzip.decompress(p.read_bytes()))
results = []
for case in ("A044", "A008"):
    before, after = (read(root / arm / f"{case}.json.gz") for arm in ("reference", "candidate"))
    changes = []
    for x, y in zip(before["ticks"], after["ticks"]):
        actors = [i for i in range(22) if x["agents"][i] != y["agents"][i] or x["commands"][i] != y["commands"][i]]
        if actors:
            changes.append({"t": x["t"], "actors": actors})
    physical_equal = lambda i, cutoff: all(x["inputs"][i]["body"] == y["inputs"][i]["body"] for x, y in zip(before["ticks"], after["ticks"]) if x["t"] <= cutoff)
    primary = [7, 19] if case == "A008" else [10]
    row = {"caseId": case, "firstDifference": changes[0] if changes else None,
           "changedActors": sorted(set(i for c in changes for i in c["actors"])),
           "eventsEqual": before["events"] == after["events"],
           "firstRngDifference": next((x["t"] for x, y in zip(before["ticks"], after["ticks"]) if x["rngAfter"] != y["rngAfter"]), None),
           "primaryFullBodiesEqual": {str(i): physical_equal(i, 3.35 if case == "A008" else 2.9) for i in primary},
           "primaryCommandsEqual": {str(i): all(x["commands"][i] == y["commands"][i] for x, y in zip(before["ticks"], after["ticks"]) if x["t"] <= (3.35 if case == "A008" else 2.9)) for i in primary}}
    for label, data in (("before", before), ("after", after)):
        tick = next(t for t in data["ticks"] if t["t"] == 2.85)
        ss, robber, h = (tick["agents"][i] for i in (21, 15, 10))
        distance = lambda a, b: math.hypot(a["pos"]["x"] - b["pos"]["x"], a["pos"]["y"] - b["pos"]["y"])
        impacts = [{"t": t["t"], **c} for t in data["ticks"] for c in (t["contacts"] or []) if 21 in (c["i"], c["j"]) or 15 in (c["i"], c["j"])]
        row[label] = {"ssSpeedAt285": math.hypot(ss["vel"]["x"], ss["vel"]["y"]), "ssHGapAt285": distance(ss, h), "robberHGapAt285": distance(robber, h),
                      "contactsInvolvingEither": impacts, "stoppedAt": data["stoppedAt"], "phase": data["phase"],
                      "collection": [e for e in data["events"] if e["type"] in ("catch", "drop", "tackle_wrap", "incomplete")]}
    results.append(row)

receipts = {p.name: json.loads(p.read_text()) for p in (root / "receipts").glob("*.json")}
runtime = {name: sum(c["elapsedSeconds"] for c in r["commands"]) for name, r in receipts.items()}
report = {"cases": results, "newLauncherSeconds": runtime, "totalNewLauncherSeconds": sum(runtime.values()),
          "nativeLauncherSeconds": sum(v for k, v in runtime.items() if "native" in k),
          "nativeExecutions": 4, "fullGames": 0, "newRosters": 0}
(root / "comparison.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
