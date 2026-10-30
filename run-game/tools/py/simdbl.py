"""Sim only: the position-only doubles of doublerel.py, split by whether the pair is a planned combo
(one member plan 'combo' on that DL, partner targeting the same DL) or incidental; and for planned combos,
the release event time vs the position-climb time."""
import json, math, sys
from collections import defaultdict
OL = ("LT", "LG", "C", "RG", "RT")
res = defaultdict(lambda: [0, 0, [], []])
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified"): continue
        fam = "OZ" if s.get("scheme") in ("outsideZone", "wideZone") else "IZ" if s.get("scheme") in ("insideZone", "splitZone") else None
        if not fam or len(fr) < 15: continue
        ag, los = s["agents"], s["los"]; slot = {a["slot"]: a for a in ag}
        dfn = [a["i"] for a in ag if a["team"] == "D"]
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        X = lambda k, i: ((fr[k]["a"][i][0] - los) * dirx, fr[k]["a"][i][1])
        ol = [slot[o]["i"] for o in OL if o in slot]
        dl = [a["i"] for a in ag if a["team"] == "D" and a["slot"].startswith(("DE", "DT", "NT")) and X(3, a["i"])[0] < 1.5]
        climbs = {e["a"]: e["t"] for e in p["events"] if e["type"] == "block_climb"}
        d = lambda k, a, b: math.dist(X(k, a), X(k, b))
        for t in dl:
            for ai in range(len(ol)):
                for bi in range(ai + 1, len(ol)):
                    a, b = ol[ai], ol[bi]; run = 0; start = None
                    for k in range(min(10, len(fr))):
                        run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                        if run >= 3: start = k - 2; break
                    if start is None: continue
                    A, B = ag[a], ag[b]; tn = ag[t]["slot"]
                    planned = (A["plan"] == "combo" and A["tgt"] == tn and B["tgt"] == tn) or (B["plan"] == "combo" and B["tgt"] == tn and A["tgt"] == tn)
                    climb = None
                    for k in range(start, min(25, len(fr))):
                        for m in (a, b):
                            if d(k, m, t) >= 2 and X(k, m)[0] > 0.5 and X(k, m)[0] > X(k, t)[0]: climb = (k * 0.1, m); break
                        if climb: break
                    r = res[(fam, "planned" if planned else "incidental")]
                    r[0] += 1; r[1] += climb is not None
                    if climb: r[2].append(climb[0])
                    ev = min([climbs[m] for m in (a, b) if m in climbs], default=None)
                    if planned and ev is not None: r[3].append((ev, climb[0] if climb else None))
def med(v): v = sorted(v); return round(v[len(v)//2], 2) if v else None
for k, r in sorted(res.items()):
    rel = r[3]
    print(f"{k[0]} {k[1]:10s}: doubles {r[0]}, climb by 2.5 s {r[1]/r[0]:.2f} at {med(r[2])} s"
          + (f"; release event {len(rel)/r[0]:.2f} at {med([x[0] for x in rel])} s, of those reaching the climb mark {sum(x[1] is not None for x in rel)/max(1,len(rel)):.2f}, release->mark {med([x[1]-x[0] for x in rel if x[1] is not None])} s" if rel else ""))
