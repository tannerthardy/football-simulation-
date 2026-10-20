"""Paired analysis of already saved lab arms; no NFL scan or simulation.

This measures supplied-trajectory following by generated proxy bodies. It does
not identify actual NFL requests, maximal effort, contact, or population fit.
"""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import statistics
import argparse

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--dir", type=Path, default=ROOT / "out/gait-response")
parser.add_argument("--nfl", type=Path, default=ROOT / "test/fixtures/gait-intent-nfl.json")
parser.add_argument("--out", type=Path, default=ROOT / "out/gait-response/nfl/lab-comparison.json")
args = parser.parse_args()
spec = importlib.util.spec_from_file_location(
    "acceleration_windows", ROOT / "scripts/mechanics/acceleration_windows.py")
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)
ARMS = ("accepted", "global5", "bearing", "full-old", "intent")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summary(values):
    values = sorted(values)
    if not values:
        return {"n": 0, "mean": None, "median": None, "max": None}
    return {"n": len(values), "mean": statistics.mean(values),
            "median": statistics.median(values), "max": max(values)}


def angle(a, b):
    return math.atan2(a[0] * b[1] - a[1] * b[0],
                      a[0] * b[0] + a[1] * b[1])


def turn_stats(velocities):
    # A reversal requires three adjacent velocities >1 yd/s. Do not join
    # turns separated by a stopped/slow interval. Threshold matches lab.
    turns = []
    reversals, prior = 0, None
    for a, b in zip(velocities, velocities[1:]):
        if min(math.hypot(*a), math.hypot(*b)) <= 1:
            prior = None
            continue
        turn = angle(a, b)
        if (prior is not None and turn * prior < 0
                and min(abs(turn), abs(prior)) > .001):
            reversals += 1
        turns.append(abs(turn))
        prior = turn
    return {"consecutiveTurnReversals": reversals,
            "absoluteHeadingStepRadians": summary(turns)}


def common_motion(points, decimals):
    # Exactly 10 Hz and complete legal +/-0.2 speed / +0.3 gain supports.
    windows = operator.measure_acceleration_windows(
        points, .1, 2, position_decimals=decimals)
    rounded = [tuple(round(v, decimals) for v in p) if decimals is not None
               else tuple(p) for p in points]
    velocities = [((rounded[k+2][0]-rounded[k-2][0])/.4,
                   (rounded[k+2][1]-rounded[k-2][1])/.4)
                  for k in range(2, len(points)-2)]
    return {"windows": windows, "turns": turn_stats(velocities)}


def command_geometry(trial):
    before = tuple(trial["initial"]["vel"][c] for c in ("x", "y"))
    overshoots, eligible = [], 0
    lag, transverse = [], []
    for frame in trial["frames"]:
        after = tuple(frame["vel"][c] for c in ("x", "y"))
        desired = tuple(frame["command"]["vel"][c] for c in ("x", "y"))
        if min(math.hypot(*before), math.hypot(*after), math.hypot(*desired)) > 1:
            target_turn, actual_turn = angle(before, desired), angle(before, after)
            # Only the forward hemisphere; no ambiguous half-turn choice.
            if abs(target_turn) < math.pi/2:
                eligible += 1
                if target_turn * actual_turn > 0 and abs(actual_turn) > abs(target_turn)+1e-6:
                    overshoots.append(abs(actual_turn)-abs(target_turn))
        before = after
        ref = frame["reference"]
        if ref and math.hypot(ref["vx"], ref["vy"]) > .5:
            speed = math.hypot(ref["vx"], ref["vy"])
            dx, dy = ref["x"]-frame["pos"]["x"], ref["y"]-frame["pos"]["y"]
            lag.append((dx*ref["vx"]+dy*ref["vy"])/speed)
            transverse.append(abs(dx*ref["vy"]-dy*ref["vx"])/speed)
    return {"forwardBearingEligibleSteps": eligible,
            "crossedRequestedBearingSteps": len(overshoots),
            "bearingOvershootRadians": summary(overshoots),
            "signedAlongReferenceLagYd": summary(lag),
            "absoluteAcrossReferenceErrorYd": summary(transverse)}


paths = {a: args.dir / f"lab-{a}.json" for a in ARMS}
labs = {a: json.loads(p.read_text()) for a, p in paths.items()}
packet_path = args.nfl
packet = json.loads(packet_path.read_text())
fixtures = {"NFL/"+f["id"]: f for f in packet["fixtures"]}
trials = {a: {t["id"]: t for t in d["trials"]} for a, d in labs.items()}
rows = []
for trial_id, fixture in fixtures.items():
    nfl_points = [p[1:3] for p in fixture["points"]]
    nfl_motion = {str(d): common_motion(nfl_points, d) for d in (None, 1, 2)}
    row = {"id": trial_id, "split": fixture["split"],
           "group": fixture["player"]["group"], "arms": {},
           "nfl": {k: {"counts": v["windows"]["counts"], "turns": v["turns"]}
                   for k, v in nfl_motion.items()}}
    for arm in ARMS:
        t = trials[arm][trial_id]
        # Saved frames begin at 0.05. Include the separately recorded initial
        # position and then take exact 0.1, 0.2, ... 2.0 frames.
        points = [[t["initial"]["pos"][c] for c in ("x", "y")]]
        points += [[f["pos"][c] for c in ("x", "y")]
                   for f in t["frames"] if abs(f["t"]*10-round(f["t"]*10)) < 1e-8]
        assert len(points) == len(nfl_points) == 21
        vel = [tuple(t["initial"]["vel"][c] for c in ("x", "y"))]
        vel += [tuple(f["vel"][c] for c in ("x", "y")) for f in t["frames"]]
        entry = {"positionRMSE": t["metrics"]["rmse"],
                 "positionMaxError": t["metrics"]["maxError"],
                 "commandGeometry": command_geometry(t),
                 "laboratory20HzTurns": turn_stats(vel),
                 "maxGroundFraction": t["metrics"]["maxGroundFraction"],
                 "maxWorkResidual": t["metrics"]["maxResidual"],
                 "common10Hz": {}}
        for decimals in (None, 1, 2):
            key = str(decimals)
            native = common_motion(points, decimals)
            ref = nfl_motion[key]
            comparison = {"counts": native["windows"]["counts"],
                          "turns": native["turns"]}
            for name, field in (("speeds", "speed"), ("gains", "gain")):
                a, b = native["windows"][name], ref["windows"][name]
                assert [x["index"] for x in a] == [x["index"] for x in b]
                errors = [x[field]-y[field] for x, y in zip(a, b)]
                comparison[name+"Error"] = {
                    "mae": statistics.mean(abs(v) for v in errors),
                    "bias": statistics.mean(errors),
                    "rmse": math.sqrt(statistics.mean(v*v for v in errors)),
                    "paired": len(errors)}
            entry["common10Hz"][key] = comparison
        row["arms"][arm] = entry
    rows.append(row)

aggregates = {}
for arm in ARMS:
    entries = [r["arms"][arm] for r in rows]
    a = {"positionRMSE": summary([e["positionRMSE"] for e in entries]),
         "laboratory20HzConsecutiveTurnReversals":
             sum(e["laboratory20HzTurns"]["consecutiveTurnReversals"] for e in entries),
         "maxGroundFraction": max(e["maxGroundFraction"] for e in entries),
         "maxWorkResidual": max(e["maxWorkResidual"] for e in entries),
         "crossedRequestedBearingSteps": sum(e["commandGeometry"]["crossedRequestedBearingSteps"] for e in entries),
         "forwardBearingEligibleSteps": sum(e["commandGeometry"]["forwardBearingEligibleSteps"] for e in entries),
         "signedAlongReferenceLagYd": summary([e["commandGeometry"]["signedAlongReferenceLagYd"]["mean"] for e in entries]),
         "common10Hz": {}}
    for decimals in (None, 1, 2):
        key = str(decimals)
        e = [x["common10Hz"][key] for x in entries]
        a["common10Hz"][key] = {
            "speedMAE": summary([x["speedsError"]["mae"] for x in e]),
            "gainMAE": summary([x["gainsError"]["mae"] for x in e]),
            "consecutiveTurnReversals": sum(x["turns"]["consecutiveTurnReversals"] for x in e)}
    aggregates[arm] = a

profiles_equal = all(trials[a][tid]["profile"] == trials["accepted"][tid]["profile"]
                     for a in ARMS for tid in trials["accepted"])
result = {
    "question": "Does explicit full propulsion follow supplied moderate NFL trajectories with existing proxy capacities, and what does bearing correction change?",
    "inputs": {a: {"path": str(p), "sha256": sha(p),
                   "engine": labs[a]["engine"],
                   "engineSourceSha256": labs[a]["engineSourceSha256"],
                   "mode": labs[a]["mode"], "flags": labs[a]["flags"]}
               for a, p in paths.items()},
    "packetSha256": sha(packet_path),
    "operatorSha256": sha(ROOT / "scripts/mechanics/acceleration_windows.py"),
    "analysisScriptSha256": sha(Path(__file__)),
    "profilesIdenticalAcrossArms": profiles_equal,
    "nflFullOldIntentFramesIdentical": all(
        trials["full-old"][tid]["frames"] == trials["intent"][tid]["frames"] for tid in fixtures),
    "interpretationLimits": [
        "Nine preselected illustration/later-play controls from one game; not representative or independent calibration.",
        "NFL contact and effort unknown; proxy profiles use recorded weight but generated capabilities and facing-from-velocity.",
        "Supplied future trajectory is a lab target, not acquired information or inferred actual request.",
        "Provider velocity feedforward is not exactly the derivative of interpolated position; tracking error includes that inconsistency.",
        "Intent and full-old have identical NFL controllers; their equality does not validate the arrival/braking planner.",
        "Turn reversal is descriptive; legitimate curved routes and quantization affect it. No global sim-vs-NFL jitter estimate is made.",
        "Twenty-Hz native velocity is not directly compared with NFL provider velocity. Common comparisons use 10Hz positions and identical complete windows.",
        "No new NFL scan, recollection, simulation or test was run."
    ],
    "aggregate": aggregates,
    "nfl10HzConsecutiveTurnReversals": {
        str(d): sum(r["nfl"][str(d)]["turns"]["consecutiveTurnReversals"] for r in rows)
        for d in (None, 1, 2)},
    "rows": rows}
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text(json.dumps(result, indent=2)+"\n")
print(json.dumps({k: result[k] for k in (
    "profilesIdenticalAcrossArms", "nflFullOldIntentFramesIdentical",
    "aggregate", "nfl10HzConsecutiveTurnReversals")}, indent=2))
