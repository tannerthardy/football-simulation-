"""Head-on first touches (at g0 = f-1: cos > .7, closing > 3), by band: share where the carrier keeps >= 80% of his g0
speed at f+3 (an unloaded touch), median speed ratio at f+3, and (sim only, from the raw trace events) the share with
a tackle_wrap within 0.15 s of the touch frame. usage: unloaded.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st, json
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
def vel(xy, f, i):
    a, b = xy[max(0, f - 1)][i], xy[min(len(xy) - 1, f + 1)][i]; k = .1 * max(1, min(len(xy) - 1, f + 1) - max(0, f - 1))
    return ((b[0] - a[0]) / k, (b[1] - a[1]) / k)
def one(p, wraps=None):
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 12 or p['concept'] not in rfr.CONCEPTS: return
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    hit = next(((f, j) for f in range(3, n) for j in dfn if math.dist(xy[f][j], xy[f][c]) < 1.0), None)
    if not hit or hit[0] + 3 >= n: return
    f, j = hit; g = f - 1
    vc, vd = vel(xy, g, c), vel(xy, g, j); sp = math.hypot(*vc) or 1e-6
    dx, dy = xy[g][j][0] - xy[g][c][0], xy[g][j][1] - xy[g][c][1]; L = math.hypot(dx, dy) or 1e-6
    cos = (vc[0] * dx + vc[1] * dy) / (sp * L); closing = ((vc[0] - vd[0]) * dx + (vc[1] - vd[1]) * dy) / L
    if not (cos > .7 and closing > 3): return
    x = xy[f][c][0]; band = 'behind' if x < 0 else '0-3' if x < 3 else '3+'
    r = math.hypot(*vel(xy, f + 3, c)) / sp
    k = (p['src'], band); o[k + ('ratio',)].append(r); o[k + ('unloaded',)].append(r >= .8)
    if wraps is not None: o[k + ('wrap',)].append(any(abs(t - f * .1) <= .15 for t in wraps))
for p in rfr.nfl(sys.argv[2]): one(p)
for path in sys.argv[3:]:
    raw = json.load(open(path)); it = rfr.sim([path]); i = 0
    for p in it:
        while raw[i]['nullified'] or raw[i]['setup'].get('concept') is None: i += 1
        one(p, [e['t'] for e in raw[i]['events'] if e['type'] == 'tackle_wrap']); i += 1
for band in ('behind', '0-3', '3+'):
    for src in ('nfl', 'sim'):
        k = (src, band); v = o[k + ('ratio',)]
        w = o[k + ('wrap',)]
        print(f"  {band:6s} {src}: n {len(v):4d} | unloaded (keeps >= 80% speed at +0.3 s) {sum(o[k+('unloaded',)])/max(1,len(v)):.2f} | median speed ratio {st.median(v) if v else 0:.2f}" + (f" | wrap within 0.15 s {sum(w)/max(1,len(w)):.2f}" if w else ''))
