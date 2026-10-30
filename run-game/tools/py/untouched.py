"""Zone runs: box backers (defender 2.5-7 yd deep within 5 yd of the ball at the snap) untouched by an
offensive blocker before the carrier reaches them. For each, what were the OL doing in the 0.5 s before
the carrier reached him: count OL in an unplanned two-on-one (another OL engaged on the same DL, neither a
planned combo pair), free (no engagement), alone on a man. And the nearest-OL class to the backer.
usage: untouched.py trace.json..."""
import json, sys, math
from collections import Counter, defaultdict
OL = ("LT", "LG", "C", "RG", "RT")
free_detail = defaultdict(Counter); alt = defaultdict(Counter); altgeo = defaultdict(list); free_geo = defaultdict(list); tot = Counter(); near = defaultdict(Counter); nbox = Counter(); anytwo = Counter()
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p["setup"]; fr = p["frames"]
        if not fr or p.get("nullified"): continue
        fam = "OZ" if s.get("scheme") in ("outsideZone", "wideZone") else "IZ" if s.get("scheme") in ("insideZone", "splitZone") else None
        if not fam: continue
        ag, los, by = s["agents"], s["los"], s["ballY"]
        dfn = [a["i"] for a in ag if a["team"] == "D"]; off = {a["i"] for a in ag if a["team"] == "O"}
        ol = [a["i"] for a in ag if a["slot"] in OL]
        dirx = 1 if sum(fr[0]["a"][i][0] for i in dfn) / len(dfn) > los else -1
        combo = {}
        for a in ag:
            if a["slot"] in OL and a["plan"] == "combo":
                mates = [b["i"] for b in ag if b["slot"] in OL and b["tgt"] == a["tgt"] and b is not a]
                for m in [a["i"], *mates]: combo[m] = a["tgt"]
        f0 = fr[0]["a"]
        box = [d for d in dfn if 2.5 <= (f0[d][0] - los) * dirx <= 7 and abs(f0[d][1] - by) <= 5]
        for b in box:
            nbox[fam] += 1
            reach_k = None; touched = False
            for k, f in enumerate(fr):
                c = f["c"]
                if c >= 0 and ag[c]["slot"] != "QB" and (f["a"][b][0] - f["a"][c][0]) * dirx <= 0.5:
                    reach_k = k; break
                if f["a"][b][5] in off: touched = True; break
            if touched or reach_k is None: continue
            tot[fam] += 1
            # classify each OL over the window [reach-5, reach]
            win = fr[max(0, reach_k - 5): reach_k + 1]
            f = fr[reach_k]
            cls = {}
            for o in ol:
                kinds = Counter()
                for g in win:
                    e = g["a"][o][5]
                    if e < 0: kinds["free"] += 1
                    else:
                        two = any(g["a"][q][5] == e for q in ol if q != o)
                        planned = combo.get(o) is not None and ag[e]["slot"] == combo.get(o)
                        kinds["two-on-one unplanned" if two and not planned else "two-on-one planned" if two else "alone"] += 1
                cls[o] = kinds.most_common(1)[0][0]
            if any(v == "two-on-one unplanned" for v in cls.values()): anytwo[fam] += 1
            o = min(ol, key=lambda o: math.dist(f["a"][o][:2], f["a"][b][:2]))
            near[fam][cls[o]] += 1
            if cls[o] == "free":
                tg = f["a"][o][6]; plan = f["a"][o][8]
                who = "this backer" if tg == b else "none" if tg < 0 else ("a DL" if (f0[tg][0]-los)*dirx < 2.5 else "another 2nd-level man")
                ever = any(g["a"][o][5] >= 0 for g in fr[:reach_k+1])
                depth = (f["a"][o][0] - los) * dirx
                dist = math.dist(f["a"][o][:2], f["a"][b][:2])
                free_detail[fam][(plan, who, "had contact" if ever else "never touched anyone")] += 1
                free_geo[fam].append((depth, dist, math.hypot(f["a"][o][2], f["a"][o][3])))
                if plan == "climb" and who == "another 2nd-level man":
                    # his own target: touched by anyone before the carrier reaches it? distance to it; is this backer anyone's target?
                    t_touched = any(g["a"][tg][5] in off for g in fr[:reach_k+1])
                    t_dist = math.dist(f["a"][o][:2], f["a"][tg][:2])
                    others = [q for q in ol if q != o and f["a"][q][6] == b]
                    # was this backer in front of him (downfield and inside the lane to his target)?
                    alt[fam][("target already touched" if t_touched else "target untouched",
                              "nearer than his target" if dist < t_dist else "farther",
                              "another OL targets this backer" if others else "nobody targets this backer")] += 1
                    altgeo[fam].append((dist, t_dist))
for fam in sorted(tot):
    print(f"{fam}: box backers {nbox[fam]}, untouched before the carrier {tot[fam]} ({tot[fam]/nbox[fam]:.0%}); "
          f"plays with an unplanned two-on-one at that moment {anytwo[fam]} ({anytwo[fam]/tot[fam]:.0%})")
    for k, v in near[fam].most_common(): print(f"   nearest OL {k}: {v} ({v/tot[fam]:.0%})")

for fam in sorted(free_detail):
    print(fam, "free nearest OL: (plan now, his target, contact history)")
    for k, v in free_detail[fam].most_common(10): print("   ", k, v)
    g = sorted(free_geo[fam]); n = len(g)
    med = lambda i: sorted(x[i] for x in g)[n//2]
    print(f"   median depth past LOS {med(0):.1f} yd, distance to the backer {med(1):.1f} yd, speed {med(2):.1f} yd/s")

for fam in sorted(alt):
    print(fam, "climbers going to another 2nd-level man while this backer is untouched:")
    for k, v in alt[fam].most_common(): print("   ", k, v)
    g = altgeo[fam]; n = len(g)
    print(f"   median distance to this backer {sorted(x[0] for x in g)[n//2]:.1f}, to his target {sorted(x[1] for x in g)[n//2]:.1f}")
