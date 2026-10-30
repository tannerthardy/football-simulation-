"""At each zone double's release (block_climb by a combo member), is the DL between the climber and the
backer (DL within 2 yd of him and within 60 deg of his line to the backer)? Same for his partner.
Then: does the climber reach the climb mark (2 yd off the DL, 0.5 past LOS, downfield of DL) by 2.5 s,
and touch the backer before the carrier reaches him, split by side."""
import json, math, sys
from collections import Counter, defaultdict
c = Counter(); out = defaultdict(lambda: [0, 0, 0])
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified"): continue
        fam = "OZ" if s.get("scheme") in ("outsideZone", "wideZone") else "IZ" if s.get("scheme") in ("insideZone", "splitZone") else None
        if not fam: continue
        ag, los = s["agents"], s["los"]; slot = {a["slot"]: a["i"] for a in ag}
        dfn = [a["i"] for a in ag if a["team"] == "D"]; off = {a["i"] for a in ag if a["team"] == "O"}
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        X = lambda k, i: ((fr[k]["a"][i][0] - los) * dirx, fr[k]["a"][i][1])
        for a in ag:
            if a["plan"] != "combo" or not a["climb"] or a["climb"] not in slot or a["tgt"] not in slot: continue
            t, b = slot[a["tgt"]], slot[a["climb"]]
            mem = [x["i"] for x in ag if x["team"] == "O" and x["tgt"] == a["tgt"]]
            ev = next((e for e in p["events"] if e["type"] == "block_climb" and e["a"] in mem), None)
            if not ev or len(mem) < 2: continue
            k = min(range(len(fr)), key=lambda k: abs(fr[k]["t"] - ev["t"]))
            def between(m):
                me, dl, bk = X(k, m), X(k, t), X(k, b)
                vx, vy = dl[0] - me[0], dl[1] - me[1]; wx, wy = bk[0] - me[0], bk[1] - me[1]
                dv, dw = math.hypot(vx, vy), math.hypot(wx, wy)
                return dv < 2 and dw > dv and (vx * wx + vy * wy) / (dv * dw or 1) > .5
            cl = ev["a"]; partner = next(m for m in mem if m != cl)
            key = ("climber blocked" if between(cl) else "climber clear", "partner blocked" if between(partner) else "partner clear")
            c[(fam, *key)] += 1
            mark = any(math.dist(X(kk, cl), X(kk, t)) >= 2 and X(kk, cl)[0] > .5 and X(kk, cl)[0] > X(kk, t)[0] for kk in range(k, min(25, len(fr))))
            hit = False
            for kk in range(k, len(fr)):
                cc = fr[kk]["c"]
                if cc >= 0 and ag[cc]["slot"] != "QB" and (X(kk, b)[0] - X(kk, cc)[0]) <= .5: break
                if fr[kk]["a"][b][5] in off: hit = True; break
            o = out[(fam, key[0])]; o[0] += 1; o[1] += mark; o[2] += hit
for k, v in sorted(c.items()): print(k, v)
for k, v in sorted(out.items()): print(k, f"n {v[0]}, reach climb mark {v[1]/v[0]:.2f}, backer touched before carrier {v[2]/v[0]:.2f}")
