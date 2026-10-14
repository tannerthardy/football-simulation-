#!/usr/bin/env python3
"""D03: saved histories only. Zero PlaySim/World calls and no new pictures.

The only executable physics helpers below are the existing pure support and
braking-envelope functions, used to reconstruct one spacing arithmetic step.
This is not an integration/continuation or a clearance feasibility oracle.
"""
import argparse
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import time

START = time.perf_counter()
parser = argparse.ArgumentParser()
parser.add_argument("--reference", default="data/reviews/current/ace-production-observations.json.gz")
parser.add_argument("--candidate", default="/workspace/football-te-base-production/out/te-base-production/native.json.gz")
parser.add_argument("--output", default="out/run-drills/d03-overlay.json")
args = parser.parse_args()
ref_bytes = Path(args.reference).read_bytes()
can_bytes = Path(args.candidate).read_bytes()
reference = json.loads(gzip.decompress(ref_bytes))
candidate = json.loads(gzip.decompress(can_bytes))
assert reference["provenance"]["sourceSha256"] == candidate["runtimeSourceSha256"]
assert candidate["savedSource"]["sha256"] == hashlib.sha256(ref_bytes).hexdigest()
assert len(reference["provenance"]["flags"]) == 44
assert reference["provenance"]["flags"]["RUN_READ"] == "0"
assert reference["provenance"]["flags"]["LIVE_AIM"] == "1"
rb = 6
ref = next(row for row in reference["panel"] if row["input"]["id"] == "uc12-wz-s3")
can = next(row["candidate"] for row in candidate["panel"] if row["candidate"]["input"]["id"] == "uc12-wz-s3")
slots = {a["idx"]: a["slot"] for a in ref["actors"]}
profiles = {a["idx"]: a["profile"] for a in ref["actors"]}


def angle(v):
    return math.degrees(math.atan2(v["y"], v["x"]))


def frame_at(frames, t):
    return next(f for f in frames if abs(f["t"] - t) < 1e-8)


def actor_at(f, idx, intervention=False):
    if intervention:
        a = next(a for a in f["agents"] if a["id"] == idx)
        b = a["body"]
        return {"idx": idx, "slot": a["slot"], "team": a["team"],
                "pos": b["pos"], "vel": b["vel"], "facing": b["facing"],
                "posture": b["support"]["posture"], "supportState": b["support"]["state"],
                "energy": b["energy"], "requested": a["requested"],
                "delivered": a["delivered"], "tags": a["tags"]}
    a = next(a for a in f["actors"] if a["idx"] == idx)
    return {"slot": slots[idx], **a}


rf = frame_at(ref["series"], 1.6)
cf = frame_at(can["frames"], 1.6)
rd = frame_at(ref["detailedFrames"], 1.6)
rr = actor_at(rf, rb)
cr = actor_at(cf, rb, True)
before_ref = next(b for b in rd["before"] if b["idx"] == rb)
before_can = cf["worldInput"]["beforeBodies"][rb]

# Reconstruct only recorded same-channel edge images. Teammate perception is
# observer-independent at .05s (PlaySim.see). The reducer retains these actual
# RT/Y pictures for other offensive observers, not RB's complete call payload.
accepted_edge = {}
for idx in (2, 7):
    qs = [q for q in rd["consumed"] if q["actor"] < 11 and q["target"] == idx]
    assert qs and all(q["seen"] == qs[0]["seen"] for q in qs)
    assert qs[0]["seen"]["age"] == .05
    accepted_edge[slots[idx]] = qs[0]["seen"]
candidate_first = {}
for q in cf["cues"]:
    if q["actor"] == rb and q["target"] in (1, 2, 3, 4, 5, 7, 10):
        if q["targetSlot"] in candidate_first:
            assert candidate_first[q["targetSlot"]] == q["seen"]
        candidate_first[q["targetSlot"]] = q["seen"]
assert len(candidate_first) == 7

# D-gap first-picture reconstruction from the saved candidate's complete
# consumed surface. None of its nondeparted bodies invokes the ambiguous
# engagement-dependent backfield departure branch at this interval.
homes = {slots[a["idx"]]: a["initialBody"]["pos"] for a in ref["actors"]}
present = {}
gone = {}
for slot, seen in candidate_first.items():
    depth = seen["pos"]["x"] - homes[slot]["x"]
    assert not (depth < -.5 and abs(seen["pos"]["y"] - homes[slot]["y"]) > 1)
    (gone if abs(depth) > 1.5 else present)[slot] = seen
center = present.get("C", {"pos": {"y": reference["manifest"]["ballY"]}})["pos"]["y"]
outward = sorted([(s, q["pos"]["y"]) for s, q in present.items()
                  if s != "C" and q["pos"]["y"] < center], key=lambda p: -p[1])
# Both departed actors in this first picture are on the opposite (+y) side.
assert all(homes[s]["y"] > homes["C"]["y"] for s in gone)
assert len(outward) == 3
candidate_edge_bound, candidate_bound_y = outward[2]
candidate_live_aim = {"x": 40.6, "y": candidate_bound_y - .7}
candidate_heading_reproduction = angle({"x": candidate_live_aim["x"] - before_can["pos"]["x"],
                                       "y": candidate_live_aim["y"] - before_can["pos"]["y"]})
assert abs(candidate_heading_reproduction - angle(cr["requested"]["vel"])) < 1e-12
accepted_bound = min(accepted_edge, key=lambda s: accepted_edge[s]["pos"]["y"])
accepted_reconstructed_edge_aim = {"x": 40.6, "y": accepted_edge[accepted_bound]["pos"]["y"] - .7}
accepted_heading_reproduction = angle({"x": accepted_reconstructed_edge_aim["x"] - before_ref["pos"]["x"],
                                      "y": accepted_reconstructed_edge_aim["y"] - before_ref["pos"]["y"]})
assert abs(accepted_heading_reproduction - angle(rr["requested"]["vel"])) < 1e-12

# Pure reconstruction of the existing radial spacing arithmetic. No World,
# Agent, PlaySim, previews or perception calls. Reuse actual received pictures.
accepted_peers = {q["target"]: q["seen"] for q in rd["consumed"]
                  if q["actor"] < 11 and q["target"] < 11 and q["target"] != rb}
candidate_peers = {q["target"]: q["seen"] for q in cf["cues"]
                  if q["actor"] == rb and q["target"] < 11 and q["target"] != rb}
fixtures = []
for label, body, intent, peers in (("accepted-partial-recorded-peers", before_ref, rr["requested"], accepted_peers),
                                   ("candidate-complete-recorded-peers", before_can, cr["requested"], candidate_peers)):
    fixtures.append({"label": label, "body": {**body, "profile": profiles[rb]}, "intent": intent,
                     "peers": [{"idx": i, "seen": p, "profile": profiles[i]} for i, p in sorted(peers.items())]})
node_program = r"""
import {readFileSync} from 'node:fs';
import {followAccel,fatigueFactor} from './src/physics/kinematics.ts';
import {availability,supportParams} from './src/physics/support.ts';
const results=[];
for(const f of JSON.parse(readFileSync(0,'utf8'))){
  const b=f.body,cap=availability(b.support,supportParams(b.profile),fatigueFactor(b.energy));
  let v={...f.intent.vel};const cuts=[];
  for(const q of f.peers){
    const seen=q.seen,dx=seen.pos.x-b.pos.x,dy=seen.pos.y-b.pos.y,d=Math.hypot(dx,dy);
    const touch=.9*(b.profile.radius+q.profile.radius),gap=d-touch;if(d<1e-6)continue;
    const nx=dx/d,ny=dy/d,brake=followAccel(b,{x:-nx*1e3,y:-ny*1e3},f.intent.cutSkill??1,cap);
    const decel=Math.max(.1,-brake.x*nx-brake.y*ny);
    const current=Math.max(0,(b.vel.x-seen.vel.x)*nx+(b.vel.y-seen.vel.y)*ny);
    const stopping=current*.3+current*current/(2*decel);if(gap>Math.max(1.2,stopping))continue;
    const rx=v.x-seen.vel.x,ry=v.y-seen.vel.y,closing=rx*nx+ry*ny,speed2=rx*rx+ry*ry;
    const closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
    if(gap>0&&Math.hypot(dx-rx*closest,dy-ry*closest)>touch)continue;
    const allowed=Math.sqrt((decel*.3)**2+2*decel*Math.max(0,gap))-decel*.3;
    if(closing>allowed){const cut=closing-allowed;v.x-=nx*cut;v.y-=ny*cut;
      cuts.push({peer:q.idx,seen,decel,gap,stopping,closing,allowed,cut,vel:{...v}});}
  }
  const speed=Math.hypot(b.vel.x,b.vel.y);
  const gatherPerp=speed>0?Math.abs(v.x*b.vel.y-v.y*b.vel.x)/speed:0;
  results.push({label:f.label,cap,cuts,radialResult:v,gatherPerp,
    gatherSkippedBySmallTurn:gatherPerp<1});
}
process.stdout.write(JSON.stringify(results));
"""
helper_start = time.perf_counter()
env = dict(os.environ)
env["PATH"] = "/workspace/.cloud-tools/node22/node_modules/.bin:" + env["PATH"]
result = subprocess.run(["node", "--import", "tsx", "--input-type=module", "-e", node_program],
                        input=json.dumps(fixtures), text=True, capture_output=True, check=True, env=env)
spacing = json.loads(result.stdout)
helper_seconds = time.perf_counter() - helper_start
for result, original in zip(spacing, (rr, cr)):
    result["nativeWorldTarget"] = original["delivered"]["vel"]
    result["maxError"] = max(abs(result["radialResult"][k] - original["delivered"]["vel"][k]) for k in ("x", "y"))
    assert result["maxError"] == 0
    assert result["gatherSkippedBySmallTurn"]
assert [q["peer"] for q in spacing[0]["cuts"]] == [2]
assert spacing[1]["cuts"] == []


def emit_reference(row):
    detailed = {f["t"]: f for f in row["detailedFrames"]}
    frames = []
    for f in row["series"]:
        detail = detailed.get(f["t"])
        frames.append({"t": f["t"], "after": f["after"], "carrier": f["carrier"],
                       "actors": [actor_at(f, a["idx"]) for a in f["actors"]],
                       "rbPictureCalls": [q for q in f["pictureCallCounts"] if q[0] == rb],
                       "rbConsumedPictureValues": None,
                       "recordedOtherObserverPictures": detail["consumed"] if detail else None,
                       "sampledFullSelectedBeforeBodies": detail["before"] if detail else None,
                       "events": f["events"]})
    return {"label": "accepted", "id": row["input"]["id"], "input": row["input"],
            "setupSha256": row["summary"]["setupSha256"], "summary": row["summary"],
            "actors": [{"idx": a["idx"], "slot": a["slot"], "team": a["team"], "profile": a["profile"]} for a in row["actors"]],
            "coverage": "Nine all-tick actors; additional before bodies only at original sampled checkpoints. Missing actors are not interpolated.",
            "frames": frames}


def emit_candidate(row):
    frames = []
    for f in row["frames"]:
        frames.append({"t": f["t"], "after": f["after"], "carrier": f["carrier"],
                       "actors": [actor_at(f, a["id"], True) for a in f["agents"]],
                       "rbBefore": f["worldInput"]["beforeBodies"][rb],
                       "rbConsumedPictures": [q for q in f["cues"] if q["actor"] == rb],
                       "events": [e for e in row["events"] if abs(e["t"] - f["t"]) < 1e-8]})
    return {"label": "parked-te-base", "id": row["input"]["id"], "input": row["input"],
            "summary": {k: row[k] for k in ("firstContact", "crossing", "endTime", "outcome", "gain", "censored")},
            "coverage": "All22 achieved actors and original RB see-call results; no read scores/carrier opts/mind snapshots.", "frames": frames}


decisive = []
for t in (1.6, 1.8, 2, 2.25, 2.3, 2.5, 2.75, 3):
    f, g = frame_at(ref["series"], t), frame_at(can["frames"], t)
    a, b = actor_at(f, rb), actor_at(g, rb, True)
    cues = [q for q in g["cues"] if q["actor"] == rb]
    decisive.append({"t": t, "after": f["after"], "accepted": a, "candidate": b,
                     "acceptedRawHeadingDeg": angle(a["requested"]["vel"]),
                     "candidateRawHeadingDeg": angle(b["requested"]["vel"]),
                     "candidateMinusAcceptedPostPosition": {k: b["pos"][k] - a["pos"][k] for k in ("x", "y")},
                     "candidateRBPictureAgeRange": [min(q["seen"]["age"] for q in cues), max(q["seen"]["age"] for q in cues)]})
designed_assessment_ticks = [f["t"] for f in ref["series"] if 1.6 <= f["t"] <= 2.3
                            and any(q[0] == rb and q[2] == .7 for q in f["pictureCallCounts"])]
aim_until = 1.6 + .3 + .5 * ((ref["actors"][rb]["player"]["ratings"]["patience"] - 1) / 98)
output = {
    "protocol": "run-drills-d03-saved-trace-v1",
    "provenance": {"referenceSha256": hashlib.sha256(ref_bytes).hexdigest(),
                   "candidateSha256": hashlib.sha256(can_bytes).hexdigest(),
                   "reference": reference["provenance"], "candidateCommit": candidate["commit"],
                   "candidateManifestSha256": candidate["manifestSha256"], "candidateScriptSha256": candidate["scriptSha256"],
                   "candidateWorld": candidate["worldSelection"]},
    "firstDifference": {"t": 1.6, "after": 1.65, "acceptedEdgePictures": accepted_edge,
                        "acceptedEdgePictureStatus": "Actual other-O consumed .05s pictures, identical to RB teammate channel; complete RB surface/read not stored.",
                        "acceptedRelevantBound": accepted_bound,
                        "acceptedReconstructedRelevantEdgeAim": accepted_reconstructed_edge_aim,
                        "acceptedReconstructionStatus": "Edge-only source reconstruction reproduces recorded request heading; not a stored complete liveAim/assessment.",
                        "candidateConsumedSurface": candidate_first,
                        "candidateFullPicturePresent": list(present), "candidateFullPictureDeparted": list(gone),
                        "candidateRelevantBound": candidate_edge_bound, "candidateDerivedLiveAim": candidate_live_aim,
                        "liveEdgeDeltaY": candidate_live_aim["y"] - accepted_reconstructed_edge_aim["y"],
                        "acceptedBeforeRB": before_ref, "candidateBeforeRB": before_can,
                        "requestedHeadingDeltaDeg": angle(cr["requested"]["vel"]) - angle(rr["requested"]["vel"]),
                        "pureSpacingReconstruction": spacing,
                        "nominalInstalledAimUntil": aim_until,
                        "acceptedRecordedDesignedAssessmentTicks": designed_assessment_ticks},
    "decisiveIntervals": decisive,
    "runs": [emit_reference(row) for row in reference["panel"]] + [emit_candidate(row["candidate"]) for row in candidate["panel"]],
    "limitations": ["RUN_READ0; ordinary LIVE_AIM1 and post-design perceived-crease selection still execute.",
                    "Accepted RB consumed picture values and carrier read/opts/mind state omitted from published packet; picture-call counts are retained.",
                    "Candidate RB cues stored, but evaluation scores/selected entries/aimUntil/decisionInterval not stored; no guessed headings are labeled actual reads.",
                    "Accepted RT picture alone reproduces full1.60 radial amendment; omitted other-peer sequence is not certified inactive.",
                    "Pure braking/spacing arithmetic is not an achievable continuation, a hidden future-path input, or proof of a controller defect.",
                    "Actual recorded future paths serve only offline diagnosis. No forced runner, new pictures, World calls, plays or source edits."]}
output["offlineCost"] = {"pureHelperSeconds": helper_seconds, "elapsedSecondsBeforeWrite": time.perf_counter() - START,
                         "newWorldSteps": 0, "newPlays": 0, "newGames": 0}
path = Path(args.output)
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(output, separators=(",", ":")) + "\n")
print(json.dumps({"output": str(path), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                  "elapsedSeconds": time.perf_counter() - START, "newWorldSteps": 0, "newPlays": 0,
                  "firstHeadingDeltaDeg": output["firstDifference"]["requestedHeadingDeltaDeg"],
                  "spacingMaxError": max(s["maxError"] for s in spacing)}))
