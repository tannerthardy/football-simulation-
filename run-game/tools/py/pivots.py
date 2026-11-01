"""Brake-and-pivot movement by offensive role on run plays, NFL vs sim, same operator (positions only, 10 Hz).
For each offensive player except the carrier and QB, from 0.3 s until his first sustained contact (1.2 yd x 3 frames
with a defender) or carrier cross + 0.6 s, while he is free:
- a PIVOT is a heading change > 60 deg within 0.3 s with speed at the turn < 1.5 yd/s after > 3 yd/s within the
  previous 0.5 s (he braked into a point and turned there);
- peak heading rate (deg/s) over frames moving > 2 yd/s;
- 'stall': speed < 1.0 yd/s for >= 0.3 s after having reached 3 yd/s, before contact (stopped at a landmark).
Roles: OL (rule puller split out as OL-pull), TE, back (non-carrier RB/FB), WR. Concept from the loader.
usage: pivots.py rfr nfl.jsonl.gz traces..."""
import sys, math, collections, importlib.util
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
N = collections.Counter(); PIV = collections.Counter(); ST = collections.Counter(); HR = collections.defaultdict(list)
def med(v): v = sorted(v); return v[len(v)//2] if v else float('nan')
def measure(p):
    xy, car, pl = p["xy"], p["carrier"], p["players"]; n = len(xy); s = p["src"]; c = p["concept"]
    if n < 20: return
    crs = next((k for k in range(n) if xy[k][car][0] >= 0), n - 7); end = min(n, crs + 7)
    defs = [i for i, x in enumerate(pl) if x["side"] == "D"]
    for i, x in enumerate(pl):
        if x["side"] != "O" or i == car or x["group"] in ("QB",): continue
        g = x["group"]
        if g == "OL" and rfr.puller(xy, i, min(25, n - 1)): g = "OL-pull"
        if g not in ("OL", "OL-pull", "TE", "RB", "FB", "WR"): continue
        if g == "FB": g = "RB"
        stop = end
        for f in range(3, end - 2):
            if any(all(math.dist(xy[h][i], xy[h][j]) < 1.2 for h in (f, f + 1, f + 2)) for j in defs): stop = f; break
        if stop - 3 < 5: continue
        sp = [0.0] + [math.dist(xy[k][i], xy[k-1][i]) * 10 for k in range(1, n)]
        hd = [None] * n
        for k in range(2, n):
            dx, dy = xy[k][i][0] - xy[k-2][i][0], xy[k][i][1] - xy[k-2][i][1]
            if math.hypot(dx, dy) > .08: hd[k] = math.atan2(dx, dy)
        key = (s, c, g); N[key] += 1
        piv = stall = False
        for k in range(5, stop - 3):
            if hd[k] is None or hd[k+3] is None: continue
            d = abs(math.degrees(math.atan2(math.sin(hd[k+3]-hd[k]), math.cos(hd[k+3]-hd[k]))))
            if d > 60 and min(sp[k:k+4]) < 1.5 and max(sp[max(0,k-5):k+1]) > 3: piv = True
        for k in range(5, stop - 3):
            if max(sp[3:k+1]) > 3 and all(sp[h] < 1.0 for h in (k, k+1, k+2)): stall = True; break
        PIV[key] += piv; ST[key] += stall
        rates = [abs(math.degrees(math.atan2(math.sin(hd[k]-hd[k-1]), math.cos(hd[k]-hd[k-1])))) * 10
                 for k in range(4, stop) if hd[k] is not None and hd[k-1] is not None and sp[k] > 2]
        if rates: HR[key].append(max(rates))
for p in rfr.nfl(sys.argv[2]): measure(p)
for p in rfr.sim(sys.argv[3:]): measure(p)
cons = sorted({k[1] for k in N}); roles = ["OL", "OL-pull", "TE", "RB", "WR"]
print(f"{'concept':13} {'role':8} | {'NFL n':>6} pivot  stall  peakHR | {'sim n':>6} pivot  stall  peakHR")
for c in cons:
    for r in roles:
        a, b = ("nfl", c, r), ("sim", c, r)
        if N[a] < 15 and N[b] < 15: continue
        f = lambda k: f"{N[k]:6} {PIV[k]/max(1,N[k]):5.2f}  {ST[k]/max(1,N[k]):5.2f}  {med(HR[k]):6.0f}" if N[k] else f"{0:6}     -      -       -"
        print(f"{c:13} {r:8} | {f(a)} | {f(b)}")
