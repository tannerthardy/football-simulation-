#!/usr/bin/env python3
"""Read saved native checkpoint games; never runs the engine or changes evidence.

Flags locate review witnesses. They are not labels of incorrect football.
"""
import argparse
import collections
import gzip
import hashlib
import json
import math
import pathlib
import time


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", type=pathlib.Path, required=True)
    ap.add_argument("--out", type=pathlib.Path, required=True)
    args = ap.parse_args()
    started = time.monotonic()
    rows, inputs, totals = [], [], {}
    for arm in ("accepted", "experimental"):
        counts = collections.Counter()
        for path in sorted((args.root / arm).glob("*/game.json.gz")):
            raw = path.read_bytes()
            d = json.loads(gzip.decompress(raw))
            inputs.append({"path": str(path), "sha256": hashlib.sha256(raw).hexdigest(),
                           "sourceSha256": d["provenance"]["sourceSha256"]})
            physical = [o for o in d["observations"] if o["kind"] == "scrimmage"]
            filmed = [p for p in d["log"] if p.get("replay")]
            assert len(physical) == len(filmed)
            observations = {}
            for p, o in zip(filmed, physical):
                assert p["call"] == o["call"]["label"]
                assert [a["slot"] for a in o["initialPlayers"]] == [a["slot"] for a in p["replay"]["players"]]
                assert p["index"] not in observations
                observations[p["index"]] = o
            for p in d["log"]:
                r = p.get("replay")
                if not r:
                    continue
                counts["filmedScrimmages"] += 1
                frames, events = r["frames"], r.get("events", [])
                telemetry = r.get("telemetry", {}).get("frames", [])
                players = r["players"]
                byslot = {a["slot"]: i for i, a in enumerate(players) if a["team"] == "O"}
                qb, rb = byslot.get("QB"), byslot.get("RB")
                carriers = sorted(set(f["carrier"] for f in frames if f["carrier"] >= 0))
                types = collections.Counter(e["type"] for e in events)
                # Some games contain negative-time pre-snap stem frames whose
                # controllers are deliberately idle. Use the installed snap.
                initial_frame = next((f for f in telemetry if f["t"] >= 0 and
                                      any(a["kind"] != "idle" for a in f["agents"])), None)
                initial = initial_frame["agents"] if initial_frame else []
                expected = (p["kind"] == "run" and qb is not None and rb is not None and initial
                            and initial[qb]["kind"] == "qb-handoff" and initial[rb]["kind"] == "mesh")
                failed = bool(expected and not any(i != qb and players[i]["team"] == "O" for i in carriers)
                              and not types["handoff"] and not types["pitch"])
                s = p.get("stats", {})
                reads = [{"t": e["t"], "idx": e["a"], "slot": players[e["a"]]["slot"],
                          "note": e.get("note", "")} for e in events if e["type"] == "read"]
                row = {"arm": arm, "fixture": path.parent.name, "index": p["index"],
                       "play": p["index"] + 1, "quarter": p["quarter"], "clock": p["clock"],
                       "call": p["call"], "defense": p["defense"], "plan": p.get("plan"),
                       "outcome": p.get("outcome"), "yards": p.get("yards"),
                       "duration": p.get("duration"), "flagged": bool(p.get("foul")),
                       "stats": s, "text": p.get("text"), "carriers": carriers,
                       "expectedExchange": bool(expected), "noExchangeObserved": failed,
                       "eventCounts": dict(types), "reads": reads, "lastFrame": frames[-1]["t"]}
                counts[p["kind"] + "Plays"] += 1
                if p["kind"] == "pass" and not p.get("plan", {}).get("playAction"):
                    counts["nonPlayActionPassCalls"] += 1
                    if any(rd["note"].startswith("run;") for rd in reads):
                        counts["nonPlayActionPassCallsWithRunRead"] += 1
                    if any(rd["note"].startswith("run;") and
                           rd["slot"].startswith(("CB", "FS", "SS", "NB", "DB")) for rd in reads):
                        counts["nonPlayActionPassCallsWithSecondaryRunRead"] += 1
                if expected:
                    counts["expectedExchanges"] += 1
                    installed = observations[p["index"]]["call"]
                    row["exchangeInstall"] = {"meshTime": installed["run"]["meshTime"],
                        "qb": installed["formation"]["qb"], "scheme": installed["run"]["scheme"]}
                if failed:
                    counts["noExchangeObserved"] += 1
                    counts["noExchangeClean"] += not row["flagged"]
                    row["qbRbSnapshots"] = []
                    for t in (0, .5, 1, 1.5, 2, 3, 5, 8, frames[-1]["t"]):
                        f = min(frames, key=lambda f: abs(f["t"] - t))
                        row["qbRbSnapshots"].append({"t": f["t"], "qb": f["agents"][3*qb:3*qb+2],
                            "rb": f["agents"][3*rb:3*rb+2], "carrier": f["carrier"]})
                if p.get("outcome") == "timeout":
                    counts["playCaps"] += 1
                if p["kind"] == "run" and not s.get("rusher"):
                    counts["runsWithoutRusher"] += 1
                if rb is not None:
                    handed = next((e["t"] for e in events if e["type"] == "handoff"), math.inf)
                    own_contacts = [c for c in observations[p["index"]]["teammateContacts"]
                        if rb in (c["i"], c["j"]) and c["team"] == "O" and c["t"] >= handed
                        and players[c["j"] if c["i"] == rb else c["i"]]["pos"] in ("OT", "OG", "C", "TE", "FB")]
                    if own_contacts:
                        row["rbBlockerContactsAfterHandoff"] = {"intervals": len(own_contacts),
                            "impulse": sum(c["impulse"] for c in own_contacts), "firstT": own_contacts[0]["t"],
                            "firstSlots": own_contacts[0]["slots"]}
                        counts["snapsWithRbBlockerContactAfterHandoff"] += 1
                jobs = [a for a in r.get("telemetry", {}).get("decisions", []) if a["kind"] == "coverage-job"]
                if jobs:
                    row["coverageJobChanges"] = [{"idx": i, "slot": players[i]["slot"], "count": n,
                         "changes": [{"t": a["t"], "job": a["chose"]} for a in jobs if a["a"] == i]}
                         for i, n in collections.Counter(a["a"] for a in jobs).items()]
                if s.get("completed"):
                    counts["completions"] += 1
                    catch = next((e for e in events if e["type"] == "catch"), None)
                    if catch:
                        i = catch["a"]
                        f = min(frames, key=lambda f: abs(f["t"] - catch["t"]))
                        cp = f["agents"][3*i:3*i+2]
                        defense = [j for j, a in enumerate(players) if a["team"] == "D"]
                        distances = sorted((math.dist(cp, f["agents"][3*j:3*j+2]), j) for j in defense)
                        contacts = [e for e in events if e["t"] >= catch["t"] and
                                    e["type"] in ("carrier_contact", "tackle_wrap", "missed_tackle", "broken_tackle")
                                    and i in (e.get("a"), e.get("b"))]
                        closest = min((math.dist(g["agents"][3*i:3*i+2], g["agents"][3*j:3*j+2]), g["t"], j)
                                      for g in frames if g["t"] >= catch["t"] for j in defense)
                        row["catch"] = {"t": catch["t"], "player": i, "slot": players[i]["slot"],
                            "pos": cp, "nearestDefenders": [{"distance": round(dd, 3), "idx": j,
                               "slot": players[j]["slot"]} for dd, j in distances[:3]],
                            "closestAfterCatch": {"distance": round(closest[0], 3), "t": closest[1],
                                                  "slot": players[closest[2]]["slot"]},
                            "recordedContactOrAttemptAfterCatch": len(contacts)}
                        if s.get("yac", 0) >= 20:
                            counts["catches20Yac"] += 1
                            if not contacts:
                                counts["catches20YacNoContactOrAttemptEvent"] += 1
                        if s.get("yac", 0) >= 40:
                            counts["catches40Yac"] += 1
                    else:
                        row["catchEventMissing"] = True
                rows.append(row)
        totals[arm] = dict(counts)
    args.out.mkdir(parents=True, exist_ok=True)
    result = {"schema": "saved-checkpoint-film-audit-v1", "simulationRuns": 0,
              "scope": "All saved ordinary scrimmages, including flagged plays; special teams and six unfilmed tries excluded.",
              "limitations": ["No-exchange requires an installed mesh, QB ownership throughout saved frames, and no handoff/pitch event.",
                  "Contacts are recorded events, not proof that no physical force or reach occurred between sampled frames.",
                  "Distance, yardage and interception flags identify review witnesses, not automatic defects.",
                  "Standard telemetry does not record consumed perception or complete body/contact internals."],
              "inputs": inputs, "totals": totals,
              "elapsedSeconds": time.monotonic() - started}
    # Preserve the complete index without adding a huge expanded JSON diff.
    packed = gzip.compress(json.dumps({"schema": "saved-checkpoint-plays-v1", "plays": rows},
                                     separators=(",", ":")).encode(), mtime=0)
    (args.out / "plays.json.gz").write_bytes(packed)
    result["playsArtifact"] = {"path": "plays.json.gz", "plays": len(rows), "bytes": len(packed),
                               "sha256": hashlib.sha256(packed).hexdigest()}
    (args.out / "scan.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"totals": totals, "elapsedSeconds": result["elapsedSeconds"], "simulationRuns": 0}, indent=2))


if __name__ == "__main__":
    main()
