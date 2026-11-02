"""Draws, NFL vs sim, same operator (positions only): first defender within 1.0 yd of the carrier (after 0.8 s). For
line defenders (snap depth < 1.6) who were within 1.2 yd of an offensive lineman/TE at some point before: the last frame
he was within 1.2 yd of a blocker ("leave"); time from leave to the hit; carrier distance to that blocker and to the
DL at leave; carrier depth at leave and at the hit; share of first hits by such shed line men behind the LOS.
usage: drawshed.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
V = collections.defaultdict(list); C = collections.defaultdict(collections.Counter)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def q(v, p): v = sorted(v); return v[int(p*(len(v)-1))] if v else float('nan')
def go(p):
    if p["concept"] != "DRAW": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 20: return
    defs = [j for j, z in enumerate(pl) if z["side"] == "D"]
    blk = [i for i, z in enumerate(pl) if z["side"] == "O" and z["group"] in ("OL", "TE")]
    hit = None
    for f in range(8, n):
        js = [j for j in defs if math.dist(xy[f][j], xy[f][car]) < 1.0]
        if js: hit = (min(js, key=lambda j: math.dist(xy[f][j], xy[f][car])), f); break
    C[s]["n"] += 1
    if not hit: return
    j, f = hit
    if xy[0][j][0] >= 1.6: return
    near = [g for g in range(1, f) if any(math.dist(xy[g][j], xy[g][i]) < 1.2 for i in blk)]
    if not near: C[s]["line hit, never near a blocker"] += 1; return
    g = near[-1]; b = min(blk, key=lambda i: math.dist(xy[g][j], xy[g][i]))
    C[s]["shed line hit"] += 1; C[s]["shed line hit behind LOS"] += xy[f][car][0] < 0
    V[s, "dt"].append((f - g) / 10); V[s, "carB"].append(math.dist(xy[g][car], xy[g][b])); V[s, "carD"].append(math.dist(xy[g][car], xy[g][j]))
    V[s, "carx_leave"].append(xy[g][car][0]); V[s, "carx_hit"].append(xy[f][car][0]); V[s, "tleave"].append(g / 10)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; n = max(1, c["n"])
    print(f"{s}: draws {c['n']} | first hit by a shed line man {c['shed line hit']/n:.0%} (behind LOS {c['shed line hit behind LOS']/n:.0%}) | line hit never near a blocker {c['line hit, never near a blocker']/n:.0%}")
    for k, lab in (("tleave", "leave t"), ("dt", "leave->hit s"), ("carB", "carrier to his blocker at leave"), ("carD", "carrier to the DL at leave"), ("carx_leave", "carrier depth at leave"), ("carx_hit", "carrier depth at hit")):
        print(f"   {lab:32} p25/50/75 {q(V[s,k],.25):+.2f} / {med(V[s,k]):+.2f} / {q(V[s,k],.75):+.2f}")
