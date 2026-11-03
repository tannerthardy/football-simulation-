"""Counter wrap turn-up and backers, NFL vs sim, same operator (wrapper as in wrapany.py: second puller toward play side).
Turn-up T: first frame after 2+ yd lateral where wrapper's upfield speed exceeds his playside lateral speed (0.2 s diffs).
At T: wrapper depth, lateral vs carrier (+ = wrapper outside), and box backers (snap depth 1.6-7, within 5 yd of ball)
in front (0..5 yd downfield of wrapper): inside him (lateral < -0.5), level (|lat|<=0.5), outside.
After T to cross+0.6: first sustained block (1.2 yd, 3 frames) group: backer/line/DB/none.
First carrier contact (1.0 yd, after 0.8 s): was the contact man a box backer, unblocked, and was he inside the wrapper at T?
usage: wrapeye.py rfr nfl traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def med(v): v = sorted(v); return round(v[len(v)//2], 2) if v else float('nan')
def q(v, p): v = sorted(v); return round(v[int(p*(len(v)-1))], 2) if v else float('nan')
def go(p):
    if p["concept"] != "COUNTER": return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, r in enumerate(pl) if r["side"] == "O" and r["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if len(pulls) < 2: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    w = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)[1]
    defs = [j for j, r in enumerate(pl) if r["side"] == "D"]
    box = [j for j in defs if 1.6 <= xy[0][j][0] <= 7 and abs(xy[0][j][1] - cy) < 5]
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    if cross is None: return
    T = None
    for f in range(2, min(n, cross + 7)):
        if abs(xy[f][w][1] - xy[0][w][1]) < 2: continue
        vx = xy[f][w][0] - xy[f-2][w][0]; vy = (xy[f][w][1] - xy[f-2][w][1]) * ps
        if vx > vy and vx > 0.1: T = f; break
    C[s]["n"] += 1
    if T is None: C[s]["no turn-up"] += 1; return
    V[s, "T"].append(T / 10); V[s, "T - cross"].append((T - cross) / 10)
    V[s, "wrap depth at T"].append(xy[T][w][0])
    V[s, "wrap lat - carrier lat at T"].append((xy[T][w][1] - xy[T][car][1]) * ps)
    pt = max(ol, key=lambda i: (xy[0][i][1] - cy) * ps)
    V[s, "abs: wrap lat at T (from ball, + playside)"].append((xy[T][w][1] - cy) * ps)
    V[s, "abs: carrier lat at cross"].append((xy[cross][car][1] - cy) * ps)
    V[s, "abs: carrier lat at T"].append((xy[T][car][1] - cy) * ps)
    V[s, "abs: playside OT snap lat"].append((xy[0][pt][1] - cy) * ps)
    V[s, "abs: wrap lat at T - PS OT snap lat"].append((xy[T][w][1] - xy[0][pt][1]) * ps)
    V[s, "wrap lat - carrier cross lat"].append((xy[T][w][1] - xy[cross][car][1]) * ps)
    ins = lvl = out = 0; inside_set = set()
    for j in box:
        dx = xy[T][j][0] - xy[T][w][0]; dl = (xy[T][j][1] - xy[T][w][1]) * ps
        if not (0 <= dx <= 5): continue
        if dl < -.5: ins += 1; inside_set.add(j)
        elif dl <= .5: lvl += 1
        else: out += 1
    V[s, "backers in front: inside"].append(ins); V[s, "backers in front: level"].append(lvl); V[s, "backers in front: outside"].append(out)
    C[s]["any backer inside at T"] += ins > 0
    end = min(n, cross + 7); hit = None
    for f in range(T, end - 2):
        for j in defs:
            if all(math.dist(xy[h][w], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): hit = (j, f); break
        if hit: break
    if hit:
        j, f = hit; g = "backer" if j in box else ("line" if xy[0][j][0] < 1.6 else "DB/other")
        C[s]["blocks " + g] += 1
        kicker = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)[0]
        mates = [i for i, r in enumerate(pl) if r["side"] == "O" and i not in (w, car)]
        held = any(math.dist(xy[f][i], xy[f][j]) < 1.2 for i in mates)
        C[s]["blocks %s: man already held by a mate" % g] += held
        C[s]["blocks %s: the kicker's man" % g] += math.dist(xy[f][kicker], xy[f][j]) < 1.2
        V[s, "first block depth (x)"].append(xy[f][w][0]); V[s, "first block lat from ball"].append((xy[f][w][1] - cy) * ps)
        if j in box: C[s]["blocks a backer who was inside at T"] += j in inside_set
    else: C[s]["blocks none"] += 1
    if ins and not (hit and hit[0] in inside_set):
        C[s]["inside backer at T, not blocked by wrap"] += 1
    offs = [i for i, r in enumerate(pl) if r["side"] == "O" and i != car and r["group"] != "QB"]
    hitc = None
    for f in range(8, n):
        js = [j for j in defs if math.dist(xy[f][j], xy[f][car]) < 1.0]
        if js: hitc = (min(js, key=lambda j: math.dist(xy[f][j], xy[f][car])), f); break
    if hitc:
        j, f = hitc
        blocked = any(all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (g0, g0+1, g0+2)) for i in offs for g0 in range(1, f - 2))
        if j in box and not blocked:
            C[s]["contact: unblocked box backer"] += 1
            C[s]["contact: unblocked backer was inside wrap at T"] += j in inside_set
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
for s in ("nfl", "sim"):
    c = C[s]; nn = c["n"] or 1
    print(f"== {s} n={c['n']}")
    for key in sorted(k for k in c if k != "n"): print(f"  {key:52s} {c[key]:4d}  {100*c[key]/nn:5.1f}%")
    for (ss, key), v in sorted(V.items()):
        if ss == s: print(f"  {key:52s} p25 {q(v,.25):6.2f}  med {med(v):6.2f}  p75 {q(v,.75):6.2f}  mean {sum(v)/len(v):6.2f}")
