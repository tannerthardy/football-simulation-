"""Sim power: first carrier contact by an unblocked line defender (firsthit operator). Lists per play: key (play index in
the stream), contact t, carrier depth/lat, defender snap lat from ball (+ = carrier's crossing side), snap depth, his
depth at contact, and whether he'd be the EMLOS. usage: lineunb.py rfr traces... (env CON)"""
import sys, os, math, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = os.environ.get("CON", "POWER")
k = 0
for p in rfr.sim(sys.argv[2:]):
    if p["concept"] != CON: continue
    k += 1
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy)
    if n < 20: continue
    defs = [j for j, q in enumerate(pl) if q["side"] == "D"]
    offs = [i for i, q in enumerate(pl) if q["side"] == "O" and i != car and q["group"] != "QB"]
    hit = None
    for f in range(8, n):
        js = [j for j in defs if math.dist(xy[f][j], xy[f][car]) < 1.0]
        if js: hit = (min(js, key=lambda j: math.dist(xy[f][j], xy[f][car])), f); break
    if not hit: continue
    j, f = hit
    if xy[0][j][0] >= 1.6: continue
    if any(all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (g0, g0+1, g0+2)) for i in offs for g0 in range(1, f - 2)): continue
    ps = 1 if xy[min(n-1, 15)][car][1] - xy[0][car][1] >= 0 else -1
    cy = xy[0][car][1]
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    cy = sum(xy[0][i][1] for i in ol) / max(1, len(ol))
    ps = 1 if xy[f][car][1] - cy >= 0 else -1
    print(f"{p.get('id', k)!s:>10} t {f/10:.1f} car ({xy[f][car][0]:+.2f},{(xy[f][car][1]-cy)*ps:+.2f}) def {pl[j].get('slot', pl[j]['group'])} snap lat {(xy[0][j][1]-cy)*ps:+.2f} dep {xy[0][j][0]:.2f} -> ({xy[f][j][0]:+.2f},{(xy[f][j][1]-cy)*ps:+.2f})")
