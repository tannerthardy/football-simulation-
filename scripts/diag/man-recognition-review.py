#!/usr/bin/env python3
"""Compare saved native man-recognition tapes; never imports/runs the engine.

Repeat --pair BASE CAND. Raw tapes remain in ignored out/; output is a compact
review packet, not an attribution of changed endings to isolated execution.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path


BASE_SOURCE = "2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad"
CAND_SOURCE = "d41b6b19e84846ff7c2a2af00fefe1aaef88935ce01b59db785112d7f7384aa2"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path):
    data = Path(path).read_bytes()
    return json.loads(gzip.decompress(data) if path.endswith(".gz") else data)


def identity(clip, idx):
    if idx is None:
        return None
    p = clip["players"][idx]
    assert p["idx"] == idx
    return {k: p[k] for k in ("idx", "id", "slot")}


def norm(v):
    return math.hypot(v["x"], v["y"])


def vector(a, b):
    return {"x": a["x"] - b["x"], "y": a["y"] - b["y"]}


def body_view(body):
    return {"pos": body["pos"], "vel": body["vel"], "speedYdS": norm(body["vel"]),
            "facingRad": body["facing"],
            "supportState": body.get("support", {}).get("state")}


def geometry(clip, bodies, defender, receiver):
    d, r = bodies[defender], bodies[receiver]
    delta = vector(d["pos"], r["pos"])
    relative = vector(d["vel"], r["vel"])
    gap, speed = norm(delta), norm(r["vel"])
    along = across = heading = None
    if speed > .5:
        ux, uy = r["vel"]["x"] / speed, r["vel"]["y"] / speed
        along = delta["x"] * ux + delta["y"] * uy
        across = -delta["x"] * uy + delta["y"] * ux
        if norm(d["vel"]) > .5:
            diff = math.atan2(d["vel"]["y"], d["vel"]["x"]) - math.atan2(uy, ux)
            heading = abs(math.degrees(math.atan2(math.sin(diff), math.cos(diff))))
    return {"defender": identity(clip, defender), **body_view(d),
            "gapYd": gap, "fieldOffsetYd": delta,
            "alongYd": along, "acrossYd": across,
            "headingErrorDeg": heading,
            "radialClosingYdS": -(relative["x"] * delta["x"] + relative["y"] * delta["y"]) / gap if gap else 0}


def row_at(clip, t):
    hits = [r for r in clip["rows"] if abs(r["t"] - t) < 1e-7 and r.get("world")]
    assert len(hits) <= 1
    return hits[0] if hits else None


def stage(clip, row, receiver, defenders, phase="before"):
    if row is None or receiver is None:
        return None
    bodies = row["world"][phase]
    return {"stepAt": row["t"], "phase": phase,
            "receiver": {"identity": identity(clip, receiver), **body_view(bodies[receiver])},
            "defenders": [geometry(clip, bodies, d, receiver) for d in sorted(set(defenders))]}


def raw_map(row):
    # One top-level behavior request per recorded defender/tick.
    result = {r["actor"]: r for r in row["raw"]}
    assert len(result) == len(row["raw"])
    return result


def unaware(raw):
    f = raw.get("flight")
    return bool(raw.get("man") and f and "onBall" not in f["tagsAfter"])


def incidence(clip):
    pairs = {}
    for row in clip["rows"]:
        for raw in row["raw"]:
            if unaware(raw):
                key = (raw["actor"], raw["target"])
                pairs.setdefault(key, []).append(row["t"])
    return [{"defender": identity(clip, d), "receiver": identity(clip, r),
             "ticks": len(ts), "firstAt": ts[0], "lastAt": ts[-1]}
            for (d, r), ts in sorted(pairs.items())]


def consumed(row, raw):
    # The final target query supplies ordinary man steering (including its
    # stable-stem delayScale); earlier identical queries add no sightings.
    # Keep its exact picture, plus the count/time of other consumed queries.
    out = []
    for cue in row["cues"][raw["cueStart"]:raw["cueEnd"]]:
        if cue["target"] != raw.get("target"):
            continue
        sample = {"target": cue["target"], "delayScaleArgs": cue["args"],
                  "sampleAt": row["t"] - cue["picture"].get("age", 0),
                  "picture": cue["picture"]}
        if sample not in out:
            out.append(sample)
    return {"lastTargetQuery": out[-1] if out else None,
            "distinctTargetQueries": len(out),
            "otherSampleTimes": [cue["sampleAt"] for cue in out[:-1]]}


def first_differences(base, cand):
    b_rows, c_rows = {r["t"]: r for r in base["rows"]}, {r["t"]: r for r in cand["rows"]}
    all_first, first_man = None, {}
    for t in sorted(set(b_rows) & set(c_rows)):
        br, cr = b_rows[t], c_rows[t]
        bm, cm = raw_map(br), raw_map(cr)
        assert set(bm) == set(cm), f"Recorded actor scope changed at {base['id']} {t}"
        changed = [a for a in bm if bm[a]["request"] != cm[a]["request"]]
        if all_first is None:
            assert br["world"]["before"] == cr["world"]["before"], \
                f"Body divergence before first recorded request difference: {base['id']} {t}"
            if changed:
                all_first = {"at": t, "actors": [identity(base, a) for a in changed],
                             "allIncomingBodiesExactlyEqual": True}
        for a in changed:
            if a in first_man or not (bm[a].get("man") or cm[a].get("man")):
                continue
            braw, craw = bm[a], cm[a]
            own_b, own_c = br["world"]["before"][a], cr["world"]["before"][a]
            first_man[a] = {"at": t, "defender": identity(base, a),
                            "assignedReceiverBaseline": identity(base, braw.get("target")),
                            "assignedReceiverCandidate": identity(cand, craw.get("target")),
                            "sameIncomingOwnBody": own_b == own_c,
                            "baseline": {"unrecognizedThrow": unaware(braw), "man": braw.get("man"),
                                         "request": braw["request"], "acquiredTargetCues": consumed(br, braw)},
                            "candidate": {"unrecognizedThrow": unaware(craw),
                                          "request": craw["request"], "acquiredTargetCues": consumed(cr, craw)}}
            first_man[a]["candidate"]["man"] = ("same as baseline" if craw.get("man") == braw.get("man")
                                                else craw.get("man"))
    return all_first, list(first_man.values())


def receiver_event(clip):
    events = clip["result"]["events"]
    return next((e for e in events if e["type"] == "catch"), None)


def contact_event(clip, catch):
    if not catch:
        return None
    return next((e for e in clip["result"]["events"]
                 if e["type"] == "carrier_contact" and e.get("a") == catch["a"]
                 and e["t"] >= catch["t"]), None)


def first_contact_stage(clip, event, receiver, defenders):
    if event is None:
        return None
    # Body contact events use the completed step boundary (t+dt); grasp
    # acquisition events use controller tick t after World. They are not the
    # same as the next step's first solved grasp/load sample.
    if event.get("note") == "body collision":
        matching = [row for row in clip["rows"] if row.get("world") and
                    row["t"] <= event["t"] + 1e-7 and
                    any({c["i"], c["j"]} == {event["a"], event["b"]}
                        for c in row["world"]["contacts"])]
        prior = [row for row in matching if row["t"] < event["t"] - 1e-7]
        row = max(prior, key=lambda r: r["t"]) if prior else row_at(clip, event["t"])
    else:
        row = row_at(clip, event["t"])
    return stage(clip, row, receiver, defenders, "after")


def grip(clip, receiver, catch_at):
    if receiver is None:
        return None
    samples = [(i, row, j) for i, row in enumerate(clip["rows"])
               if row.get("world") and row["t"] >= catch_at
               for j in row["world"]["grasps"] if receiver in (j["a"], j["b"])]
    if not samples:
        return None
    first_i, first_row, first = samples[0]
    defender = first["b"] if first["a"] == receiver else first["a"]
    members = {receiver, defender}
    episode = []
    absent_at = None
    for row in clip["rows"][first_i:]:
        joint = next((j for j in (row.get("world") or {}).get("grasps", [])
                      if {j["a"], j["b"]} == members), None)
        if joint is None:
            absent_at = row["t"]
            break
        episode.append((row, joint))
    end = episode[-1][0]["t"]
    events = clip["result"]["events"]
    breaks = [e for e in events if e["type"] == "broken_tackle" and e.get("b") == defender
              and e.get("a") == receiver and first_row["t"] <= e["t"] <= (absent_at or end) + .05]
    tackle = next((e for e in events if e["type"] == "tackle" and e.get("b") == receiver
                   and first_row["t"] <= e["t"] <= end + .05 + 1e-7), None)
    forces = [j.get("force", 0) for _, j in episode]
    return {"defender": identity(clip, defender), "firstSolvedStepAt": first_row["t"],
            "firstJoint": first, "entryBeforeStep": geometry(clip, first_row["world"]["before"], defender, receiver),
            "entryReceiverBeforeStep": body_view(first_row["world"]["before"][receiver]),
            "recordedConsecutiveSteps": len(episode), "lastPresentStepAt": end,
            "firstAbsentStepAt": absent_at, "recordedSpanSeconds": round(end - first_row["t"], 8),
            "slippingSteps": sum(bool(j.get("slipping")) for _, j in episode),
            "loadedSteps": sum(f > 1e-6 for f in forces), "firstForceEngineUnits": forces[0],
            "maxForceEngineUnits": max(forces), "meanForceEngineUnits": sum(forces) / len(forces),
            "capacityMinMax": [min(j["capacity"] for _, j in episode), max(j["capacity"] for _, j in episode)],
            "survivesThroughRecordedTackle": tackle is not None,
            "breakEvents": breaks,
            "ending": "tackle while retained" if tackle else "explicit break" if breaks else
                      "absent in later sample; cause unassigned" if absent_at is not None else
                      "present at tape ending; censored grip survival"}


def arm(clip, measured):
    result, events = clip["result"], clip["result"]["events"]
    stats = result["stats"]
    catch = receiver_event(clip)
    receiver = catch["a"] if catch else None
    contact = contact_event(clip, catch)
    first_defender = contact.get("b") if contact else None
    supports = [p["idx"] for p in clip["players"] if p["slot"] in ("FS", "SS")]
    defenders = sorted(set(measured) | set(supports) | ({first_defender} if first_defender is not None else set()))
    catch_row = row_at(clip, catch["t"]) if catch else None
    terminal = any(e["type"] in ("tackle", "sack", "touchdown", "out_of_bounds", "incomplete", "interception", "touchback", "safety")
                   for e in events)
    # Native PlaySim.run returns a completed result. A recognized terminal
    # event provides stronger explicit evidence than duration/last frame alone.
    status = "completed outcome" if terminal else "unconfirmed terminal/censored"
    return {"signature": clip["signature"], "observerNeutral": clip.get("observerNeutral"),
            "outcome": result["outcome"], "completionStatus": status, "completedPass": bool(stats.get("completed")),
            "sacked": bool(stats.get("sacked")), "yac": stats.get("yac") if stats.get("completed") else None,
            "end": {k: result[k] for k in ("endX", "endY", "duration")},
            "actualCatcher": identity(clip, receiver),
            "firstReceiverContactDefender": identity(clip, first_defender),
            "catchEvent": catch, "firstReceiverContactEvent": contact,
            "unrecognizedMan": incidence(clip),
            "catchBeforeStep": stage(clip, catch_row, receiver, defenders),
            "firstContactAfterStep": first_contact_stage(clip, contact, receiver, defenders),
            "firstSolvedGrasp": grip(clip, receiver, catch["t"] if catch else 0),
            "receiverFalls": [e for e in events if receiver is not None and e["type"] == "fall" and e.get("a") == receiver
                              and e["t"] >= catch["t"]],
            "receiverTackleEvents": [e for e in events if receiver is not None and e["type"] in
                                     ("missed_tackle", "tackle_wrap", "tackle") and e.get("b") == receiver
                                     and e["t"] >= catch["t"]]
                                    + [e for e in events if receiver is not None and e["type"] == "broken_tackle"
                                       and e.get("a") == receiver and e["t"] >= catch["t"]],
            "supportSlots": [identity(clip, i) for i in supports]}


def compare(base, cand):
    assert base["id"] == cand["id"]
    assert base["players"] == cand["players"], f"Player/profile mismatch: {base['id']}"
    assert base.get("observerNeutral") and cand.get("observerNeutral"), "Recorder neutrality is required"
    assert base["rows"][0]["world"]["before"] == cand["rows"][0]["world"]["before"]
    first, differences = first_differences(base, cand)
    catches = [receiver_event(c) for c in (base, cand)]
    receivers = {e["a"] for e in catches if e}
    if not receivers:
        # Audit-only subject selection, never a controller cue. Incomplete
        # passes have no actual catcher; retain intended-target separation.
        targets = {c["result"]["stats"].get("target") for c in (base, cand)}
        receivers = {p["idx"] for p in base["players"] if p["id"] in targets}
    measured = {raw["actor"] for c in (base, cand) for row in c["rows"] for raw in row["raw"]
                if raw.get("man") and raw.get("target") in receivers}
    for c, catch in zip((base, cand), catches):
        contact = contact_event(c, catch)
        if contact and contact.get("b") is not None:
            measured.add(contact["b"])
    measured |= {p["idx"] for p in base["players"] if p["slot"] in ("FS", "SS")}
    relevant = [d for d in differences if d["defender"]["idx"] in measured]
    other = [{"at": d["at"], "defender": d["defender"],
              "assignedReceiver": d["assignedReceiverBaseline"],
              "sameIncomingOwnBody": d["sameIncomingOwnBody"],
              "baselineRequest": d["baseline"]["request"], "candidateRequest": d["candidate"]["request"]}
             for d in differences if d["defender"]["idx"] not in measured]
    return {"id": base["id"], "initialAllBodiesExactlyEqual": True,
            "nativeSignatureEqual": base["signature"] == cand["signature"],
            "firstRecordedRequestDifference": first, "firstChangedManRequests": relevant,
            "otherManFirstDifferences": other,
            "baseline": arm(base, measured), "candidate": arm(cand, measured)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pair", nargs=2, action="append", required=True, metavar=("BASE", "CAND"))
    parser.add_argument("--out", required=True)
    parser.add_argument("--baseline-source", default=BASE_SOURCE)
    parser.add_argument("--candidate-source", default=CAND_SOURCE)
    args = parser.parse_args()
    output = {"schema": "man-recognition-saved-review-v1", "operatorSha256": sha(__file__),
              "nativeExecutions": 0, "pairs": [], "plays": [],
              "definitions": {
                  "sampling": "World before/after at labeled controller tick; catch and first-contact events retained separately.",
                  "leverage": "alongYd/acrossYd: defender minus receiver projected on receiver achieved velocity; across uses left-normal (-uy,ux). Null at receiver speed <=.5 yd/s; heading also null if defender speed <=.5.",
                  "unrecognizedMan": "Recorded man technique with flight inputs and no onBall tag after request.",
                  "grasp": "First solved receiver grasp and its uninterrupted recorded episode; absence alone does not prove slipping/break.",
                  "support": "FS/SS achieved geometry only; no claim of observed information, reachable help or sound assignment.",
                  "requestDetailScope": "Full first-fork cues for man defenders of the actual catcher (intended target when no catch), both arms' first-contact defenders, and FS/SS. Other man forks retain time/identity/requests. All-man incidence is retained.",
                  "limits": "Changed later bodies, contests and random draw ordering are not isolated. YAC alone is not a decision-quality verdict; no-contact/grasp=null is N/A, not tackle failure. Raw recording scopes can omit other defenders."}}
    ids = set()
    settings = None
    for bp, cp in args.pair:
        b, c = load(bp), load(cp)
        assert b["schema"] == c["schema"] == "p045-native-inspection-v1"
        assert b.get("model") is None and c.get("model") is None
        assert b["inputSha256"] == c["inputSha256"], "Different frozen inputs"
        assert b["provenance"]["sourceSha256"] == args.baseline_source
        assert c["provenance"]["sourceSha256"] == args.candidate_source
        for key in ("flags", "worldDefaults", "node", "lockSha256"):
            assert b["provenance"][key] == c["provenance"][key], f"Setting mismatch: {key}"
        current = {k: b["provenance"][k] for k in ("flags", "worldDefaults", "node", "lockSha256")}
        assert settings is None or current == settings, "Settings differ between input pairs"
        settings = current
        output["settings"] = settings
        assert settings["node"] == "v22.23.3"
        bm, cm = {x["id"]: x for x in b["clips"]}, {x["id"]: x for x in c["clips"]}
        assert set(bm) == set(cm), "Clip selection mismatch"
        def lean_provenance(packet):
            return {**{k: v for k, v in packet["provenance"].items() if k not in current},
                    "settingsRef": "settings"}
        pair = {"baseline": {"path": bp, "sha256": sha(bp), "provenance": lean_provenance(b)},
                "candidate": {"path": cp, "sha256": sha(cp), "provenance": lean_provenance(c)},
                "inputSha256": b["inputSha256"], "ids": list(bm)}
        output["pairs"].append(pair)
        for key in bm:
            assert key not in ids, f"Repeated play {key}"
            ids.add(key)
            output["plays"].append(compare(bm[key], cm[key]))
    # Keep exact first-request/cue evidence. Round only descriptive geometry
    # and scalar outcome summaries, not provenance, timing or the cue inputs.
    def rounded(value):
        if isinstance(value, float):
            assert math.isfinite(value)
            return round(value, 6)
        if isinstance(value, list):
            return [rounded(v) for v in value]
        if isinstance(value, dict):
            return {k: rounded(v) for k, v in value.items()}
        return value
    for play in output["plays"]:
        for key in ("baseline", "candidate"):
            play[key] = rounded(play[key])
    target = Path(args.out)
    assert not target.exists(), "Do not overwrite evidence"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
    print(json.dumps({"out": str(target), "sha256": sha(target), "bytes": target.stat().st_size,
                      "plays": len(output["plays"]), "nativeExecutions": 0}))


if __name__ == "__main__":
    main()
