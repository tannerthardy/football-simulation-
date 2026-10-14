#!/usr/bin/env python3
"""Reduce frozen Ace packets; never creates or advances a simulation.

Pins are hashes of the compressed input bytes, not re-encoded JSON. Controller
entry t, post-World body time after, and historical event labels stay distinct.
"""

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import time


BASELINE = "4ded6b600fd3785e65034aa5623d7a9f8f3c5db1"
ISOLATED_SOURCE = "c6b2c179a896aa1c9593def9af01c4869306a63bba9196a04e450e53f55d1904"
CASES = ("uc12-wz-s3", "uc12-wz-s3-mirror", "uc12-wz-weak-s3")
INPUTS = {
    "strong": ("/workspace/football-under-center-zone/out/under-center-zone/carrier-design.json.gz", "341834f4baa35bfb76534ccc04cb2ff28dd0af382b052a3cb7d68cedcfdce916"),
    "weak": ("/workspace/football-under-center-zone/out/under-center-zone/carrier-design-weak.json.gz", "5eb926f1494995413cc15957141bbee08878961a34aaf450ad3963993809bdba"),
    "isolated": ("/workspace/football-contact-law-isolation/out/contact-isolation/protection.json.gz", "3d101564c9c4add6fcc506f24fb6dfdf63923bd1db26343513a42005348f50c6"),
    "isolated-receipt": ("/workspace/football-contact-law-isolation/data/reviews/current/contact-law-isolation.json", "b72f0b599e0579fbf93ad37d841b1de4337213caaae0c53593b2d9e3768ff4a6"),
}
EPS = 1e-9
BLOCKERS = (1, 2, 3, 4, 5, 7, 8, 9, 10)
RUNNER = 6


def read_pinned(path, pin):
    raw = Path(path).read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    if actual != pin:
        raise ValueError(f"Input SHA256 mismatch for {path}: expected {pin}, got {actual}")
    return json.loads(gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw), {"path": str(path), "sha256": actual, "bytes": len(raw)}


def interval(frame):
    return {"controllerT": frame["t"], "postBodyT": frame["after"]}


def world(frame):
    return frame.get("physicsInput", frame.get("worldInput"))


def post_bodies(frame):
    if "physicsInput" in frame:
        return frame["physicsInput"]["afterBodies"]
    return [a["body"] for a in frame["agents"]]


def outputs(frame):
    w = world(frame)
    # The isolated packet keeps pre-tackle outputs even when tackle removes the
    # blocking joints. frame.jointOutputs also contains newly installed grasps.
    return w.get("jointOutputsAtWorldEnd", w.get("jointOutputs", []))


def report(frame):
    return frame.get("report", world(frame).get("report"))


def distance(a, b):
    return math.hypot(a["pos"]["x"] - b["pos"]["x"], a["pos"]["y"] - b["pos"]["y"])


def endpoints(record, contact=False):
    return (record["i"], record["j"]) if contact else (record["a"], record["b"])


def pair_matches(record, a, b, contact=False):
    return set(endpoints(record, contact)) == {a, b}


def named(identifier, slots):
    return {"id": identifier, "slot": slots[identifier]}


def snap_ledger(run):
    agents = run["frames"][0]["agents"]
    slots = [a["slot"] for a in agents]
    rows = [{"defender": named(i, slots), "direct": [], "conditionalTransfer": []} for i in range(11, 22)]
    combinations = {}
    jobs = []
    for a in agents:
        work = a.get("work")
        if not work:
            continue
        owner = named(a["id"], slots)
        target = work["target"]["agent"]
        rows[target - 11]["direct"].append({"blocker": owner, "kind": work["kind"]})
        jobs.append({"blocker": owner, "kind": work["kind"], "target": named(target, slots), "drive": work["drive"]})
        combo = work.get("combination")
        if combo:
            key = tuple(x["agent"] for x in combo["members"])
            combinations[key] = {"members": [named(i, slots) for i in key], "defender": named(combo["defender"]["agent"], slots), "backer": named(combo["backer"]["agent"], slots)}
    for combo in combinations.values():
        rows[combo["backer"]["id"] - 11]["conditionalTransfer"].append(combo)
    return {"jobs": jobs, "combinations": list(combinations.values()), "threats": rows}, slots


def transitions(run, slots):
    result = []
    # Only baseline serializes mutable assignments. An event is evidence of a
    # release in the isolated packet; absence of serialized work is not no job.
    if "players" in run:
        for actor in BLOCKERS:
            previous = None
            for frame in run["frames"]:
                work = frame["agents"][actor].get("work")
                signature = None if work is None else (work["kind"], work["target"]["agent"])
                if signature != previous:
                    result.append({**interval(frame), "blocker": named(actor, slots), "work": None if signature is None else {"kind": signature[0], "target": named(signature[1], slots)}, "evidence": "saved mutable work after controller/World step"})
                    previous = signature
    return result


def compact_body(frame, actor, slots):
    pre = world(frame)["beforeBodies"][actor]
    post = post_bodies(frame)[actor]
    dt = frame["after"] - frame["t"]
    final_intent = world(frame)["intents"][actor]
    profile = pre["profile"]
    return {
        **named(actor, slots),
        "pre": {k: pre[k] for k in ("pos", "vel", "facing", "spin") if k in pre},
        "post": {k: post[k] for k in ("pos", "vel", "facing", "spin") if k in post},
        "supportPre": {k: pre["support"][k] for k in ("state", "posture", "felt", "xi")},
        "serializedRequested": frame["agents"][actor].get("requested"),
        "finalWorldIntent": final_intent,
        "achievedAverageVelocity": {k: (post["pos"][k] - pre["pos"][k]) / dt for k in ("x", "y")},
        "limits": {k: profile[k] for k in ("radius", "reach", "vmax", "tau", "brake", "lateral", "turnRate", "massKg")},
    }


def compact_cue(cue, slots):
    actor = cue.get("actor", cue.get("defender"))
    target = cue.get("target", cue.get("opponent"))
    return {"t": cue["t"], "actor": named(actor, slots), "target": named(target, slots), "seen": cue["seen"], **({"actualAtObservation": cue["actual"]} if "actual" in cue else {})}


def contact_record(frame, entry, hand=False):
    result = {**interval(frame), "kind": "hands" if hand else "body", **entry}
    result["timing"] = "final substep output, not tick-average or acquisition instant" if hand else "impulse accumulated within this World interval"
    return result


def pair_audit(run, actor, defender, slots, until):
    closest_pre = None
    closest_post = None
    first_joint = None
    hand_loads = []
    body_impulses = []
    cues = []
    arrival_frame = None
    first_hand_all = None
    first_body_all = None
    for frame in run["frames"]:
        if first_hand_all is None:
            for joint in outputs(frame):
                if joint["kind"] == "hands" and pair_matches(joint, actor, defender) and math.hypot(joint.get("normalForce", 0), joint.get("tangentForce", 0)) > EPS:
                    first_hand_all = contact_record(frame, joint, hand=True)
                    break
        if first_body_all is None:
            for body in report(frame)["contacts"]:
                if pair_matches(body, actor, defender, contact=True) and body["impulse"] > EPS:
                    first_body_all = contact_record(frame, body)
                    break
    for frame in run["frames"]:
        if frame["t"] > until + EPS:
            break
        pre, post = world(frame)["beforeBodies"], post_bodies(frame)
        for bodies, key in ((pre, "pre"), (post, "post")):
            point = {**interval(frame), "sample": key, "distanceYd": distance(bodies[actor], bodies[defender])}
            if key == "pre" and (closest_pre is None or point["distanceYd"] < closest_pre["distanceYd"]):
                closest_pre = point
            if key == "post" and (closest_post is None or point["distanceYd"] < closest_post["distanceYd"]):
                closest_post = point
        for joint in world(frame)["jointInputs"]:
            if joint["kind"] == "hands" and pair_matches(joint, actor, defender) and first_joint is None:
                first_joint = {**interval(frame), "kind": "hands", "normalRequest": joint.get("push", 0), "holdRequest": joint.get("hold", 0), "steerRequest": joint.get("steer", 0)}
        for joint in outputs(frame):
            if joint["kind"] == "hands" and pair_matches(joint, actor, defender) and math.hypot(joint.get("normalForce", 0), joint.get("tangentForce", 0)) > EPS:
                hand_loads.append(contact_record(frame, joint, hand=True))
        for body in report(frame)["contacts"]:
            if pair_matches(body, actor, defender, contact=True) and body["impulse"] > EPS:
                body_impulses.append(contact_record(frame, body))
        for cue in frame["cues"]:
            if cue.get("actor", cue.get("defender")) == actor and cue.get("target", cue.get("opponent")) == defender:
                cues.append(compact_cue(cue, slots))
        if abs(frame["t"] - until) < EPS:
            arrival_frame = frame
    arrival = None
    if arrival_frame is not None:
        w = world(arrival_frame)
        arrival = {
            **interval(arrival_frame),
            "distancePreYd": distance(w["beforeBodies"][actor], w["beforeBodies"][defender]),
            "distancePostYd": distance(post_bodies(arrival_frame)[actor], post_bodies(arrival_frame)[defender]),
            "handsAtWorldEnd": [j for j in outputs(arrival_frame) if j["kind"] == "hands" and pair_matches(j, actor, defender)],
            "bodyImpulsesInInterval": [c for c in report(arrival_frame)["contacts"] if pair_matches(c, actor, defender, contact=True)],
            "blocker": compact_body(arrival_frame, actor, slots),
        }
    return {
        "blocker": named(actor, slots), "defender": named(defender, slots),
        "cutoffEventT": until,
        "closestPre": closest_pre, "closestPost": closest_post,
        "firstNominalHandJointInput": first_joint,
        "firstLoadedHandOutput": hand_loads[0] if hand_loads else None,
        "firstLoadedHandOutputAnywhereInNativeRun": first_hand_all,
        "lastLoadedHandOutput": hand_loads[-1] if hand_loads else None,
        "loadedHandIntervals": len(hand_loads),
        "firstBodyImpulse": body_impulses[0] if body_impulses else None,
        "firstBodyImpulseAnywhereInNativeRun": first_body_all,
        "lastBodyImpulse": body_impulses[-1] if body_impulses else None,
        "positiveBodyImpulseIntervals": len(body_impulses),
        "capturedCueCount": len(cues), "latestCapturedCue": cues[-1] if cues else None,
        "arrival": arrival,
    }


def owners_for(threat):
    direct = {r["blocker"]["id"] for r in threat["direct"]}
    conditional = {m["id"] for c in threat["conditionalTransfer"] for m in c["members"]}
    return sorted(direct | conditional)


def audit_run(run, snap, slots, model):
    first = next((e for e in run["events"] if e["type"] == "carrier_contact"), None)
    cutoff = first["t"] if first else run["endTime"]
    reach_events = [e for e in run["events"] if e["type"] in ("carrier_contact", "tackle_wrap") and RUNNER in (e["a"], e.get("b"))]
    first_defender = None if first is None else first["b"] if first["a"] == RUNNER else first["a"]
    ledger = []
    for threat in snap["threats"]:
        defender = threat["defender"]["id"]
        relevant_events = [e for e in reach_events if defender in (e["a"], e.get("b"))]
        threat_cutoff = relevant_events[0]["t"] if relevant_events else cutoff
        pair_rows = [pair_audit(run, actor, defender, slots, threat_cutoff) for actor in owners_for(threat)]
        # These non-assigned contacts distinguish job responsibility from actual
        # collision/help. They do not retroactively create a snap assignment.
        first_actual_hand = None
        first_actual_body = None
        for frame in run["frames"]:
            if frame["t"] > threat_cutoff + EPS:
                break
            for joint in outputs(frame):
                a, b = endpoints(joint)
                other = b if a == defender else a if b == defender else None
                if joint["kind"] == "hands" and other in BLOCKERS and math.hypot(joint.get("normalForce", 0), joint.get("tangentForce", 0)) > EPS and first_actual_hand is None:
                    first_actual_hand = {"blocker": named(other, slots), **contact_record(frame, joint, hand=True)}
            for body in report(frame)["contacts"]:
                a, b = endpoints(body, contact=True)
                other = b if a == defender else a if b == defender else None
                if other in BLOCKERS and body["impulse"] > EPS and first_actual_body is None:
                    first_actual_body = {"blocker": named(other, slots), **contact_record(frame, body)}
        ledger.append({**threat, "evaluatedThrough": {"eventT": threat_cutoff, "reason": "this defender's first recorded runner contact/wrap" if relevant_events else "run's first runner contact; full-run earliest assigned loads retained separately"},
                       "assignedPairEvidenceThroughFirstRunnerEvent": pair_rows,
                       "actualTransferEvents": [e for e in run["events"] if e["type"] == "block_climb" and e.get("b") == defender],
                       "earliestAnyBlockerLoadedHand": first_actual_hand,
                       "earliestAnyBlockerBodyImpulse": first_actual_body,
                       "runnerEvents": relevant_events})
    first_row = None if first_defender is None else ledger[first_defender - 11]
    returns = {
        "model": model, "input": run["input"],
        "nativeEnding": {k: run[k] for k in ("endTime", "outcome", "gain", "censoring", "censored", "live", "endSpot", "crossing") if k in run},
        "observerNeutral": run["observerNeutral"],
        "firstRunnerContactEvent": first,
        "firstRunnerDefenderResponsibility": None if first_row is None else {k: first_row[k] for k in ("defender", "direct", "conditionalTransfer")},
        "allRunnerEvents": reach_events,
        "releaseEvents": [e for e in run["events"] if e["type"] in ("block_climb", "block_abandon")],
        "mutableAssignmentTransitions": transitions(run, slots),
        "assignmentEvidence": "serialized baseline snap and mutable work" if model == "historical baseline" else "baseline snap reused for identical saved input and matching first 8 state hashes; explicit native release events; evolving work not captured",
        "threatLedger": ledger,
    }
    # Minimal portable film points: first runner event and nearest pre sample
    # for each assigned blocker responsible for that defender. No interception
    # is inferred from this geometry.
    times = {cutoff}
    actors = {RUNNER, 15, 18}
    if first_row:
        actors.add(first_defender)
        for pair in first_row["assignedPairEvidenceThroughFirstRunnerEvent"]:
            actors.add(pair["blocker"]["id"])
            times.add(pair["closestPre"]["controllerT"])
    points = []
    for frame in run["frames"]:
        if frame["t"] in times:
            selected = sorted(actors)
            points.append({**interval(frame), "bodies": [portable_body(frame, a) for a in selected],
                           "handsAtWorldEnd": [j for j in outputs(frame) if j["kind"] == "hands" and j["a"] in actors and j["b"] in actors],
                           "bodyImpulses": [c for c in report(frame)["contacts"] if c["i"] in actors and c["j"] in actors]})
    mini = {k: returns[k] for k in ("model", "nativeEnding", "firstRunnerContactEvent", "firstRunnerDefenderResponsibility", "releaseEvents", "assignmentEvidence")}
    mini["firstRunnerAssignedPairEvidence"] = [] if first_row is None else [{k: p[k] for k in ("blocker", "defender", "closestPre", "closestPost", "firstLoadedHandOutput", "lastLoadedHandOutput", "firstBodyImpulse", "latestCapturedCue")} for p in first_row["assignedPairEvidenceThroughFirstRunnerEvent"]]
    mini["criticalBodyPoints"] = points
    return returns, mini


def portable_body(frame, actor):
    pre, post = world(frame)["beforeBodies"][actor], post_bodies(frame)[actor]
    vector = lambda b: [b["pos"]["x"], b["pos"]["y"], b["vel"]["x"], b["vel"]["y"], b["facing"], b.get("spin", 0)]
    dt = frame["after"] - frame["t"]
    return {"id": actor, "pre": vector(pre), "post": vector(post),
            "finalWorldVelocity": world(frame)["intents"][actor]["vel"],
            "achievedAverageVelocity": {k: (post["pos"][k] - pre["pos"][k]) / dt for k in ("x", "y")},
            "supportPre": {k: pre["support"][k] for k in ("state", "posture", "felt")}}


def main():
    start = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    for key, (path, _) in INPUTS.items():
        parser.add_argument(f"--{key}", default=path)
    parser.add_argument("--out", default="out/ol-technique/responsibility.json")
    parser.add_argument("--witness", default="docs/reviews/ol-responsibility-witness.json")
    args = parser.parse_args()
    docs, provenance = {}, {}
    for key, (_, pin) in INPUTS.items():
        docs[key], provenance[key] = read_pinned(getattr(args, key.replace("-", "_")), pin)
    receipt = docs["isolated-receipt"]
    if receipt["testedRuntimeSourceSha256"] != ISOLATED_SOURCE or receipt["rawSha256"]["protection.json.gz"] != provenance["isolated"]["sha256"]:
        raise ValueError("Isolated receipt is incompatible with the saved protection packet")
    baseline_runs = {r["input"]["id"]: r for key in ("strong", "weak") for r in docs[key]["panel"]}
    isolated_runs = {r["input"]["id"]: r for r in docs["isolated"]["panel"]}
    if set(baseline_runs) != set(CASES) or set(isolated_runs) != set(CASES):
        raise ValueError("The saved panel must contain exactly the three declared Ace controls")
    cases, mini_cases = [], []
    roster_bodies = world(baseline_runs[CASES[0]]["frames"][0])["beforeBodies"]
    for case_id in CASES:
        baseline, isolated = baseline_runs[case_id], isolated_runs[case_id]
        if baseline["input"] != isolated["input"] or baseline["initial"] != isolated["initial"]:
            raise ValueError(f"Inputs/initial placements differ: {case_id}")
        if baseline["hashes"][:8] != isolated["hashes"][:8]:
            raise ValueError(f"Expected common no-contact prefix differs: {case_id}")
        snap, slots = snap_ledger(baseline)
        if len(slots) != 22 or len(snap["jobs"]) != 9:
            raise ValueError(f"Unexpected player/job shape: {case_id}")
        if [b["profile"] for b in world(baseline["frames"][0])["beforeBodies"]] != [b["profile"] for b in roster_bodies]:
            raise ValueError(f"The common roster map differs: {case_id}")
        precontact = next(f for f in baseline["frames"] if abs(f["t"] - .4) < EPS)
        isolated_precontact = next(f for f in isolated["frames"] if abs(f["t"] - .4) < EPS)
        te_vectors = [portable_body(precontact, i)["pre"] for i in (7, 10)]
        if te_vectors != [portable_body(isolated_precontact, i)["pre"] for i in (7, 10)]:
            raise ValueError(f"Expected unchanged pre-contact TE state differs: {case_id}")
        native = []
        minis = []
        for model, run in (("historical baseline", baseline), ("isolated contact-law experiment", isolated)):
            result, mini = audit_run(run, snap, slots, model)
            native.append(result)
            minis.append(mini)
        cases.append({"id": case_id, "snap": snap, "native": native})
        mini_cases.append({"id": case_id, "input": baseline["input"], "snap": snap,
                           "snapBodies": [{**named(i, slots), "pos": b["pos"]} for i, b in enumerate(world(baseline["frames"][0])["beforeBodies"])],
                           "preContactTEs": {"controllerT": .4, "state": "pre World step; equal baseline/isolated", "bodies": [{**named(i, slots), "pre": v} for i, v in zip((7, 10), te_vectors)]},
                           "native": minis})
    metadata = {
        "protocol": "ol-responsibility-saved-packets-v1", "comparisonBaseline": BASELINE,
        "isolatedRuntimeSourceSha256": ISOLATED_SOURCE, "currentDevelopTested": False,
        "isolatedSettings": {"selection": receipt["isolatedSelection"], "flags": receipt["flags"], "protectionCollectorRevision": receipt["testedRevisions"]["protection-checks.json"]},
        "rosterLimits": [{"id": i, "limits": {k: b["profile"][k] for k in ("radius", "reach", "vmax", "tau", "brake", "lateral", "turnRate", "massKg", "power", "balance", "bend")}} for i, b in enumerate(roster_bodies)],
        "inputs": provenance, "baselineCollectorProvenance": {k: docs[k]["provenance"] for k in ("strong", "weak")},
        "isolatedCollectorProvenance": {k: v for k, v in docs["isolated"].items() if k != "panel"},
        "nativeTicksAdvanced": 0,
        "timing": {"controllerT": "frame.t; pre bodies at entry to World step", "postBodyT": "frame.after = t + .05; saved agents are post-step", "events": "exact native event labels retained; block_contact uses post time; carrier_contact uses controller time, including body collisions emitted after World", "hands": "final-substep delivered outputs, not tick-average force", "bodyImpulses": "accumulated within labeled World interval; not an exact first substep time", "portableBodyVector": "[x, y, vx, vy, facing, spin]; limits are in rosterLimits; slot map and positions in snapBodies"},
        "limits": ["Assignment, nominal joint, delivered force and route protection are distinct.", "Static distance and requested velocity do not certify achievable interception.", "Serialized requested commands may be placeholders for engagement; finalWorldIntent is the delivered target, not achieved movement.", "No captured pair cue is an evidence gap, not proof the player lacked information.", "Conditional snap combo ownership is not a guarantee either member has already climbed.", "Joint retention law remains under physics-owner review; experimental failures are not certified lawful defensive wins.", "No native reruns, new roster panel, full games, controller/solver changes or current-develop transfer inference."],
    }
    full = {**metadata, "cases": cases, "runtimeSeconds": time.perf_counter() - start}
    portable = {**metadata, "cases": mini_cases}
    for path, content in ((args.out, full), (args.witness, portable)):
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(content, indent=2) + "\n" if path == args.out else json.dumps(content, separators=(",", ":")) + "\n")
    print(json.dumps({"cases": len(cases), "nativeTicksAdvanced": 0, "runtimeSeconds": full["runtimeSeconds"], "output": args.out, "witness": args.witness, "witnessBytes": Path(args.witness).stat().st_size}))


if __name__ == "__main__":
    main()
