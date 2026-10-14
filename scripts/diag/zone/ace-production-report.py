"""Read the shared Ace packet without executing football or generating players."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path


def summarize(packet):
    cases = []
    for row in packet["panel"]:
        slots = {a["idx"]: a["slot"] for a in row["actors"]}
        ids = {v: k for k, v in slots.items()}
        frames = row["series"]
        summary = row["summary"]
        assert summary["complete"] and not summary["censoredByBudget"]
        assert len(frames) == len(row["hashes"]) == summary["ticks"]
        assert hashlib.sha256(json.dumps(row["hashes"], separators=(",", ":")).encode()).hexdigest() == summary["fullStateRngHistorySha256"]
        pairs = []
        for owner, target in [("RT", "DE_S"), ("RG", "DT_S"), ("Y", "DE_S"), ("H", "DE_S"), ("Z", "CB_S")]:
            a, b = ids[owner], ids[target]
            nominal, loaded, windows = [], [], []
            for f in frames:
                for rep in f["beforeReps"]:
                    if rep["defender"] == b and (rep["blocker"] == a or a in rep["helpers"]):
                        nominal.append({"controllerT": f["t"], "worldEnd": f["after"],
                                        "owner": slots[rep["blocker"]], "helper": a in rep["helpers"]})
                for j in f["handsAtWorldEnd"]:
                    if j["kind"] == "hands" and j["a"] == a and j["b"] == b:
                        n, t = j["normalForce"] or 0, j["tangentForce"] or 0
                        if math.hypot(n, t) > 1e-8:
                            item = {"controllerT": f["t"], "worldEnd": f["after"],
                                    "normalTickAverage": n, "tangentTickAverage": t}
                            loaded.append(item)
                            if not windows or abs(windows[-1]["throughWorldEnd"] - f["t"]) > 1e-8:
                                windows.append({"fromControllerT": f["t"], "throughWorldEnd": f["after"]})
                            else:
                                windows[-1]["throughWorldEnd"] = f["after"]
            pairs.append({"blocker": owner, "defender": target,
                          "firstNominalParticipation": nominal[0] if nominal else None,
                          "firstNonzeroTickAverage": loaded[0] if loaded else None,
                          "lastNonzeroTickAverage": loaded[-1] if loaded else None,
                          "sampledNonzeroTicks": len(loaded), "sampledNonzeroWindows": windows,
                          "interpretation": "Sampled signed average load and nominal role, not proof of continuous connection or protection."})
        first = next(f for f in frames if any(e["type"] == "carrier_contact" for e in f["events"]))
        carrier_contact_hands = [{"blocker": slots[j["a"]], "defender": slots[j["b"]],
                                 "normalTickAverage": j["normalForce"], "tangentTickAverage": j["tangentForce"]}
                                for j in first["handsAtWorldEnd"] if j["kind"] == "hands"
                                and slots[j["a"]] in ["RT", "RG", "Y", "H", "Z"]]
        collisions = [{"controllerT": f["t"], "worldEnd": f["after"], "contact": c}
                      for f in frames for c in f["bodyContacts"]
                      if {c["i"], c["j"]} == {ids["RG"], ids["DE_S"]}]
        z_pictures = sum(c[3] for f in frames for c in f["pictureCallCounts"]
                         if c[0] == ids["Z"] and c[1] == ids["CB_S"])
        differences = {}
        for slot in ["RT", "RG"]:
            differences[slot] = []
            for f in frames:
                for a in f["actors"]:
                    if a["idx"] != ids[slot] or not a["requested"]:
                        continue
                    q, d = a["requested"]["vel"], a["delivered"]["vel"]
                    delta = math.hypot(q["x"] - d["x"], q["y"] - d["y"])
                    if delta > 1e-8:
                        differences[slot].append({"controllerT": f["t"], "worldEnd": f["after"],
                                                  "requested": q, "delivered": d,
                                                  "achievedVelocityAtWorldEnd": a["vel"], "deltaYdS": delta})
        old = summary["historicalContext"]
        cases.append({**summary, "unroundedDeadBallGain": summary["result"]["endX"] - packet["manifest"]["los"],
                      "deltaFromHistoricalCenterUnroundedGain": summary["result"]["endX"] - packet["manifest"]["los"] - old["baseline"]["gain"],
                      "pairLoadObservations": pairs,
                      "firstCarrierContactWorldInterval": {"controllerT": first["t"], "worldEnd": first["after"],
                                                          "handsBeforeControllerCleanup": carrier_contact_hands},
                      "rgDeSBodyContacts": collisions, "zCbSConsumedPictureCount": z_pictures,
                      "rtRgRequestDeliveryDifferences": {k: {"ticks": len(v), "first": v[0] if v else None,
                                                               "interpretation": "All controller composition/spacing stages; not attributed solely to teammate spacing."}
                                                         for k, v in differences.items()},
                      "blockClimbs": [e for e in summary["result"]["events"] if e["type"] == "block_climb"],
                      "budgetMaxima": {k: max(f["budgets"][k] for f in frames) for k in frames[0]["budgets"]},
                      "observations": {"firstContactBeforeLos": summary["crossing"] is None or summary["firstContact"]["t"] < summary["crossing"],
                                       "rgDeSCollisionObserved": bool(collisions),
                                       "zConsumedAssignedCornerPicture": z_pictures > 0}})
    assert len(cases) == 3
    return {"protocol": "ace-production-offline-summary-v1", "provenance": packet["provenance"], "cases": cases,
            "scope": "Offline reduction of one shared three-play packet. Zero simulation calls. All numeric source fields retained without rounding; load windows are sampling windows only."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", nargs="?", default="data/reviews/current/ace-production-observations.json.gz")
    parser.add_argument("output", nargs="?", default="out/ace-production/offline-summary.json")
    args = parser.parse_args()
    packet = json.loads(gzip.decompress(Path(args.packet).read_bytes()))
    report = summarize(packet)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"completeCases": len(report["cases"]), "newPlays": 0, "output": str(output)}))
