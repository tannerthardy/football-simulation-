"""Run plays, NFL vs sim, same operator: first defender within 1.0 yd of the carrier (after handoff/0.8 s).
Per concept: carrier depth at first contact (median, share behind LOS), time; the first defender's snap group/box
(line < 1.6 deep, box backer, DB); was he blocked before (within 1.2 yd of an offensive non-carrier for 3 frames at
any time before) -> 'unblocked' vs 'shed'; if unblocked: was he within 2 yd of any blocker at 0.5 s before contact.
env CONCEPTS. usage: firsthit.py rfr nfl traces..."""
import sys, os, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = set(os.environ.get("CONCEPTS", "POWER,COUNTER,TRAP,INSIDE ZONE,OUTSIDE ZONE,DRAW").split(","))
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    c = p["concept"]
    if c not in CON: return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 20: return
    defs = [j for j, q in enumerate(pl) if q["side"] == "D"]
    offs = [i for i, q in enumerate(pl) if q["side"] == "O" and i != car and q["group"] != "QB"]
    hit = None
    for f in range(8, n):
        js = [j for j in defs if math.dist(xy[f][j], xy[f][car]) < 1.0]
        if js: hit = (min(js, key=lambda j: math.dist(xy[f][j], xy[f][car])), f); break
    key = (s, c); C[key]["n"] += 1
    if not hit: C[key]["no contact"] += 1; return
    j, f = hit
    V[key, "x"].append(xy[f][car][0]); V[key, "t"].append(f / 10); C[key]["behind LOS"] += xy[f][car][0] < 0
    g = "line" if xy[0][j][0] < 1.6 else ("DB" if pl[j]["group"] == "DB" else "backer")
    blocked = any(all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (g0, g0+1, g0+2)) for i in offs for g0 in range(1, f - 2))
    C[key][g + (" shed" if blocked else " unblocked")] += 1
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for c in sorted(CON):
    for s in ("nfl", "sim"):
        k = (s, c); n = max(1, C[k]["n"]); h = max(1, n - C[k]["no contact"])
        if not C[k]["n"]: continue
        parts = " ".join(f"{g} {C[k][g]/h:.0%}" for g in ("line shed", "line unblocked", "backer shed", "backer unblocked", "DB shed", "DB unblocked"))
        print(f"{c:13} {s} n{C[k]['n']:5d} contact x {med(V[k,'x']):+.2f} t {med(V[k,'t']):.1f} behindLOS {C[k]['behind LOS']/h:.0%} | {parts}")
