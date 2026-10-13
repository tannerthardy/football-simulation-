"""Summarize saved current-baseline witnesses; never run or tune the engine."""
import collections
import datetime
import gzip
import hashlib
import json
import math
import pathlib
import statistics

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "out/catch-chain"


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix == ".gz" else path.read_bytes())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def length(v):
    return math.hypot(v["x"], v["y"])


def label(c):
    r = c["result"]
    if c["censored"]:
        return "unfinished"
    if r["turnover"]:
        return "defensive-return-" + r["outcome"]
    return "offensive-" + r["outcome"]


def native_case(c, f, contact):
    ci = next(e["a"] for e in c["result"]["events"] if e["type"] == "catch")
    di, hi = f["defender"], f["helper"]
    t = f["firstLoaded"]["tickEnd"] - .05
    r = min(c["rows"], key=lambda r: abs(r["t"] - t))
    g = contact["outcomes"][0]["rows"][0]["before"]
    catch_t = next(e["t"] for e in c["result"]["events"] if e["type"] == "catch")
    wrap = next(e for e in c["result"]["events"] if e["type"] == "tackle_wrap" and e["a"] == di and e["b"] == ci)
    broken = next((e for e in c["result"]["events"] if e["type"] == "broken_tackle" and e.get("b") == di and e["t"] >= wrap["t"]), None)
    moments = []
    roof = 21 if c["id"].endswith(("P58", "P173")) else hi
    boundaries = [("throw", c["result"]["stats"]["timeToThrow"]), ("catch-start", catch_t),
                  ("first-post-catch", catch_t + .05), ("pre-loaded", t)]
    if broken:
        boundaries += [("first-break", broken["t"]), ("break-plus-one-second", broken["t"] + 1)]
    for name, time in boundaries:
        row = min(c["rows"], key=lambda row: abs(row["t"] - time))
        actors = []
        for i in dict.fromkeys([di, hi, roof]):
            cmd = next(x for x in row["raw"] if x["actor"] == i)
            actors.append({"identity": c["players"][i], "body": row["world"]["before"][i],
                           "raw": cmd, "applied": row["world"]["applied"][i],
                           "achieved": row["world"]["after"][i],
                           "runnerCueReads": [x for x in row["cues"] if x["actor"] == i and x["target"] == ci]})
        moments.append({"name": name, "t": row["t"], "runner": row["world"]["before"][ci], "actors": actors})
    a, b = contact["outcomes"]
    effects = []
    for x, y in zip(a["rows"], b["rows"]):
        held, removed = x["after"]["runner"], y["after"]["runner"]
        effects.append({"t": x["t"], "force": x["joint"].get("force", 0),
                        "broken": bool(x["joint"].get("broken")), "armImpulse": x["armImpulse"],
                        "runnerVelocityDifference": length({k: held["vel"][k] - removed["vel"][k] for k in ["x", "y"]}),
                        "xiHeld": length(held["support"]["xi"]), "xiRemoved": length(removed["support"]["xi"]),
                        "supportHeld": held["support"]["state"], "supportRemoved": removed["support"]["state"],
                        "footHeld": held["support"].get("foot"), "footRemoved": removed["support"].get("foot"),
                        "nativeFirstStepError": x["nativeFirstStepError"]})
    return {"id": c["id"], "setupSha256": c["setupSha256"], "observerVerified": c["observerVerified"],
            "runner": c["players"][ci], "firstLoadedDefender": c["players"][di], "helper": c["players"][hi],
            "installedRole": c["installed"][c["players"][di]["slot"]]["role"],
            "yac": c["result"]["stats"]["yac"], "outcome": c["result"]["outcome"],
            "entryGeometry": {k: v for k, v in g.items() if k not in ["runner", "defender"]},
            "runnerEntrySpeed": length(g["runner"]["vel"]), "defenderEntrySpeed": length(g["defender"]["vel"]),
            "quality": a["quality"], "execution": a["execution"], "initialHold": a["initial"],
            "firstLoadedBoundary": t + .05, "firstWrapNativeLabel": wrap["t"],
            "firstBreakNativeLabel": broken["t"] if broken else None, "firstStepEffects": effects,
            "moments": moments}


def lab_case(c):
    # Original catcher gain ends at its catch segment, including a lost fumble.
    # Never credit a defensive return or the catcher's later off-ball movement.
    rows = c["rows"]
    fumble = next((e["t"] + .05 for e in c["events"] if e["type"] == "fumble" and e.get("a") == c["initial"]["runner"]), math.inf)
    offense_rows = [r for r in rows if r["t"] <= fumble + 1e-8]
    requested_bend = c["input"]["runner"] != "native"
    after_bend = [r for r in offense_rows if r["t"] >= c["startT"] + .65 - 1e-8] if requested_bend else []
    conceded = False
    reversed_heading = False
    if after_bend:
        sign = -1 if c["input"]["runner"] == "bend-left" else 1
        start = after_bend[0]["after"][0]["body"]["pos"]
        conceded = any(r["after"][0]["body"]["pos"]["x"] - start["x"] >= 5 and
                       sign * (r["after"][0]["body"]["pos"]["y"] - start["y"]) >= 2 for r in after_bend)
        before = next((r for r in reversed(offense_rows) if r["t"] < c["startT"] + .65 - 1e-8), None)
        reversed_heading = bool(before and sign * before["after"][0]["body"]["vel"]["y"] < -1 and
                                any(sign * r["after"][0]["body"]["vel"]["y"] > 1 for r in after_bend))
    holds = []
    for h in c["holds"]:
        first = next((r for r in rows if any(g["holdId"] == h["id"] and g.get("force", 0) > 1e-8 for g in r["grips"])), None)
        geometry = first["before"][0 if h["defender"] == c["initial"]["defender"] else 1] if first else None
        holds.append({**h, "loadedSurvivalUntilBreak": h["brokenAt"] - h["firstLoaded"] if h["firstLoaded"] is not None and h["brokenAt"] is not None else None,
                      "firstLoadedGeometry": {k: v for k, v in geometry.items() if k not in ["runner", "defender"]} if geometry else None})
    return {"input": c["input"], "prefixSha256": c["prefixSha256"], "initialSha256": c["initialSha256"],
            "observerVerified": c["observerVerified"], "signature": c["signature"], "outcome": label(c),
            "completed": not c["censored"], "gainFromFork": c["gain"], "duration": c["duration"],
            "requestedBendReached": bool(after_bend), "bendConcededFiveDownfieldTwoLateral": conceded,
            "achievedLateralReversal": reversed_heading, "holds": holds,
            "firstRunnerFall": next((e["t"] for e in c["events"] if e["type"] == "fall" and e.get("a") == c["initial"]["runner"]), None),
            "events": c["events"], "initialPlayers": c["initial"]["identities"]}


def group(cases):
    return {"plays": len(cases), "endings": dict(collections.Counter(c["outcome"] for c in cases)),
            "medianGainFromFork": statistics.median(c["gainFromFork"] for c in cases),
            "requestedBendsReached": sum(c["requestedBendReached"] for c in cases),
            "bendsConcededFiveDownfieldTwoLateral": sum(c["bendConcededFiveDownfieldTwoLateral"] for c in cases),
            "achievedLateralReversals": sum(c["achievedLateralReversal"] for c in cases)}


packet = read(ROOT / "data/reviews/current/catch-chain-inputs.json")
native = read(OUT / "native-expanded.json.gz")
contact = read(OUT / "contact-expanded.json")
primary, extra = read(OUT / "lab.json.gz"), read(OUT / "lab-extra.json.gz")
helper = read(OUT / "helper-probe.json")
native_rows = [native_case(c, next(f for f in packet["clips"] if f["id"] == c["id"]),
                           next(f for f in contact["cases"] if f["id"] == c["id"])) for c in native["clips"]]
lab_rows = [lab_case(c) for p in [primary, extra] for c in p["cases"]]
assert len(lab_rows) == 324 and all(c["observerVerified"] for c in lab_rows)
key = lambda c: tuple(c["input"][k] for k in ["id", "field", "runner", "stream"])
solo = {key(c): c for c in lab_rows if c["input"]["helpers"] == 0}
pairs = [{"input": c["input"], "soloEnding": solo[key(c)]["outcome"], "helperEnding": c["outcome"],
          "soloGain": solo[key(c)]["gainFromFork"], "helperGain": c["gainFromFork"]}
         for c in lab_rows if c["input"]["helpers"] == 1]
names = ["native-expanded.json.gz", "contact-expanded.json", "lab.json.gz", "lab-extra.json.gz", "helper-probe.json",
         "native-expanded-receipt.json", "contact-expanded-receipt.json", "lab-receipt.json", "lab-extra-receipt.json",
         "helper-probe-receipt.json", "checks-receipt.json"]
report = {"schema": "catch-chain-diagnosis-v1", "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "summaryToolSha256": digest(pathlib.Path(__file__)), "baseline": packet["source"], "runtimeSha256": packet["runtimeSha256"],
          "definitions": {"mechanical": "Native World prefix rebuilt independently per arm, exact selected joint versus removal, six frozen-command steps. First held step matches native; later bond/controller updates, acquisitions and queued strikes omitted from BOTH arms. Censored mechanical slices, not play outcomes or physical realism certification.",
                          "lab": primary["limitations"], "cutback": "A declared bend after 0.6 s is conceded when the original catcher subsequently advances >=5 x yards and >=2 y yards in its requested direction before possession ends. Achieved lateral reversal is separate; controls ending before the bend are unissued, never forced cutbacks.",
                          "identity": "Original catcher and selected first loaded tackler preserved. Helpers explicitly identified; reduced lab helper deliberately repositioned, full-native helper probe never repositions anyone.",
                          "turnovers": "Catch gains stop at the original catch segment. Defensive return touchdowns and out-of-bounds endings are separate.",
                          "fresh": "Two roster cohorts; original and fresh-9001 post-prefix execution streams; new field/helper/runner arms. No new random native-game population or NFL frequency estimate.",
                          "excluded": "CB helper prototype and untranslated-progress labs are retained only as discarded harness outputs, not pooled. October 11 review historical; awareness, prolonged holds and ground holds parked."},
          "nativeCases": native_rows, "labCases": lab_rows,
          "labGroups": {k: {str(v): group([c for c in lab_rows if c["input"][k] == v]) for v in sorted(set(c["input"][k] for c in lab_rows), key=str)} for k in ["helpers", "field", "runner", "stream", "id"]},
          "pairedHelperComparisons": pairs,
          "helperProbe": [{"id": c["id"], "observerVerified": c["observerVerified"], "helper": c["probe"]["helper"],
                           "prefixSha256": c["baseline"]["prefixSha256"], "decisions": c["probe"]["decisions"],
                           "baseline": c["baseline"]["result"], "probe": c["probe"]["result"],
                           "censored": c["probe"]["censored"]} for c in helper["cases"]],
          "provenance": {"native": native["provenance"], "contact": contact["provenance"], "primaryLab": primary["provenance"],
                         "extraLab": extra["provenance"], "helperProbe": helper["provenance"]},
          "receipts": {n: read(OUT / n) for n in names if "receipt" in n},
          "artifactSha256": {n: digest(OUT / n) for n in names}}
destination = ROOT / "data/reviews/current/catch-chain-diagnosis.json"
destination.write_text(json.dumps(report, separators=(",", ":")) + "\n")
print(json.dumps({"native": len(native_rows), "lab": len(lab_rows), "groups": report["labGroups"]["helpers"],
                  "endingChanges": dict(collections.Counter(p["soloEnding"] + " -> " + p["helperEnding"] for p in pairs))}))
