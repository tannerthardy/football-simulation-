"""Draws, NFL vs sim, same operator: interior DL (on the line at the snap, within the OL span) at 0.5/1.0/1.5/2.0 s:
depth (x, - = backfield), distance to nearest OL, whether within 1.2 of an OL (engaged proxy); handoff time; distance
from the nearest interior DL to the carrier at handoff and at 0.5 s after; the OL's depth at the same times.
usage: drawdl.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); C = collections.Counter()
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != "DRAW": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 22: return
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    lo, hi = min(xy[0][i][1] for i in ol) - .5, max(xy[0][i][1] for i in ol) + .5
    dl = [j for j, q in enumerate(pl) if q["side"] == "D" and xy[0][j][0] < 1.6 and lo <= xy[0][j][1] <= hi]
    if not dl: return
    C[s] += 1
    ho = p.get("handoff") or 1.5
    for t in (0.5, 1.0, 1.5, 2.0):
        f = min(n - 1, int(round(t * 10)))
        for j in dl:
            d = min(math.dist(xy[f][j], xy[f][i]) for i in ol)
            V[s, t, "dlx"].append(xy[f][j][0]); V[s, t, "eng"].append(1 if d < 1.2 else 0)
        V[s, t, "olx"].append(sum(xy[f][i][0] for i in ol) / 5)
    for dt in (0, .5):
        f = min(n - 1, int(round((ho + dt) * 10)))
        V[s, dt, "dcar"].append(min(math.dist(xy[f][j], xy[f][car]) for j in dl))
    V[s, "ho"].append(ho)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    print(s, "n", C[s], "handoff", f"{med(V[s,'ho']):.2f}", "| DL->carrier at handoff", f"{med(V[s,0,'dcar']):.2f}", "+0.5s", f"{med(V[s,.5,'dcar']):.2f}")
    for t in (0.5, 1.0, 1.5, 2.0):
        e = V[s, t, "eng"]
        print(f"   t{t}: DL x {med(V[s,t,'dlx']):+.2f} engaged {sum(e)/max(1,len(e)):.0%} | OL x {med(V[s,t,'olx']):+.2f}")
