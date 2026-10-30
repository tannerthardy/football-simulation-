"""Planned combos (member plan 'combo' on a DL, partner on the same DL) by scheme: n, released (block_climb by a
member) by 2.5 s, release time median, climber was the member nearer the DL at the snap (covered), climber touched
(a[5]) his named climb backer before the carrier reached the backer's depth-1, and that backer touched by anyone.
usage: combos.py trace.json..."""
import json, sys, math
from collections import defaultdict
g = defaultdict(lambda: defaultdict(list))
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified") or not s.get("scheme"): continue
        sch = s["scheme"]; ag, los = s["agents"], s["los"]
        slot = {a["slot"]: a["i"] for a in ag}; off = {a["i"] for a in ag if a["team"] == "O"}
        dfn = [a["i"] for a in ag if a["team"] == "D"]
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        seen = set()
        for a in ag:
            if a["team"] != "O" or a["plan"] != "combo" or not a["tgt"] or a["tgt"] not in slot: continue
            mates = [b for b in ag if b["team"] == "O" and b is not a and b["tgt"] == a["tgt"]]
            if not mates: continue
            key = a["tgt"]
            if key in seen: continue
            seen.add(key)
            m = [a["i"], mates[0]["i"]]; d = slot[a["tgt"]]
            G = g[sch]; G["n"].append(1)
            rel = next((e for e in p["events"] if e["type"] == "block_climb" and e["a"] in m and e["t"] <= 2.5), None)
            G["rel"].append(rel is not None)
            if not rel: continue
            G["t"].append(rel["t"])
            c = rel["a"]; o = m[0] if c == m[1] else m[1]
            dist = lambda i: math.hypot(fr[0]["a"][i][0]-fr[0]["a"][d][0], fr[0]["a"][i][1]-fr[0]["a"][d][1])
            G["cov"].append(dist(c) < dist(o))
            lb = a.get("climb") or mates[0].get("climb")
            if lb and lb in slot:
                b = slot[lb]; t1 = t2 = False
                for f in fr:
                    cc = f["c"]
                    if cc >= 0 and ag[cc]["slot"] != "QB" and (f["a"][b][0] - f["a"][cc][0]) * dirx <= 1: break
                    if f["a"][b][5] == c: t1 = True
                    if f["a"][b][5] in off: t2 = True
                G["climber_hit"].append(t1); G["backer_hit"].append(t2)
med = lambda v: f"{sorted(v)[len(v)//2]:.2f}" if v else "-"
mean = lambda v: f"{sum(v)/len(v):.2f}" if v else "-"
for sch, G in sorted(g.items()):
    print(f"  {sch:12s} combos {len(G['n']):4d} | released {mean(G['rel'])} at {med(G['t'])} s | covered climbs {mean(G['cov'])} | climber hits his backer {mean(G['climber_hit'])} | backer hit by anyone {mean(G['backer_hit'])}")
