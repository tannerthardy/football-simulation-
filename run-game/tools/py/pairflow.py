"""Zone runs, NFL vs sim, same operator: OL-DL pairs within 1.0 yd (centres) at 0.6/1.0/1.4 s (each DL paired with his
nearest OL). Pair lateral velocity toward play side (mean of both), OL minus DL lateral velocity (+ = OL outpacing
toward the play side), OL lateral offset from the DL (+ = OL on the play side of him), and both depths.
Separately: OL not within 1.5 of any DL. env CON. usage: pairflow.py rfr nfl traces..."""
import sys, os, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = os.environ.get("CON", "OUTSIDE ZONE")
V = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != CON: return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 18: return
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    ps = 1 if xy[15][car][1] - xy[0][car][1] > 0 else -1
    dl = [j for j, q in enumerate(pl) if q["side"] == "D" and xy[0][j][0] < 1.6]
    for t in (0.6, 1.0, 1.4):
        f = int(round(t * 10)); vy = lambda i: (xy[f+1][i][1] - xy[f-1][i][1]) / .2 * ps
        for j in dl:
            o = min(ol, key=lambda i: math.dist(xy[f][i], xy[f][j]))
            if math.dist(xy[f][o], xy[f][j]) < 1.0:
                V[s, t, "pair"].append((vy(o) + vy(j)) / 2); V[s, t, "rel"].append(vy(o) - vy(j))
                V[s, t, "off"].append((xy[f][o][1] - xy[f][j][1]) * ps); V[s, t, "olx"].append(xy[f][o][0]); V[s, t, "dlx"].append(xy[f][j][0])
        for o in ol:
            if all(math.dist(xy[f][o], xy[f][j]) > 1.5 for j in dl): V[s, t, "free"].append(vy(o))
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    for t in (0.6, 1.0, 1.4):
        print(f"{s} t{t}: pairs {len(V[s,t,'pair'])} pair lat v {med(V[s,t,'pair']):+.2f} | OL-DL lat v {med(V[s,t,'rel']):+.2f} | OL offset {med(V[s,t,'off']):+.2f} | OL x {med(V[s,t,'olx']):+.2f} DL x {med(V[s,t,'dlx']):+.2f} | free OL lat v {med(V[s,t,'free']):+.2f} (n {len(V[s,t,'free'])})")
