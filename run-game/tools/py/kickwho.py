"""Power (one OL rule puller), NFL vs sim, same operator: the kicker's first block (1.2 yd x 3 frames, before carrier
cross + 0.6 s). Class: EMLOS / other line man (snap depth < 1.6) / off-line (backer) / DB / nobody. For each class:
share, block time, the man's snap lateral from the PST (+ = outside), his snap depth, his position at the block
(lateral from PST snap, depth), and whether he was in contact with another blocker within 0.5 s before (1.2 yd)."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def go(p):
    if p["concept"] != "POWER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) != 1: return
    kk = pulls[0]; cy = sum(xy[0][i][1] for i in ol) / 5
    ps = 1 if xy[k(1.5)][kk][1] - xy[0][kk][1] > 0 else -1
    pst = max([i for i in ol if i != kk], key=lambda i: (xy[0][i][1] - cy) * ps)
    defs = [j for j, q in enumerate(pl) if q["side"] == "D"]
    line = [j for j in defs if xy[0][j][0] < 1.6 and pl[j]["group"] in ("DL", "LB")]
    emlos = max(line, key=lambda j: (xy[0][j][1] - cy) * ps) if line else None
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), n - 7); end = min(n, cross + 7)
    hit = None
    for f in range(3, end - 2):
        for j in defs:
            if all(math.dist(xy[h][kk], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): hit = (j, f); break
        if hit: break
    C[s]["n"] += 1
    if emlos is not None:
        for t in (1.3, 1.6):
            v = (xy[k(t)][emlos][1] - xy[0][pst][1]) * ps; V[s, "emlos", t].append(v)
            C[s][f"emlos wide>1.5 @{t}"] += v > 1.5
        tb = any(math.dist(xy[h][i], xy[h][emlos]) < 1.2 for i in [q for q, z in enumerate(pl) if z["side"] == "O" and q not in (kk, car)] for h in range(3, k(1.6)))
        C[s]["emlos touched by other before 1.6"] += tb
    if not hit: C[s]["nobody"] += 1; return
    j, f = hit
    cls = "EMLOS" if j == emlos else "line" if j in line else "DB" if pl[j]["group"] == "DB" else "backer"
    C[s][cls] += 1
    if emlos is not None:
        tb = any(math.dist(xy[h][i], xy[h][emlos]) < 1.2 for i in [q for q, z in enumerate(pl) if z["side"] == "O" and q not in (kk, car)] for h in range(3, f + 1))
        wide = (xy[max(0, f - 3)][emlos][1] - xy[max(0, f - 3)][kk][1]) * ps
        C[s, "x"][("end held by other" if tb else "end free") + " -> " + cls] += 1
        V[s, "endwide", cls, tb].append(wide)
        g = max(0, f - 3)
        holders = [i for i, z in enumerate(pl) if z["side"] == "O" and i not in (kk, car) and math.dist(xy[g][i], xy[g][emlos]) < 1.2]
        C[s, "arr"]["end on a teammate 0.3s before kicker block: " + ("yes " + pl[holders[0]]["group"] if holders else "no") + " -> " + cls] += 1
    mates = [i for i, q in enumerate(pl) if q["side"] == "O" and i not in (kk, car)]
    pre = any(math.dist(xy[h][i], xy[h][j]) < 1.2 for i in mates for h in range(max(0, f - 5), f + 1))
    for key, v in (("t", f / 10), ("snap lat", (xy[0][j][1] - xy[0][pst][1]) * ps), ("snap depth", xy[0][j][0]),
                   ("block lat", (xy[f][j][1] - xy[0][pst][1]) * ps), ("block depth", xy[f][j][0]), ("touched before", 1 if pre else 0),
                   ("kicker lat", (xy[f][kk][1] - xy[0][pst][1]) * ps), ("kicker depth", xy[f][kk][0])):
        V[s, cls, key].append(v)
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; n = c["n"]
    print(s, "EMLOS lat from PST @1.3/1.6", f"{med(V[s,'emlos',1.3]):+.2f}/{med(V[s,'emlos',1.6]):+.2f}", "wide>1.5", f"{c['emlos wide>1.5 @1.3']/n:.0%}/{c['emlos wide>1.5 @1.6']/n:.0%}", "touched by other blocker before 1.6", f"{c['emlos touched by other before 1.6']/n:.0%}")
    print(s, "n", n, " ".join(f"{k} {c[k]/n:.0%}" for k in ("EMLOS", "line", "backer", "DB", "nobody")))
    tot = collections.Counter()
    for kx, v in C[s, "x"].items(): tot[kx.split(" -> ")[0]] += v
    for kx, v in sorted(C[s, "x"].items()): print("   ", kx, v, f"{v/tot[kx.split(' -> ')[0]]:.0%}", "end lat vs kicker 0.3s before", f"{med(V[s,'endwide',kx.split(' -> ')[1], kx.startswith('end held')]):+.2f}")
    for kx, v in sorted(C[s, "arr"].items()): print("     ", kx, v)
    for cls in ("EMLOS", "line", "backer"):
        print("   ", cls, " ".join(f"{key} {med(V[s,cls,key]):+.2f}" for key in ("t", "snap lat", "snap depth", "block lat", "block depth", "kicker lat", "kicker depth", "touched before")))
