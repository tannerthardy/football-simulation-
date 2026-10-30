"""Sim counter: kicked end ends up inside the kicker (kicker lateral outside the end by > 0.25 while within 1.5 yd,
before carrier cross) -> was a block_log event declared, when, and did the wrap (lead) then go outside the end?
usage: logcheck.py traces..."""
import json, math, sys, collections
C = collections.Counter(); T = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p.get("nullified") or s.get("concept") != "counter": continue
        ag = s["agents"]; slot = [a["slot"] for a in ag]; fr = p["frames"]; n = len(fr)
        car = next((f["c"] for f in fr if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None or n < 26: continue
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in fr]
        lead = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "lead"]
        kick = [i for i, a in enumerate(ag) if a["plan"] == "pull" and a["role"] == "kick"]
        if len(lead) != 1 or len(kick) != 1 or ag[kick[0]]["tgt"] not in slot: continue
        i, k = lead[0], kick[0]; e = slot.index(ag[k]["tgt"])
        ps = 1 if (xy[15][k][1] - xy[0][k][1]) > 0 else -1
        crs = next((f for f in range(n) if xy[f][car][0] >= 0), n - 1)
        C["plays"] += 1
        f0 = next((f for f in range(crs) if math.dist(xy[f][k], xy[f][e]) < 1.5 and (xy[f][k][1] - xy[f][e][1]) * ps > .25), None)
        log = next((ev for ev in p["events"] if ev["type"] == "block_log"), None)
        C["log event"] += log is not None
        if f0 is None: C["kicker inside end (kick-out)"] += 1; continue
        C["kicker outside end before cross"] += 1; T["t outside"].append(f0 / 10)
        if log: C["  ... log declared"] += 1; T["log t"].append(log["t"])
        else: C["  ... no log declared"] += 1
        g = min(crs + 3, n - 1)
        out = (xy[g][i][1] - xy[g][e][1]) * ps > 0
        C[f"  ... wrap outside end at cross+0.3 ({'log' if log else 'nolog'})"] += out
        C[f"  ... carrier outside end at cross ({'log' if log else 'nolog'})"] += (xy[crs][car][1] - xy[crs][e][1]) * ps > 0
        T["end x at f0"].append(xy[f0][e][0]); T["kicker x - end x at f0"].append(xy[f0][k][0] - xy[f0][e][0])
for k, v in C.items(): print(f"{v:5} {k}")
for k, v in T.items(): print(k, f"{med(v):+.2f}")
