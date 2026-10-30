"""Planned zone doubles (sim traces): geometry while both members are on the DL, before the first member climbs.
Per frame: each member's lateral offset from the DL (+ = away from his partner), distance to the DL, member gap,
both engaged (a[5]==DL), DL speed and DL retreat speed (downfield). usage: dblgeo.py trace.json..."""
import json, sys, math
from collections import defaultdict
agg = defaultdict(lambda: defaultdict(list))
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified") or not s.get("scheme"): continue
        fam = "OZ" if s["scheme"] in ("outsideZone", "wideZone") else "IZ" if s["scheme"] in ("insideZone", "splitZone") else None
        if not fam: continue
        ag, los = s["agents"], s["los"]
        dfn = {a["i"] for a in ag if a["team"] == "D"}
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        slot = {a["slot"]: a["i"] for a in ag}
        for a in ag:
            if a["team"] != "O" or a["plan"] != "combo" or not a["tgt"] or a["tgt"] not in slot: continue
            mates = [b["i"] for b in ag if b["team"] == "O" and b is not a and b["tgt"] == a["tgt"] and b["plan"] in ("reach","drive","cutoff","combo","down")]
            if not mates or mates[0] < a["i"] and next((b for b in ag if b["i"] == mates[0]), {}).get("plan") == "combo": continue
            m = [a["i"], mates[0]]; d = slot[a["tgt"]]
            rel = min([e["t"] for e in p["events"] if e["type"] == "block_climb" and e["a"] in m] + [2.0])
            G = agg[fam]; G["n"].append(1)
            for k, f in enumerate(fr):
                if f["t"] < .3 or f["t"] >= rel or k == 0: continue
                D = f["a"][d]; P = [f["a"][i] for i in m]
                dist = [math.hypot(q[0]-D[0], q[1]-D[1]) for q in P]
                if max(dist) > 1.3: continue
                for j in (0, 1):
                    away = math.copysign(1, P[j][1]-P[1-j][1]) if P[j][1] != P[1-j][1] else 1
                    G["lat_off"].append((P[j][1]-D[1]) * away)
                    G["dist"].append(dist[j])
                    G["eng"].append(P[j][5] == d)
                G["gap"].append(math.hypot(P[0][0]-P[1][0], P[0][1]-P[1][1]))
                G["both_eng"].append(P[0][5] == d and P[1][5] == d)
                Q = fr[k-1]["a"][d]; dt = f["t"]-fr[k-1]["t"]
                if dt > 0:
                    G["dl_speed"].append(math.hypot(D[0]-Q[0], D[1]-Q[1])/dt)
                    G["dl_back"].append(-(D[0]-Q[0])*dirx/dt)
            G["rel"].append(rel)
med = lambda v: sorted(v)[len(v)//2] if v else float('nan')
mean = lambda v: sum(v)/len(v) if v else float('nan')
for fam, G in sorted(agg.items()):
    lo = G["lat_off"]
    print(f"{fam}: doubles {len(G['n'])}, frames {len(G['gap'])}, release med {med(G['rel']):.2f} | member lateral off DL (+away from partner) "
          f"mean {mean(lo):.2f} med {med(lo):.2f}, on near half (<0) {mean([x<0 for x in lo]):.2f} | dist to DL med {med(G['dist']):.2f}, "
          f"member engaged {mean(G['eng']):.2f}, both {mean(G['both_eng']):.2f} | member gap med {med(G['gap']):.2f} | "
          f"DL speed med {med(G['dl_speed']):.2f} mean {mean(G['dl_speed']):.2f}, DL driven back mean {mean(G['dl_back']):.2f}")
