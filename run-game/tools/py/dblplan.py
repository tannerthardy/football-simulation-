"""Sim geometric zone doubles (dblside definition) by side: the two OL's snap plans and targets, whether it was a
controller combo (both plan combo on this DL), and whether either climbs (geometric mark). usage: dblplan.py rfr traces..."""
import sys, json, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.Counter()
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p.get("setup", {})
        if p["nullified"] or not s.get("concept"): continue
        con = rfr.SIM_CONCEPT.get(s["concept"], s["concept"])
        if con not in ("INSIDE ZONE", "OUTSIDE ZONE"): continue
        ag = s["agents"]; grp = [rfr.GROUP.get(a["pos"], a["pos"]) for a in ag]; slot = [a["slot"] for a in ag]
        xy = [[(q[0] - s["los"], q[1]) for q in f["a"]] for f in p["frames"]]
        car = next((f["c"] for f in p["frames"] if f["c"] >= 0 and slot[f["c"]] != "QB"), None)
        if car is None or len(xy) < 15: continue
        ol = [i for i, g in enumerate(grp) if g == "OL"]; dl = [i for i, g in enumerate(grp) if g == "DL" and xy[3][i][0] < 1.5]
        if not any(g == "LB" for g in grp): continue
        cy = sum(xy[0][i][1] for i in ol) / len(ol)
        crs = next((k for k in range(len(xy)) if xy[k][car][0] >= 0), None)
        if crs is None: continue
        sd = 1 if xy[crs][car][1] - cy >= 0 else -1
        d = lambda k, a, b: math.dist(xy[k][a], xy[k][b])
        for t in dl:
            lat = (xy[0][t][1] - cy) * sd; side = 'PLAY' if lat > 1 else 'BACK' if lat < -1 else 'MID'
            for ai in range(len(ol)):
                for bi in range(ai + 1, len(ol)):
                    a, b = ol[ai], ol[bi]
                    run = 0; start = None
                    for k in range(min(10, len(xy))):
                        run = run + 1 if d(k, a, t) < 1.3 and d(k, b, t) < 1.3 else 0
                        if run >= 3: start = k - 2; break
                    if start is None: continue
                    climb = any(d(k, m, t) >= 2 and xy[k][m][0] > 0.5 and xy[k][m][0] > xy[k][t][0] for k in range(start, min(25, len(xy))) for m in (a, b))
                    pa, pb = ag[a], ag[b]
                    combo = pa["plan"] == "combo" and pb["plan"] == "combo" and pa["tgt"] == pb["tgt"] == slot[t]
                    def desc(q): return f"{q['plan']}->{'this DL' if q['tgt'] == slot[t] else (grp[slot.index(q['tgt'])] if q['tgt'] in slot else '-')}"
                    pl = " + ".join(sorted([desc(pa), desc(pb)]))
                    k = f"{con:12} {side:4} {'COMBO' if combo else 'other'}"
                    C[k + ' doubles'] += 1; C[k + ' climbs'] += climb
                    if not combo: C[f"{con:12} {side:4} plans {pl}"] += 1; C[f"{con:12} {side:4} plans {pl} climbs"] += climb
for k in sorted(C):
    if C[k] >= 6 or k.endswith('doubles'): print(f"{C[k]:5}  {k}")
