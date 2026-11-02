"""Draws, NFL vs sim, same operator: carrier depth (x) and speed and upfield velocity at 1.0..3.0 s; handoff time;
carrier depth at the snap; QB depth at handoff. usage: drawback.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); C = collections.Counter()
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != "DRAW": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 30: return
    C[s] += 1; V[s, "x0"].append(xy[0][car][0]); V[s, "ho"].append(p.get("handoff") or float('nan'))
    for t in (1.0, 1.5, 2.0, 2.5, 3.0):
        f = min(n - 2, int(round(t * 10)))
        V[s, t, "x"].append(xy[f][car][0]); V[s, t, "sp"].append(math.dist(xy[f+1][car], xy[f-1][car]) / .2)
        V[s, t, "vx"].append((xy[f+1][car][0] - xy[f-1][car][0]) / .2)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    print(f"{s}: n {C[s]} | carrier snap depth {med(V[s,'x0']):+.2f} | handoff {med(V[s,'ho']):.2f}")
    print("   " + " | ".join(f"t{t}: x {med(V[s,t,'x']):+.2f} sp {med(V[s,t,'sp']):.2f} up {med(V[s,t,'vx']):+.2f}" for t in (1.0, 1.5, 2.0, 2.5, 3.0)))
