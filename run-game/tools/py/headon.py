"""At the first touch (defender center within 1.0 yd, f >= 0.3 s): cos(runner heading, line to toucher), closing speed,
head-on share (cos > 0.7 and closing > 3 yd/s), by band (carrier x behind / 0-3 / 3+) and family (gap/zone).
Also per family: first touch behind the LOS share and never-crosses. usage: headon.py rfr nfl traces"""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(list)
FAM = {'POWER': 'gap', 'COUNTER': 'gap', 'TRAP': 'gap', 'INSIDE ZONE': 'zone', 'OUTSIDE ZONE': 'zone'}
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
def vel(xy, f, i):
    a, b = xy[max(0, f - 1)][i], xy[min(len(xy) - 1, f + 1)][i]; k = .1 * max(1, min(len(xy) - 1, f + 1) - max(0, f - 1))
    return ((b[0] - a[0]) / k, (b[1] - a[1]) / k)
for p in plays():
    fam = FAM.get(p['concept'])
    if not fam: continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 12: continue
    k0 = (fam, p['src'])
    o[k0 + ('nocross',)].append(max(xy[g][c][0] for g in range(n)) <= 0)
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    hit = next(((f, j) for f in range(3, n) for j in dfn if math.dist(xy[f][j], xy[f][c]) < 1.0), None)
    if not hit: continue
    f, j = hit; x = xy[f][c][0]
    band = 'behind' if x < 0 else '0-3' if x < 3 else '3+'
    o[k0 + ('behindshare',)].append(band == 'behind')
    vc, vd = vel(xy, f, c), vel(xy, f, j)
    dx, dy = xy[f][j][0] - xy[f][c][0], xy[f][j][1] - xy[f][c][1]; L = math.hypot(dx, dy) or 1e-6
    sp = math.hypot(*vc) or 1e-6
    cos = (vc[0] * dx + vc[1] * dy) / (sp * L)
    closing = ((vc[0] - vd[0]) * dx + (vc[1] - vd[1]) * dy) / L
    k = k0 + (band,)
    o[k + ('cos',)].append(cos); o[k + ('head',)].append(cos > .7 and closing > 3); o[k + ('dv',)].append(math.hypot(*vd))
for fam in ('gap', 'zone'):
    for src in ('nfl', 'sim'):
        k0 = (fam, src); nc = o[k0 + ('nocross',)]; bs = o[k0 + ('behindshare',)]
        row = f"  {fam:4s} {src}: never crosses {sum(nc)/max(1,len(nc)):.2f} | first touch behind {sum(bs)/max(1,len(bs)):.2f}"
        for band in ('behind', '0-3', '3+'):
            k = k0 + (band,); h = o[k + ('head',)]
            row += f" | {band}: head-on {sum(h)/max(1,len(h)):.2f} cos {st.median(o[k+('cos',)]) if h else 0:.2f} def v {st.median(o[k+('dv',)]) if h else 0:.2f}"
        print(row)
