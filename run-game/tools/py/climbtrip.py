"""After a planned combo's release (block_climb by a member), the climber's trip: time until he is 1.5 yd from the
doubled DL, his depth relative to the DL at release (+ = in front of him, toward the offense), his distance from
the DL at release, speed 0.3 s after release, and whether he gets within 1.2 yd of his named backer before the
carrier reaches the backer's depth-1. Split by covered/uncovered climber. usage: climbtrip.py scheme trace.json..."""
import json, sys, math
from collections import defaultdict
g = defaultdict(lambda: defaultdict(list))
want = sys.argv[1]
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified") or s.get("scheme") != want: continue
        ag, los = s["agents"], s["los"]; slot = {a["slot"]: a["i"] for a in ag}
        dfn = [a["i"] for a in ag if a["team"] == "D"]
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        done = set()
        for a in ag:
            if a["team"] != "O" or a["plan"] != "combo" or not a["tgt"] or a["tgt"] not in slot or a["tgt"] in done: continue
            mates = [b for b in ag if b["team"] == "O" and b is not a and b["tgt"] == a["tgt"]]
            if not mates: continue
            done.add(a["tgt"]); m = [a["i"], mates[0]["i"]]; d = slot[a["tgt"]]
            rel = next((e for e in p["events"] if e["type"] == "block_climb" and e["a"] in m and e["t"] <= 2.5), None)
            lb = a.get("climb") or mates[0].get("climb")
            if not rel or not lb or lb not in slot: continue
            c = rel["a"]; o = m[0] if c == m[1] else m[1]; b = slot[lb]
            D0 = lambda i: math.hypot(fr[0]["a"][i][0]-fr[0]["a"][d][0], fr[0]["a"][i][1]-fr[0]["a"][d][1])
            G = g["covered" if D0(c) < D0(o) else "uncovered"]
            k0 = min(range(len(fr)), key=lambda k: abs(fr[k]["t"] - rel["t"]))
            P = lambda k, i: fr[k]["a"][i]
            dist = lambda k, i, j: math.hypot(P(k, i)[0]-P(k, j)[0], P(k, i)[1]-P(k, j)[1])
            G["depth"].append((P(k0, d)[0] - P(k0, c)[0]) * dirx); G["dDL"].append(dist(k0, c, d)); G["dLB"].append(dist(k0, c, b))
            off = next((fr[k]["t"] - rel["t"] for k in range(k0, len(fr)) if dist(k, c, d) >= 1.5), None)
            G["clear"].append(off if off is not None else 9)
            k3 = min(len(fr) - 2, k0 + 3)
            G["v"].append(math.hypot(P(k3+1, c)[0]-P(k3, c)[0], P(k3+1, c)[1]-P(k3, c)[1]) / max(1e-6, fr[k3+1]["t"]-fr[k3]["t"]))
            hit = False
            for k in range(k0, len(fr)):
                cc = fr[k]["c"]
                if cc >= 0 and ag[cc]["slot"] != "QB" and (P(k, b)[0] - P(k, cc)[0]) * dirx <= 1: break
                if dist(k, c, b) < 1.2: hit = True; break
            G["hit"].append(hit); G["t"].append(rel["t"])
med = lambda v: f"{sorted(v)[len(v)//2]:.2f}" if v else "-"
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for k, G in sorted(g.items()):
    print(f"  {want} {k:9s} n {len(G['t']):4d} | rel {med(G['t'])} s | at release: in front of DL {med(G['depth'])}, from DL {med(G['dDL'])}, from LB {med(G['dLB'])} | 1.5 yd off DL after {med(G['clear'])} s | speed +0.3 s {med(G['v'])} | reaches LB {mean(G['hit'])}")
