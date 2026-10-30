"""Zone doubles with a climb backer: release time (block_climb event by a member), time the carrier reaches the
backer, distance climber->backer at release, and whether the backer was touched before the carrier reached him."""
import json, sys, math
from collections import defaultdict
rows = defaultdict(list)
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified"): continue
        fam = "OZ" if s.get("scheme") in ("outsideZone", "wideZone") else "IZ" if s.get("scheme") in ("insideZone", "splitZone") else None
        if not fam: continue
        ag, los = s["agents"], s["los"]; slot = {a["slot"]: a["i"] for a in ag}
        dfn = [a["i"] for a in ag if a["team"] == "D"]; off = {a["i"] for a in ag if a["team"] == "O"}
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        climbs = [e for e in p["events"] if e["type"] == "block_climb"]
        for a in ag:
            if a["plan"] != "combo" or not a["climb"] or a["climb"] not in slot: continue
            b = slot[a["climb"]]
            mates = [x["i"] for x in ag if x["team"] == "O" and x["tgt"] == a["tgt"] and x is not a] + [a["i"]]
            rel = next((e for e in climbs if e["a"] in mates), None)
            reach = None; touched = False
            for f in fr:
                c = f["c"]
                if c >= 0 and ag[c]["slot"] != "QB" and (f["a"][b][0] - f["a"][c][0]) * dirx <= 0.5: reach = f["t"]; break
                if f["a"][b][5] in off: touched = True; break
            if reach is None and not touched: continue
            if rel:
                fk = min(range(len(fr)), key=lambda k: abs(fr[k]["t"] - rel["t"]))
                d = math.dist(fr[fk]["a"][rel["a"]][:2], fr[fk]["a"][b][:2])
            rows[fam].append((rel["t"] if rel else None, reach, touched, d if rel else None))
def med(v): v = sorted(x for x in v if x is not None); return round(v[len(v)//2], 2) if v else None
for fam, r in sorted(rows.items()):
    n = len(r); never = [x for x in r if x[0] is None]
    print(f"{fam}: doubles {n}; backer touched {sum(x[2] for x in r)/n:.0%}; never released {len(never)/n:.0%}")
    for lab, sub in (("touched", [x for x in r if x[2] and x[0] is not None]), ("untouched", [x for x in r if not x[2] and x[0] is not None])):
        print(f"   released, backer {lab}: n {len(sub)}, release at {med([x[0] for x in sub])} s, distance at release {med([x[3] for x in sub])} yd,"
              f" carrier reaches backer at {med([x[1] for x in sub])} s, slack {med([x[1]-x[0] for x in sub if x[1]])} s")
