"""Read-only summary of source-pinned arrival experiments and adverse controls."""
import collections
import gzip
import hashlib
import json
import math
import pathlib
import statistics

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "out/catch-arrival"


def read(p):
    data = p.read_bytes()
    return json.loads(gzip.decompress(data) if p.suffix == ".gz" else data)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def norm(v):
    return math.hypot(v["x"], v["y"])


def geometry(c, d):
    dx, dy = c["pos"]["x"] - d["pos"]["x"], c["pos"]["y"] - d["pos"]["y"]
    vx, vy = c["vel"]["x"] - d["vel"]["x"], c["vel"]["y"] - d["vel"]["y"]
    distance = math.hypot(dx, dy)
    angle = math.atan2(d["vel"]["y"], d["vel"]["x"]) - math.atan2(c["vel"]["y"], c["vel"]["x"])
    return {"distance": distance, "closing": -(vx*dx+vy*dy)/max(1e-9, distance),
            "transverseSpeed": abs(vx*dy-vy*dx)/max(1e-9, distance),
            "headingDifferenceDegrees": math.degrees(math.atan2(math.sin(angle), math.cos(angle))),
            "defenderVelocity": d["vel"], "runnerVelocity": c["vel"]}


def metric(a):
    x = read(ROOT / a["artifact"]["path"])
    ci, di = x["baselineCatcher"]["idx"], x["selectedDefender"]["idx"]
    r = x["result"]
    catch = next((e for e in r["events"] if e["type"] == "catch"), None)
    physical = None
    for row in x["rows"] if catch else []:
        w = row["world"]
        if not w or (catch and row["t"] < catch["t"]):
            continue
        impact = next((c for c in w["report"]["contacts"] if ci in [c["i"], c["j"]] and c["impulse"] > 1e-8), None)
        grasp = next((g for g in w["grasps"] if g["b"] == ci and g.get("force", 0) > 1e-8), None)
        if impact or grasp:
            physical = {"stepEnd": row["t"]+.05, "kind": "body-impulse" if impact else "loaded-grasp",
                        "contact": impact, "grasp": {k: grasp[k] for k in ["a", "b", "force", "origin"]} if grasp else None}
            break
    def body_sample(row):
        w = row["world"]
        return {"tick": row["t"], "before": geometry(w["before"][ci], w["before"][di]),
                "after": geometry(w["after"][ci], w["after"][di]), "raw": row["raw"],
                "applied": w["applied"][di], "runnerSupport": w["after"][ci]["support"],
                "defenderSupport": w["after"][di]["support"]}
    catch_sample = body_sample(min(x["rows"], key=lambda row: abs(row["t"]-catch["t"]))) if catch else None
    attempt = next((e for e in r["events"] if e["type"] in ["tackle_wrap", "missed_tackle"] and e.get("a") == di and e.get("b") == ci
                    and (not catch or e["t"] >= catch["t"])), None)
    attempt_sample = body_sample(min(x["rows"], key=lambda row: abs(row["t"]-attempt["t"]))) if attempt else None
    selected = next((h for h in x["holds"] if h["defender"] == di and h["carrier"] == ci and h["firstLoaded"] is not None), None)
    grip = None
    if selected:
        live = [row for row in x["rows"] if row["world"] and any(g["id"] == selected["id"] for g in row["world"]["grasps"])]
        first = next(row for row in live if abs(row["t"]+.05-selected["firstLoaded"]) < 1e-8)
        last = live[-1]["t"]+.05
        grip = {**selected, "entryHeadingDifferenceDegrees": math.degrees(selected["entryGeometry"]["headingDifference"]),
                "observedThrough": last, "survivalObserved": (selected["brokenAt"] or last)-selected["firstLoaded"],
                "survivalCensoredByEndingOrRelease": selected["brokenAt"] is None,
                "firstLoadedSnapshot": body_sample(first),
                "maxRunnerXiWhilePresent": max(norm(row["world"]["after"][ci]["support"]["xi"]) for row in live),
                "maxDefenderXiWhilePresent": max(norm(row["world"]["after"][di]["support"]["xi"]) for row in live)}
    first_change = next((row for row in x["rows"] if a["firstChanged"] is not None and abs(row["t"]-a["firstChanged"]) < 1e-8), None)
    original_catcher = x["baselineCatcher"]["id"]
    return {"arm": a["arm"], "signature": a["signature"], "prefixSha256": a["prefixSha256"], "observerVerified": a["observerVerified"],
            "artifact": a["artifact"], "selectedDefender": {k: x["selectedDefender"][k] for k in ["idx", "id", "slot", "ratings", "profile"]},
            "baselineCatcher": {k: x["baselineCatcher"][k] for k in ["idx", "id", "slot"]},
            "actualReceiverId": x["actualReceiverId"], "outcome": r["outcome"], "possession": r["possession"],
            "completedPass": bool(r["stats"].get("completed")), "yac": r["stats"].get("yac"), "penalty": r.get("penalty"),
            "interceptedBy": r["stats"].get("interceptedBy"), "censored": x["censored"], "changedCalls": a["changedCalls"],
            "protectedBallCalls": a["protectedBall"], "protectedCarryCalls": a["protectedCarry"],
            "catch": catch_sample, "firstSelectedAttempt": {"event": attempt, "sample": attempt_sample}, "firstPhysical": physical,
            "firstSelectedGrip": grip, "allHolds": x["holds"],
            "firstChangedRequest": {"t": first_change["t"], "choice": first_change["decision"], "sample": body_sample(first_change)} if first_change else None,
            "otherDefenderWraps": [e for e in r["events"] if e["type"] == "tackle_wrap" and e.get("b") == ci and e.get("a") != di],
            "wrapsAfterSelectedLoad": [e for e in r["events"] if selected and e["type"] == "tackle_wrap" and e.get("b") == ci
                                        and e.get("a") != di and e["t"]+.05 >= selected["firstLoaded"]],
            "runnerFallTicks": [e["t"] for e in r["events"] if e["type"] == "fall" and e.get("a") == ci],
            "defenderFallTicks": [e["t"] for e in r["events"] if e["type"] == "fall" and e.get("a") == di],
            "receiverIdentityPreserved": not r["stats"].get("completed") or r["stats"]["receiver"] == original_catcher,
            "decisionReasons": dict(collections.Counter(row["decision"]["reason"] for row in x["rows"] if row["decision"]))}


def brief(c):
    return {"id": c["id"], "defender": c["defender"], "setupSha256": c["setupSha256"], "outcomes": [metric(a) for a in c["outcomes"]]}


def counts(cases, arm):
    xs = [next(a for a in c["outcomes"] if a["arm"] == arm) for c in cases]
    return {"inputs": len(xs), "endings": dict(collections.Counter(a["possession"]+":"+a["outcome"] for a in xs)),
            "completedPasses": sum(a["completedPass"] for a in xs), "flagged": sum(a["penalty"] is not None for a in xs),
            "censored": sum(a["censored"] for a in xs), "actedPlays": sum(a["changedCalls"] > 0 for a in xs),
            "protectedBallCalls": sum(a["protectedBallCalls"] for a in xs), "protectedCarryCalls": sum(a["protectedCarryCalls"] for a in xs),
            "interceptions": sum(a["interceptedBy"] is not None for a in xs)}


primary = read(OUT / "revised-primary/summary.json")
fresh = read(OUT / "revised-fresh/summary.json")
v1 = read(OUT / "primary/summary.json")
v1fresh = read(OUT / "fresh/summary.json")
v1guards = read(OUT / "guards/summary.json")
frozen = read(OUT / "frozen/summary.json")
inputs = read(OUT / "fresh-guarded-inputs.json")
primary_cases, fresh_cases = [brief(c) for c in primary["cases"]], [brief(c) for c in fresh["cases"]]
clean = [c for c in fresh_cases if all(a["penalty"] is None for a in c["outcomes"])]
generator = {}
for pos in sorted(set(p["position"] for p in inputs["generatorAudit"])):
    ps = [p for p in inputs["generatorAudit"] if p["position"] == pos]
    generator[pos] = {"players": len(ps), "medianGeneratedBalance": statistics.median(p["generatedBalance"] for p in ps),
                      "medianStepSpeed": statistics.median(p["profile"]["stepSpeed"] for p in ps),
                      "medianGetUp": statistics.median(p["profile"]["getUp"] for p in ps)}
sensitivity = [{"id": c["id"], "outcomes": [{"arm": a["arm"], "outcome": a["result"]["outcome"],
                "yac": a["result"]["stats"].get("yac"), "signature": a["signature"], "observerVerified": a["observerVerified"],
                "mutation": a["mutation"], "holds": a["holds"]} for a in c["outcomes"] if a["arm"] != "arrival"]} for c in v1["cases"]]
frozen_metrics = []
for c in frozen["cases"]:
    outcomes = []
    for a in c["outcomes"]:
        rows = []
        for row in a["rows"]:
            d, r = row["after"][c["selectedDefender"]], row["after"][c["runner"]]
            rows.append({"stepEnd": row["t"], "defenderVelocity": d["vel"], "runnerVelocity": r["vel"],
                         "defenderXi": norm(d["support"]["xi"]), "runnerXi": norm(r["support"]["xi"]),
                         "defenderSupport": d["support"]["state"], "runnerSupport": r["support"]["state"],
                         "force": row["hold"].get("force"), "broken": bool(row["hold"].get("broken")),
                         "runnerArmImpulse": row["report"]["armImpulse"][c["runner"]], "nativeError": row["nativeError"]})
        outcomes.append({"arm": a["arm"], "prefixSha256": a["prefixSha256"], "initialHoldSha256": hashlib.sha256(json.dumps(a["initialHold"], sort_keys=True).encode()).hexdigest(), "rows": rows, "censored": True})
    frozen_metrics.append({"id": c["id"], "outcomes": outcomes})
receipt_names = ["primary", "frozen", "collect", "fresh", "collect-guards", "guards", "checks", "final-typecheck",
                 "revised-primary", "revised-fresh", "revised-checks"]
receipts = {name: read(OUT / (name+"-receipt.json")) for name in receipt_names}
assert all(r["exitCode"] == 0 and r["inputsUnchanged"] for r in receipts.values())
assert all(a["observerVerified"] for c in primary_cases+fresh_cases for a in c["outcomes"])
assert len(primary_cases) == 9 and len(fresh_cases) == 51
assert all(a["receiverIdentityPreserved"] for c in primary_cases+fresh_cases for a in c["outcomes"])
assert all(r["nativeError"] <= 1e-10 for c in frozen_metrics for a in c["outcomes"] if a["arm"] == "baseline" for r in a["rows"] if r["nativeError"] is not None)
report = {"schema": "moving-arrival-diagnosis-v1", "summaryToolSha256": sha(pathlib.Path(__file__)),
          "baseline": "4ded6b600fd3785e65034aa5623d7a9f8f3c5db1", "sourceSha256": primary["provenance"]["sourceSha256"],
          "readiness": "Rejected for integration: v1 loses P16 interception; v2 restores it but loses ordinary fresh P4 tackle. Stop after two attempts. No helper/profile combination or promotion.",
          "definitions": {"timing": "Native event tick labels versus first-load/physics step-end boundaries differ by up to .05 s. Entry geometry uses before-World; achieved catch velocity uses after-World. Grip survival without break is observed/right-censored at last joint sample, not an infinite secure hold.",
                          "capability": v1["interpretation"], "mechanical": frozen["interpretation"],
                          "fresh": inputs["declaration"], "flags": "Penalized inputs separated; no pool of flags with clean outcomes. Interceptions recognized by acquisition/identity, not the final whistle category.",
                          "scope": "One baseline-selected actual defender per play. This is not an all-defenders production policy. Sparse changed requests can move later attempt timing and RNG consumption; contact execution is not matched after that divergence."},
          "primaryCases": primary_cases, "freshCases": fresh_cases, "profileSensitivities": sensitivity, "frozenSensitivities": frozen_metrics,
          "freshCounts": {a: counts(fresh_cases, a) for a in ["baseline", "arrival"]},
          "cleanFreshCounts": {a: counts(clean, a) for a in ["baseline", "arrival"]},
          "generatorAudit": generator,
          "freshInputManifest": [{"id": c["id"], "sampling": c["sampling"], "selectedBy": c["selectedBy"], "defender": c["defender"],
                                  "setupSha256": next(x["setupSha256"] for x in fresh_cases if x["id"] == c["id"]),
                                  "nativeSignature": c["nativeSignature"], "concept": c.get("operativeConcept"), "coverage": c["coverage"]} for c in inputs["clips"]],
          "rejectedV1": {"primarySource": v1["provenance"], "freshSource": v1fresh["provenance"], "guardSource": v1guards["provenance"],
                         "lostInterception": brief(next(c for c in v1guards["cases"] if c["id"] == "R7204-S4001-P16")),
                         "freshGains": [{"id": c["id"], "outcomes": [{"arm": a["arm"], "end": a["result"]["outcome"], "yac": a["result"]["stats"].get("yac")} for a in c["outcomes"]]} for c in v1fresh["cases"]]},
          "provenance": {"primary": primary["provenance"], "fresh": fresh["provenance"], "capabilities": v1["provenance"],
                         "frozen": frozen["provenance"], "freshCollector": inputs["provenance"]}, "receipts": receipts,
          "artifactSha256": {str(p.relative_to(ROOT)): sha(p) for p in [OUT/"fresh-guarded-inputs.json", OUT/"primary/summary.json",
                OUT/"frozen/summary.json", OUT/"fresh/summary.json", OUT/"guards/summary.json", OUT/"revised-primary/summary.json", OUT/"revised-fresh/summary.json"]}}
full_destination = OUT / "report.json"
full_destination.write_text(json.dumps(report, separators=(",", ":"))+"\n")

def compact_metric(a):
    g = a["firstSelectedGrip"]
    grip = {k: g[k] for k in ["origin", "firstLoaded", "brokenAt", "entryGeometry", "entryHeadingDifferenceDegrees",
                            "initialCapacity", "acquisitionQuality", "execution", "legs", "survivalObserved",
                            "survivalCensoredByEndingOrRelease", "maxRunnerXiWhilePresent", "maxDefenderXiWhilePresent"]} if g else None
    d = a["selectedDefender"]
    return {k: a[k] for k in ["arm", "signature", "prefixSha256", "observerVerified", "artifact", "actualReceiverId", "outcome",
                              "possession", "completedPass", "yac", "penalty", "interceptedBy", "censored", "changedCalls",
                              "protectedBallCalls", "protectedCarryCalls", "runnerFallTicks", "defenderFallTicks", "otherDefenderWraps", "wrapsAfterSelectedLoad"]} | {
        "selectedDefender": {k: d[k] for k in ["idx", "id", "slot"]}, "generatedBalance": d["ratings"]["balance"],
        "recovery": {k: d["profile"][k] for k in ["balance", "stepSpeed", "bend", "getUp"]}, "firstSelectedGrip": grip,
        "catchAchieved": a["catch"]["after"] if a["catch"] else None,
        "firstChangedRequest": {"t": a["firstChangedRequest"]["t"], "choice": a["firstChangedRequest"]["choice"],
                                "before": a["firstChangedRequest"]["sample"]["before"], "after": a["firstChangedRequest"]["sample"]["after"],
                                "applied": a["firstChangedRequest"]["sample"]["applied"]} if a["firstChangedRequest"] else None}

compact = {k: report[k] for k in ["schema", "summaryToolSha256", "baseline", "sourceSha256", "readiness", "definitions", "freshCounts",
                                 "cleanFreshCounts", "generatorAudit", "freshInputManifest", "provenance", "receipts", "artifactSha256"]}
compact["primaryCases"] = [{**{k: c[k] for k in ["id", "defender", "setupSha256"]}, "outcomes": [compact_metric(a) for a in c["outcomes"]]} for c in primary_cases]
compact["freshCases"] = [{**{k: c[k] for k in ["id", "defender", "setupSha256"]}, "outcomes": [compact_metric(a) for a in c["outcomes"]]} for c in fresh_cases]
compact["profileSensitivities"] = [{"id": c["id"], "outcomes": [{"arm": a["arm"], "yac": a["yac"], "outcome": a["outcome"],
    "signature": a["signature"], "changed": a["mutation"]["changed"], "originalRating": a["mutation"]["originalRating"],
    "hypotheticalRating": a["mutation"]["hypotheticalRating"],
    "support": {k: a["mutation"]["supportAfter"][k] for k in ["baseRadius", "stepSpeed", "bend", "getUp", "baseAtPosture", "freeFallThreshold"]}}
    for a in c["outcomes"]]} for c in sensitivity]
compact["frozenSensitivities"] = [{"id": c["id"], "outcomes": [{"arm": a["arm"], "prefixSha256": a["prefixSha256"],
    "initialHoldSha256": a["initialHoldSha256"], "censored": True, "first": a["rows"][0], "last": a["rows"][-1],
    "firstBrokenBoundary": next((r["stepEnd"] for r in a["rows"] if r["broken"]), None)} for a in c["outcomes"]]} for c in frozen_metrics]
compact["rejectedV1"] = {k: report["rejectedV1"][k] for k in ["primarySource", "freshSource", "guardSource", "freshGains"]}
compact["rejectedV1"]["lostInterception"] = {"id": report["rejectedV1"]["lostInterception"]["id"],
    "outcomes": [compact_metric(a) for a in report["rejectedV1"]["lostInterception"]["outcomes"]]}
compact["fullLocalReport"] = {"path": str(full_destination.relative_to(ROOT)), "sha256": sha(full_destination)}
destination = ROOT / "data/reviews/current/moving-arrival-diagnosis.json"
destination.write_text(json.dumps(compact, separators=(",", ":"))+"\n")
print(json.dumps({"primary": len(primary_cases), "fresh": report["freshCounts"], "cleanFresh": report["cleanFreshCounts"],
                  "bytes": destination.stat().st_size, "generator": {p: generator[p] for p in ["LB", "CB", "S", "WR", "RB"]}}))
