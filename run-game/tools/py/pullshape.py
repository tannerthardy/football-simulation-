"""Puller path shape, NFL vs sim, same operator (positions only, 10 Hz). Counter and power; rule pullers
(run_film_reference.puller), ranked toward the pull side at the snap: P1 (first = kick on GT counter), P2 (wrap).
Heading = angle of travel from flat toward the pull side (0 deg) to straight upfield (90 deg), from 0.2 s position
differences. Per puller:
- speed at 0.5/1.0/1.5/2.0 s and peak speed before the turn;
- turn time: first t >= 0.5 s with heading >= 45 deg for 2 frames; speed there; the dip = peak-before-turn minus the
  minimum speed in [turn-0.5, turn+0.2];
- turn duration: heading 20 -> 70 deg; peak heading rate (deg/s);
- 'stop-and-go': any frame in [0.5, turn+0.3] with speed < 1.5 yd/s;
- his first sustained block (1.2 yd x 3 frames, before carrier cross + 0.6 s): the defender's lateral at the turn
  time relative to the puller's turn lateral; across plays, r(turn lateral, that defender's lateral at the turn).
usage: pullshape.py rfr nfl.jsonl.gz traces...  (env CONCEPTS=COUNTER,POWER)"""
import sys, os, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
CONS = set(os.environ.get("CONCEPTS", "COUNTER,POWER").split(","))
V = collections.defaultdict(list); N = collections.Counter(); P = collections.defaultdict(list)
def q(v):
    v = sorted(x for x in v if x is not None and not math.isnan(x))
    return f"{v[len(v)//4]:+.2f}/{v[len(v)//2]:+.2f}/{v[3*len(v)//4]:+.2f} n{len(v)}" if v else "-"
def corr(a, b):
    n = len(a)
    if n < 5: return float('nan')
    ma, mb = sum(a)/n, sum(b)/n
    va = sum((x-ma)**2 for x in a); vb = sum((y-mb)**2 for y in b)
    return sum((x-ma)*(y-mb) for x, y in zip(a, b)) / math.sqrt(va*vb) if va > 0 and vb > 0 else float('nan')
def measure(p):
    c = p["concept"]
    if c not in CONS: return
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy); s = p["src"]
    if n < 26: return
    ol = [i for i, x in enumerate(pl) if x["side"] == "O" and x["group"] == "OL"]
    if len(ol) != 5: return
    pulls = [i for i in ol if rfr.puller(xy, i, 25)]
    if not pulls: return
    ps = 1 if sum(xy[15][i][1] - xy[0][i][1] for i in pulls) > 0 else -1
    crs = next((k for k in range(n) if xy[k][car][0] >= 0), None)
    if crs is None: return
    end = min(n, crs + 7)
    defs = [i for i, x in enumerate(pl) if x["side"] == "D"]
    cy = sum(xy[0][i][1] for i in ol) / 5
    order = sorted(pulls, key=lambda i: -(xy[0][i][1] - cy) * ps)
    for rank, i in enumerate(order[:2]):
        key = (s, c, f"P{rank+1}"); N[key] += 1
        sp = [0.0] + [math.dist(xy[k][i], xy[k-1][i]) * 10 for k in range(1, n)]
        hd = [None] * n
        for k in range(2, n):
            dx = xy[k][i][0] - xy[k-2][i][0]; dy = (xy[k][i][1] - xy[k-2][i][1]) * ps
            if math.hypot(dx, dy) > .1: hd[k] = math.degrees(math.atan2(dx, dy))
        for t in (5, 10, 15, 20):
            if t < n: V[key + (f"speed {t/10}",)].append(sp[t])
        turn = next((k for k in range(5, end - 1) if hd[k] is not None and hd[k] >= 45 and hd[k+1] is not None and hd[k+1] >= 45), None)
        if turn is None: N[key + ("no turn by cross+0.6",)] += 1; continue
        V[key + ("turn t",)].append(turn / 10)
        V[key + ("turn depth x",)].append(xy[turn][i][0])
        V[key + ("turn lateral (from snap)",)].append((xy[turn][i][1] - xy[0][i][1]) * ps)
        peak = max(sp[3:turn + 1]); lo = min(sp[max(3, turn - 5):min(n, turn + 3)])
        V[key + ("speed at turn",)].append(sp[turn]); V[key + ("peak before turn",)].append(peak); V[key + ("dip",)].append(peak - lo)
        V[key + ("min speed around turn",)].append(lo)
        N[key + ("stop-and-go (<1.5 yd/s)",)] += any(sp[k] < 1.5 for k in range(5, min(n, turn + 4)))
        k20 = next((k for k in range(5, end) if hd[k] is not None and hd[k] >= 20), None)
        k70 = next((k for k in range(5, end) if hd[k] is not None and hd[k] >= 70), None)
        if k20 is not None and k70 is not None and k70 >= k20: V[key + ("turn 20->70 s",)].append((k70 - k20) / 10)
        rates = [abs(hd[k] - hd[k-1]) * 10 for k in range(max(6, turn - 5), min(n, turn + 5)) if hd[k] is not None and hd[k-1] is not None]
        if rates: V[key + ("peak heading rate deg/s",)].append(max(rates))
        hit = None
        for f in range(2, end - 2):
            near = [j for j in defs if all(math.dist(xy[g][i], xy[g][j]) < 1.2 for g in (f, f + 1, f + 2))]
            if near: hit = (f, min(near, key=lambda j: math.dist(xy[f][i], xy[f][j]))); break
        if hit:
            f, j = hit
            rel = (xy[turn][j][1] - xy[turn][i][1]) * ps
            V[key + ("his man lat rel puller at turn",)].append(rel)
            P[key].append(((xy[turn][i][1] - xy[0][i][1]) * ps, (xy[turn][j][1] - xy[0][i][1]) * ps))
            V[key + ("first block t - turn t",)].append((f - turn) / 10)
            if f < n and hd[f] is not None:
                V[key + ("heading at block",)].append(hd[f])
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
keys = sorted({k[:3] for k in N if len(k) == 3})
fields = ["speed 0.5", "speed 1.0", "speed 1.5", "speed 2.0", "peak before turn", "turn t", "turn depth x", "turn lateral (from snap)",
          "speed at turn", "min speed around turn", "dip", "turn 20->70 s", "peak heading rate deg/s", "his man lat rel puller at turn",
          "first block t - turn t", "heading at block"]
for c in sorted(CONS):
    for r in ("P1", "P2"):
        rows = [(s, (s, c, r)) for s in ("nfl", "sim") if N[(s, c, r)]]
        if not rows: continue
        print(f"== {c} {r}: " + "  ".join(f"{s} n{N[k]} noturn {N[k+('no turn by cross+0.6',)]} stopgo {N[k+('stop-and-go (<1.5 yd/s)',)]}" for s, k in rows))
        for fld in fields:
            print(f"   {fld:32}" + "  ".join(f"{s} {q(V[k + (fld,)]):26}" for s, k in rows))
        print("   r(turn lateral, his man lateral)  " + "  ".join(f"{s} {corr([a for a, b in P[k]], [b for a, b in P[k]]):+.2f}" for s, k in rows))
