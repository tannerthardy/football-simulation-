"""Counter scorecard, NFL vs sim, same operator (run_film_reference loaders, positions only).
Pull side = sign of the mean lateral move at 1.5 s of the rule pullers (run_film_reference.puller); plays with no OL
rule puller are counted and skipped. Roles by snap geometry: the five OL ranked toward the pull side
(PST PSG C BSG BST, '+pull' if a rule puller), inline TE by side, the non-carrier back.
Per role: lateral move toward the pull side and depth (x, + downfield) at 0.5/1.0/1.5/2.0 s (medians);
first sustained block = first defender within 1.2 yd for 3 straight frames (0.3 s) before the carrier is 0.6 s past
the LOS: his snap level (line < 1.8 yd deep / box 1.8-8 deep and within 8 yd / out), his snap side relative to the
blocker (pull side / over / backside, 1 yd), and the time.
usage: ctrcard.py run_film_reference.py nfl.jsonl.gz traces...  (env CONCEPTS=COUNTER)"""
import sys, os, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CONS = set(os.environ.get("CONCEPTS", "COUNTER").split(","))
TS = (0.5, 1.0, 1.5, 2.0)
N = collections.Counter(); C = collections.defaultdict(collections.Counter); V = collections.defaultdict(list)
def med(v):
    v = sorted(v); return v[len(v) // 2] if v else float('nan')
def measure(p):
    if p["concept"] not in CONS: return
    xy, car, pl = p["xy"], p["carrier"], p["players"]; src = p["src"]; n = len(xy)
    if n < 22: return
    k = lambda t: max(0, min(n - 1, int(round(t / 0.1))))
    grp = [q["group"] for q in pl]
    ol = [i for i, q in enumerate(pl) if q["side"] == "O" and grp[i] == "OL"]
    if len(ol) != 5: return
    N[src, "plays"] += 1
    pulls = [i for i in ol if rfr.puller(xy, i, k(2.5))]
    N[src, f"{len(pulls)} OL pullers"] += 1
    if not pulls: return
    ps = 1 if sum(xy[k(1.5)][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    cy = sum(xy[0][i][1] for i in ol) / 5
    cross = next((f for f in range(n) if xy[f][car][0] >= 0), None)
    if cross is None: return
    N[src, "scored"] += 1
    end = min(n, cross + 7)
    N[src, "carrier crosses pull side"] += (xy[cross][car][1] - cy) * ps > 0
    defs = [i for i, q in enumerate(pl) if q["side"] == "D"]
    rank = sorted(ol, key=lambda i: -(xy[0][i][1] - cy) * ps)
    role = {i: r + ("+pull" if i in pulls else "") for i, r in zip(rank, ("PST", "PSG", "C", "BSG", "BST"))}
    edge = max(abs(xy[0][i][1] - cy) for i in ol)
    for i, q in enumerate(pl):
        if q["side"] != "O" or i == car: continue
        if grp[i] == "TE" and xy[0][i][0] > -2.5 and abs(xy[0][i][1] - cy) < edge + 3:
            role[i] = "TE " + ("ps" if (xy[0][i][1] - cy) * ps > 0 else "bs")
        elif grp[i] in ("RB", "TE") and xy[0][i][0] <= -2.5 and abs(xy[0][i][1] - cy) < edge + 3:
            role[i] = "back2"
    for i, r in role.items():
        key = (src, r); C[key]["n"] += 1
        x0, y0 = xy[0][i]
        for t in TS:
            f = k(t)
            if f < n:
                V[key + (f"lat{t}",)].append((xy[f][i][1] - y0) * ps); V[key + (f"x{t}",)].append(xy[f][i][0])
        hit = None
        for f in range(2, end - 2):
            near = [j for j in defs if all(math.dist(xy[g][i], xy[g][j]) < 1.2 for g in (f, f + 1, f + 2))]
            if near:
                hit = (f, min(near, key=lambda j: math.dist(xy[f][i], xy[f][j]))); break
        if not hit: C[key]["nobody"] += 1; continue
        f, j = hit
        dx, dy = xy[0][j]
        lvl = "line" if dx < 1.8 else "box" if dx < 8 and abs(dy - cy) < 8 else "out"
        rel = (dy - y0) * ps
        sd = "ps" if rel >= 1 else "bs" if rel <= -1 else "over"
        C[key][f"{lvl} {sd}"] += 1; C[key][lvl] += 1
        V[key + ("t",)].append(f * 0.1); V[key + ("rel",)].append(rel); V[key + (f"rel {lvl}",)].append(rel)
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
for src in ("nfl", "sim"):
    print(src, {k[1]: v for k, v in N.items() if k[0] == src})
roles = sorted({k[1] for k in C}, key=lambda r: (["PST", "PSG", "C", "BSG", "BST", "TE ps", "TE bs", "back2"].index(r.split("+")[0]), r))
for r in roles:
    for src in ("nfl", "sim"):
        c = C[(src, r)]; n = c["n"]
        if n < 5: continue
        flow = " ".join(f"{med(V[(src, r, f'lat{t}')]):+.1f}/{med(V[(src, r, f'x{t}')]):+.1f}" for t in TS)
        tg = " ".join(f"{s} {c[s]/n:.2f}" for s in ("line ps", "line over", "line bs", "box ps", "box over", "box bs", "out"))
        print(f"{r:10} {src} n{n:5} flow lat/x @.5/1/1.5/2: {flow} | first block: nobody {c['nobody']/n:.2f} {tg} | t {med(V[(src, r, 't')]):.1f}")
