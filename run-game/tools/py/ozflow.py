"""Outside zone, NFL vs sim, same operator: play side = carrier's lateral move by 1.5 s. Lateral velocity toward the
play side (yd/s) and depth of OL (by rank from centre: C, G, T, play/back side) and line DL (snap depth < 1.6) at
0.3/0.6/1.0/1.5 s; also OL-DL engaged proxy (within 1.2) share. env CON (default OUTSIDE ZONE). usage: ozflow.py rfr nfl traces..."""
import sys, os, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = os.environ.get("CON", "OUTSIDE ZONE")
V = collections.defaultdict(list); C = collections.Counter()
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
TS = (0.3, 0.6, 1.0, 1.5)
def go(p):
    if p["concept"] != CON: return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 18: return
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    ps = 1 if xy[15][car][1] - xy[0][car][1] > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    dl = [j for j, q in enumerate(pl) if q["side"] == "D" and xy[0][j][0] < 1.6 and abs(xy[0][j][1] - cy) < 6]
    C[s] += 1
    for i in ol:
        lat = (xy[0][i][1] - cy) * ps; role = "C" if abs(lat) < .7 else ("PS" if lat > 0 else "BS") + ("-G" if abs(lat) < 2.2 else "-T")
        for t in TS:
            f = int(round(t * 10)); v = (xy[f+1][i][1] - xy[f-1][i][1]) / .2 * ps
            V[s, role, t].append(v)
    for j in dl:
        for t in TS:
            f = int(round(t * 10)); V[s, "DL", t].append((xy[f+1][j][1] - xy[f-1][j][1]) / .2 * ps)
            V[s, "DLx", t].append(xy[f][j][0])
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    print(f"{s} n {C[s]}  lateral velocity toward play side (yd/s) at " + " / ".join(str(t) for t in TS))
    for r in ("BS-T", "BS-G", "C", "PS-G", "PS-T", "DL"):
        print(f"   {r:5} " + "  ".join(f"{med(V[s,r,t]):+.2f}" for t in TS))
    print(f"   DL depth " + "  ".join(f"{med(V[s,'DLx',t]):+.2f}" for t in TS))
