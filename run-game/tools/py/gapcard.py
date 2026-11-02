"""Gap-scheme blocker scorecard, NFL vs sim, same operator (positions only, 10 Hz).
Concepts: env CONCEPTS (default POWER,COUNTER,TRAP). Play side from the rule pullers' lateral move by 1.5 s.
Roles: K = first rule puller toward the play side (kick/trap), W = second (wrap/lead), PS-OL / C / BS-OL non-pullers by
snap lateral from the OL centre (play side > 0.75, backside < -0.75), PS-TE / BS-TE, BACK (non-carrier RB/FB).
First sustained contact = any defender within 1.2 yd for 3 frames before carrier cross + 0.6 s. At contact:
- t; approach angle (deg) between his mean velocity over the prior 0.3 s and the line to the defender at contact-0.3;
- speed (mean over prior 0.2 s); leverage = (blocker y - defender y) * ps (+ = blocker on the play side of him);
- depth gap = blocker x - defender x (- = blocker deeper);
- defender displaced in 0.5 s: dy*ps (+ = toward play side), dx (+ = back toward his own side);
- defender within 1.0 yd of the carrier before cross + 1.0 s ("leaked");
- pre-contact: pivot (heading change > 60 deg in 0.3 s at < 1.5 yd/s after > 3), stall (< 1 yd/s for 0.3 s after 3).
usage: gapcard.py rfr nfl.jsonl.gz traces..."""
import sys, os, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CON = set(os.environ.get("CONCEPTS", "POWER,COUNTER,TRAP").split(","))
V = collections.defaultdict(list); C = collections.defaultdict(collections.Counter)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def ang(ax, ay, bx, by):
    na, nb = math.hypot(ax, ay), math.hypot(bx, by)
    if na < 1e-6 or nb < 1e-6: return None
    return math.degrees(math.acos(max(-1, min(1, (ax*bx + ay*by) / (na*nb)))))
def go(p):
    c = p["concept"]
    if c not in CON: return
    xy, pl, car = p["xy"], p["players"], p["carrier"]; n = len(xy); s = p["src"]
    if n < 26: return
    k = lambda t: min(n - 1, int(round(t / .1)))
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and q["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    if not pulls: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    order = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), n - 7); end = min(n, cross + 7); lend = min(n, cross + 10)
    defs = [j for j, q in enumerate(pl) if q["side"] == "D"]
    roles = {}
    for r, i in zip(("K", "W"), order): roles[i] = r
    for i, q in enumerate(pl):
        if q["side"] != "O" or i == car or i in roles or q["group"] in ("QB", "WR"): continue
        lat = (xy[0][i][1] - cy) * ps
        if q["group"] == "OL": roles[i] = "PS-OL" if lat > .75 else "BS-OL" if lat < -.75 else "C"
        elif q["group"] == "TE": roles[i] = "PS-TE" if lat > 0 else "BS-TE"
        elif q["group"] in ("RB", "FB"): roles[i] = "BACK"
    C[s, c]["plays"] += 1
    for i, r in roles.items():
        key = (s, c, r); C[key]["n"] += 1
        sp = [0.0] + [math.dist(xy[f][i], xy[f-1][i]) * 10 for f in range(1, n)]
        hit = None
        for f in range(3, end - 2):
            for j in defs:
                if all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (f, f+1, f+2)): hit = (j, f); break
            if hit: break
        # pivots/stall before contact (or end)
        stop = hit[1] if hit else end
        hd = [None] * n
        for f in range(2, n):
            dx, dy = xy[f][i][0] - xy[f-2][i][0], xy[f][i][1] - xy[f-2][i][1]
            if math.hypot(dx, dy) > .08: hd[f] = math.atan2(dx, dy)
        piv = any(hd[f] is not None and hd[f+3] is not None and abs(math.degrees(math.atan2(math.sin(hd[f+3]-hd[f]), math.cos(hd[f+3]-hd[f])))) > 60
                  and min(sp[f:f+4]) < 1.5 and max(sp[max(0,f-5):f+1]) > 3 for f in range(5, max(5, stop - 3)))
        stall = any(max(sp[3:f+1]) > 3 and all(sp[h] < 1 for h in (f, f+1, f+2)) for f in range(5, max(5, stop - 3)))
        C[key]["pivot"] += piv; C[key]["stall"] += stall
        if not hit: C[key]["none"] += 1; continue
        j, f = hit; a = max(0, f - 3)
        vx, vy = (xy[f][i][0] - xy[a][i][0]) / ((f - a) * .1 or 1), (xy[f][i][1] - xy[a][i][1]) / ((f - a) * .1 or 1)
        A = ang(vx, vy, xy[a][j][0] - xy[a][i][0], xy[a][j][1] - xy[a][i][1])
        if A is not None: V[key, "angle"].append(A)
        V[key, "t"].append(f / 10); V[key, "speed"].append(math.dist(xy[f][i], xy[max(0, f-2)][i]) * 5)
        V[key, "lev"].append((xy[f][i][1] - xy[f][j][1]) * ps); V[key, "dgap"].append(xy[f][i][0] - xy[f][j][0])
        g = min(n - 1, f + 5)
        V[key, "ddy"].append((xy[g][j][1] - xy[f][j][1]) * ps); V[key, "ddx"].append(xy[g][j][0] - xy[f][j][0])
        C[key]["leaked"] += any(math.dist(xy[h][j], xy[h][car]) < 1.0 for h in range(f, lend))
        C[key]["line man"] += xy[0][j][0] < 1.6
for p in rfr.nfl(sys.argv[2]): go(p)
for p in rfr.sim(sys.argv[3:]): go(p)
roles = ("K", "W", "PS-OL", "C", "BS-OL", "PS-TE", "BS-TE", "BACK")
for c in sorted(CON):
    print(f"\n### {c}   plays nfl {C['nfl', c]['plays']} sim {C['sim', c]['plays']}")
    print(f"{'role':6} {'src':3} {'n':>5} none  piv stall | t    angle speed  lev   dgap  dDy   dDx  | lineman leaked")
    for r in roles:
        for s in ("nfl", "sim"):
            key = (s, c, r); n = C[key]["n"]
            if not n: continue
            h = n - C[key]["none"]
            print(f"{r:6} {s:3} {n:5d} {C[key]['none']/n:4.0%} {C[key]['pivot']/n:4.0%} {C[key]['stall']/n:4.0%} | {med(V[key,'t']):4.1f} {med(V[key,'angle']):5.0f} {med(V[key,'speed']):5.2f} {med(V[key,'lev']):+5.2f} {med(V[key,'dgap']):+5.2f} {med(V[key,'ddy']):+5.2f} {med(V[key,'ddx']):+5.2f} | {C[key]['line man']/max(1,h):4.0%} {C[key]['leaked']/max(1,h):4.0%}")
