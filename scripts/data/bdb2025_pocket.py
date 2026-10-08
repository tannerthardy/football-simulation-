"""What NFL quarterbacks do once pressured (Big Data Bowl 2025 tracking).

For each dropback: the first time after the snap (from 0.5 s, to skip the
center/nose crowd at the snap) a defender is within 2 yards of the QB; then
what happened (pass released, sack, scramble) and how long after the pressure
it happened. Also time to throw for pressured vs. clean dropbacks.
Reads only the tracking weeks present. Only aggregates are written.

  python3 -I scripts/data/bdb2025_pocket.py <bdb2025 dir> <out.json>
"""
import csv
import glob
import json
import math
import statistics
import sys
from collections import defaultdict

D, OUT = sys.argv[1], sys.argv[2]

pos = {}
with open(f"{D}/players.csv", newline="") as f:
    for r in csv.DictReader(f):
        pos[r["nflId"]] = r["position"]

drop = {}
with open(f"{D}/plays.csv", newline="") as f:
    for r in csv.DictReader(f):
        if r["isDropback"] == "TRUE" and r["playNullifiedByPenalty"] != "Y" and r["qbSpike"] != "TRUE":
            drop[(r["gameId"], r["playId"])] = {"team": r["possessionTeam"], "result": r["passResult"]}

weeks = sorted(glob.glob(f"{D}/tracking_week_*.csv"))
frames = defaultdict(lambda: defaultdict(lambda: {"qb": None, "def": []}))
snap = {}
release = {}
for path in weeks:
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            k = (r["gameId"], r["playId"])
            p = drop.get(k)
            if p is None or r["frameType"] != "AFTER_SNAP" and r["frameType"] != "SNAP":
                continue
            fid = int(r["frameId"])
            ev = r["event"]
            if ev == "ball_snap":
                snap[k] = min(snap.get(k, fid), fid)
            if ev in ("pass_forward", "qb_sack", "qb_strip_sack", "run", "qb_slide") and k not in release:
                release[k] = (fid, ev)
            if r["nflId"] == "NA":
                continue
            fr = frames[k][fid]
            if r["club"] == p["team"]:
                if pos.get(r["nflId"]) == "QB":
                    fr["qb"] = (float(r["x"]), float(r["y"]))
            else:
                fr["def"].append((float(r["x"]), float(r["y"])))

pressured = 0
n = 0
ttp, after, outcome = [], [], defaultdict(int)
ttt_clean, ttt_press = [], []
for k, fs in frames.items():
    if k not in snap or k not in release:
        continue
    s = snap[k]
    rel_f, rel_ev = release[k]
    rel_t = (rel_f - s) / 10
    n += 1
    first = None
    for fid in sorted(fs):
        t = (fid - s) / 10
        if t < 0.5 or fid > rel_f:
            continue
        fr = fs[fid]
        if fr["qb"] is None:
            continue
        qx, qy = fr["qb"]
        if any(math.hypot(x - qx, y - qy) < 2 for x, y in fr["def"]):
            first = t
            break
    result = drop[k]["result"]
    kind = "sack" if result == "S" else "scramble" if result == "R" else "throw"
    if first is None:
        if kind == "throw":
            ttt_clean.append(rel_t)
        continue
    pressured += 1
    ttp.append(first)
    outcome[kind] += 1
    after.append(rel_t - first)
    if kind == "throw":
        ttt_press.append(rel_t)


def summ(xs):
    xs = sorted(xs)
    q = lambda p: xs[min(len(xs) - 1, int(p * len(xs)))]
    return {"n": len(xs), "mean": round(statistics.mean(xs), 2), "p10": q(0.1), "p50": q(0.5), "p90": q(0.9)}


out = {
    "source": f"Big Data Bowl 2025 tracking, {len(weeks)} week(s) present",
    "dropbacks": n,
    "pressuredPct": round(100 * pressured / n, 1),
    "timeToPressure": summ(ttp),
    "afterPressure": {k: round(100 * v / pressured, 1) for k, v in outcome.items()},
    "pressureToOutcome": summ(after),
    "timeToThrowClean": summ(ttt_clean),
    "timeToThrowPressured": summ(ttt_press),
}
with open(OUT, "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps(out, indent=1))
