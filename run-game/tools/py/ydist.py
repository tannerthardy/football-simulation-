"""Run outcome distribution by family, NFL vs sim: carrier's final x (yd past LOS at play end) median, share <=0, 0-3, 4-9,
10+, 20+; and the carrier's lateral distance from his snap spot when he crosses the LOS (median |dy|) and share crossing
>4 yd wide of the ball. usage: ydist.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
FAM = {'POWER': 'gap', 'COUNTER': 'gap', 'TRAP': 'gap', 'INSIDE ZONE': 'IZ', 'OUTSIDE ZONE': 'OZ'}
def plays():
    yield from rfr.nfl(sys.argv[2]); yield from rfr.sim(sys.argv[3:])
for p in plays():
    fam = FAM.get(p['concept'])
    if not fam: continue
    xy, c = p['xy'], p['carrier']; n = len(xy)
    if n < 12: continue
    end = min(n - 1, int(round((p['end'] or (n - 1) * .1) / .1)))
    k = (fam, p['src']); y = xy[end][c][0]; o[k + ('y',)].append(y)
    f = next((g for g in range(n) if xy[g][c][0] > 0), None)
    if f is not None:
        y0 = xy[0][c][1]; o[k + ('lat',)].append(abs(xy[f][c][1] - y0))
med = lambda v: f"{st.median(v):5.2f}" if v else "  -  "
sh = lambda v, lo, hi: f"{sum(lo < x <= hi for x in v)/max(1,len(v)):.2f}"
print("fam src: n | final x median | <=0 | 0-3 | 3-9 | 10+ | 20+ | lateral from snap spot at crossing (median) | >4 yd")
for fam in ('IZ', 'OZ', 'gap'):
    for src in ('nfl', 'sim'):
        v = o[(fam, src, 'y')]; l = o[(fam, src, 'lat')]
        print(f"  {fam:3s} {src}: {len(v):4d} | {med(v)} | {sh(v,-99,0)} | {sh(v,0,3)} | {sh(v,3,9.999)} | {sh(v,9.999,999)} | {sh(v,19.999,999)} | {med(l)} | {sum(x>4 for x in l)/max(1,len(l)):.2f}")
