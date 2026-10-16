"""Independent saved-object review. No football simulation or new test run."""
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
import tarfile
import time

started = time.perf_counter()
BASE = "86250bb4f0c6f421878c204161864d523c3e30b6"
CANDIDATE = "6573521bc28ea09c2aa6c05770f20b2089cc9fe6"
EXECUTED = "61fde14a1bc5582b579a37d98eb8a98851a89d11"
EVIDENCE = "8fb028eafc19b803cf082a8d31d5594319bd5165"
PREFIX = "data/reviews/current/combo-strike-access/"
sha = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *args: subprocess.check_output(["git", *args])
blob = lambda pin, path: git("show", f"{pin}:{path}")
saved = lambda name: json.loads(blob(EVIDENCE, PREFIX + name))

def runtime(pin):
    archive = git("archive", pin, "src")
    with tarfile.open(fileobj=io.BytesIO(archive)) as files:
        result = hashlib.sha256()
        for member in sorted((m for m in files if m.isfile()), key=lambda m: m.name):
            result.update(member.name.encode() + b"\0" + files.extractfile(member).read() + b"\0")
        return result.hexdigest()

payload_paths = ["src/sim/behaviors/blocking.ts", "test/combo-strike-access.test.ts", "test/fixtures/combo-strike-access.json.gz"]
actual = git("diff", "--name-only", BASE, CANDIDATE, "--", "src", "test", "config", "package.json", "package-lock.json").decode().splitlines()
assert sorted(actual) == sorted(payload_paths), actual
payloads = []
for path in payload_paths:
    data = blob(CANDIDATE, path)
    assert data == blob(EXECUTED, path), path
    payloads.append({"path": path, "sha256": sha(data), "matchesExecuted": True})
source = runtime(CANDIDATE)
assert source == "bed54d7389957f713c4a8a61e899fff1ea707f2545bd275e1fb8ff814e65bf37"
assert runtime(BASE) == "dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3"
manifest = saved("artifacts.json")
for name, expected in manifest["payloads"].items():
    data = blob(EVIDENCE, PREFIX + name)
    assert len(data) == expected["bytes"] and sha(data) == expected["sha256"], name

tapes = json.loads(gzip.decompress(blob(EVIDENCE, PREFIX + "paired-tapes.json.gz")))
cases = {row["reference"]["id"]: row for row in tapes}
assert set(cases) == {"A018", "A030", "DuoUnder", "D05", "D06", "D07", "A027", "POWER"}
for row in tapes:
    old, new = row["reference"], row["candidate"]
    assert old["inputSha256"] == new["inputSha256"] and old["initial"] == new["initial"]
    assert old["source"] == "dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3"
    assert new["source"] == source
unchanged = []
for name in ("D06", "A027", "POWER"):
    old, new = cases[name]["reference"], cases[name]["candidate"]
    assert old["frames"] == new["frames"] and old["events"] == new["events"] and old["result"] == new["result"]
    unchanged.append(name)

old, new = cases["A018"]["reference"], cases["A018"]["candidate"]
assert [f for f in old["frames"] if f["t"] < 2.3] == [f for f in new["frames"] if f["t"] < 2.3]
departure = lambda d: [c for c in d["collectionCalls"] if c["method"] == "startDeparture" and c["a"] == 5]
assert departure(old)[0]["t"] == departure(new)[0]["t"] == 1.05
call = lambda d: next(c for c in d["collectionCalls"] if c["method"] == "leaveCombination" and c["a"] == 5 and c["t"] == 2.3)
assert call(old)["before"] == call(new)["before"]
assert call(old)["after"]["departure"] and not call(new)["after"]["departure"]
first = saved("a018-first-difference.json")
bodies = first["beforeAll22"]
inputs = saved("inputs.json")
setup = next(r for r in inputs["rows"] if r["id"] == "A018")["setup"]
rg, mike = bodies[5], bodies[15]
strike = rg["profile"]["radius"] + mike["profile"]["radius"] + .1 + setup["offense"]["RG"]["measurables"]["armIn"] / 36 * .45
distance = math.dist(tuple(rg["pos"].values()), tuple(mike["pos"].values()))
assert distance < strike
cues = [r for r in first["consumedCues"] if r["a"] == 5 and r["context"] == "update/leaveCombination"]
assert {r["b"] for r in cues} == {2, 13, 15}
by_peer = {r["b"]: r["picture"] for r in cues}
assert math.isclose(by_peer[2]["age"], .05) and all(math.isclose(by_peer[i]["age"], .30) for i in (13, 15))

def direct_clearance(endpoint):
    results = []
    interval = call(old)["after"]["departureRead"]["nextRead"] - 2.3
    for i in (13, 2):
        seen, radius = by_peer[i], rg["profile"]["radius"] + bodies[i]["profile"]["radius"]
        for dt in (0, interval):
            point = {k: seen["pos"][k] + seen["vel"][k] * dt for k in ("x", "y")}
            end = {k: endpoint[k] + by_peer[15]["vel"][k] * dt for k in ("x", "y")}
            lane = {k: end[k] - rg["pos"][k] for k in ("x", "y")}
            rel = {k: point[k] - rg["pos"][k] for k in ("x", "y")}
            fraction = max(0, min(1, sum(rel[k] * lane[k] for k in ("x", "y")) / max(1e-12, sum(v*v for v in lane.values()))))
            nearest = math.hypot(*(rel[k] - fraction * lane[k] for k in ("x", "y")))
            initial = math.hypot(*rel.values())
            clear = not (nearest < min(radius, initial) - 1e-9 or (initial < radius and math.dist(tuple(end.values()), tuple(point.values())) <= initial))
            results.append({"peer": i, "dt": dt, "clear": clear, "nearest": nearest, "bodyClearance": nearest - radius})
    return results

goal = by_peer[15]["pos"]
observed_distance = math.dist(tuple(rg["pos"].values()), tuple(goal.values()))
scale = max(0, observed_distance - strike) / max(observed_distance, 1e-12)
endpoint = {k: rg["pos"][k] + (goal[k] - rg["pos"][k]) * scale for k in ("x", "y")}
center_checks, strike_checks = direct_clearance(goal), direct_clearance(endpoint)
assert not all(r["clear"] for r in center_checks) and all(r["clear"] for r in strike_checks)

def force(frame, blocker, defender):
    rep = next((r for r in frame["afterReps"] if r["b"] == blocker and r["d"] == defender), None)
    return math.hypot(rep["hands"]["normal"] or 0, rep["hands"]["tangent"] or 0) if rep and rep["hands"] else 0

loads = [{"tick": f["t"], "after": round(f["t"] + .05, 2), "rgMike": force(f, 5, 15), "rtDT": force(f, 2, 13)} for f in new["frames"] if 2.3 <= f["t"] <= 2.6]
assert loads and all(r["rgMike"] > 0 and r["rtDT"] > 0 for r in loads)
assert not any(force(f, 5, 15) > 0 for f in old["frames"] if f["t"] <= 2.6)
contact = lambda d: next(e for e in d["events"] if e["type"] == "carrier_contact")
assert contact(old)["b"] == 15 and contact(new)["b"] == 21
impacts = [{"tick": f["t"], **c} for f in new["frames"] for c in f["contacts"] if c["i"] < 11 and c["j"] < 11 and c["impulse"] > 0]
assert not any(c["tick"] <= contact(new)["t"] for c in impacts)
assert any(c["tick"] == 3.75 for c in impacts)
runner_gaps = []
for f in new["frames"]:
    if not 2.3 <= f["t"] <= 2.6:
        continue
    for i in range(1, 6):
        center = math.dist(tuple(f["after"][6]["pos"].values()), tuple(f["after"][i]["pos"].values()))
        touch = .9 * (bodies[6]["profile"]["radius"] + bodies[i]["profile"]["radius"])
        runner_gaps.append(center - touch)
assert min(runner_gaps) > 0

response = saved("d05-response.json")
assert all(response[a][k] for a in ("reference", "candidate") for k in ("observerFramesExact", "observerResultExact"))
assert any(e["t"] == 3.25 and e["type"] == "missed_tackle" for e in response["reference"]["events"])
assert any(e["t"] == 3.25 and e["type"] == "tackle_wrap" for e in response["candidate"]["events"])
assert cases["D07"]["candidate"]["phase"] == "live" and cases["D07"]["candidate"]["endTime"] == 5
summary = saved("summary.json")
assert cases["A030"]["candidate"]["result"]["offenseYards"] < cases["A030"]["reference"]["result"]["offenseYards"]
report = {"reviewed": CANDIDATE, "acceptedBase": BASE, "executedEquivalent": EXECUTED, "evidence": EVIDENCE,
          "runtimeSource": source, "protectedPayloads": payloads, "evidencePayloadsVerified": len(manifest["payloads"]),
          "unchangedSavedControls": unchanged, "sameA018DepartureTime": 1.05,
          "firstA018RequestDifference": 2.3, "existingStrikeRange": strike, "actualStrikeDistance": distance,
          "observedBackerDistance": observed_distance, "centerChecks": center_checks, "strikeChecks": strike_checks,
          "loadsThroughRunnerArrival": loads, "minimumRunnerOLTorsoClearanceThroughArrival": min(runner_gaps),
          "A018FirstCarrierContact": {a: contact(cases["A018"][a]) for a in ("reference", "candidate")},
          "retainedA018TeammateImpacts": impacts,
          "retainedA030Yards": {a: cases["A030"][a]["result"]["offenseYards"] for a in ("reference", "candidate")},
          "D05SameAttemptTime": 3.25, "D07CensoredAt": 5,
          "authorReusedNativeExecutions": summary["newNativeExecutions"],
          "authorReusedNativeSeconds": summary["newNativeCommandSeconds"],
          "authorReusedAllLauncherSeconds": summary["allLauncherCommandSecondsIncludingFailures"],
          "newNativeExecutions": 0, "newTestExecutions": 0, "reviewAuditSeconds": time.perf_counter() - started}
out = Path("out/pr88-independent-review/audit.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
