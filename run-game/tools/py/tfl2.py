"""Gap runs that never cross the LOS: the first defender at the carrier, by where he lined up relative to the
pull (pull direction = mean puller lateral at 1.5 s): play side beyond the hole / play side inside / over the
puller's vacated spot (within 1.2 yd laterally of a puller's snap spot) / backside; and the OL who was last
within 1.2 yd of him (puller / other). usage: tfl2.py rfr.py nfl.jsonl.gz traces..."""
import importlib.util, math, sys, collections, statistics as st
spec = importlib.util.spec_from_file_location("rfr", sys.argv[1]); rfr = importlib.util.module_from_spec(spec); spec.loader.exec_module(rfr)
o = collections.defaultdict(collections.Counter); N = collections.Counter()
def plays():
    yield from rfr.nfl(sys.argv[2])
    yield from rfr.sim(sys.argv[3:])
for p in plays():
    con = p['concept']
    if con not in ('POWER', 'COUNTER', 'TRAP'): continue
    xy, pl, c = p['xy'], p['players'], p['carrier']; n = len(xy)
    if n < 16: continue
    ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'OL']
    if len(ol) < 5: continue
    pullers = [i for i in ol if rfr.puller(xy, i, min(n - 1, 25))]
    if not pullers: continue
    key = (con, p['src']); N[key] += 1
    if next((f for f in range(n) if xy[f][c][0] > 0), None) is not None: continue
    pd = math.copysign(1, st.mean(xy[15][i][1] - xy[0][i][1] for i in pullers))
    dfn = [j for j, q in enumerate(pl) if q['side'] == 'D']
    hit = next(((f, j) for f in range(3, n) for j in dfn if math.dist(xy[f][j], xy[f][c]) < 1.0), None)
    if not hit: o[key]['no defender'] += 1; continue
    f, j = hit
    cy = st.mean(xy[0][i][1] for i in ol)
    y0 = xy[0][j][1]
    if any(abs(y0 - xy[0][i][1]) < 1.2 for i in pullers): where = 'over vacated puller spot'
    elif (y0 - cy) * pd > 0: where = 'play side'
    else: where = 'back side'
    last = max(((g, b) for g in range(f) for b in ol if math.dist(xy[g][j], xy[g][b]) < 1.2), default=None)
    by = 'unblocked' if last is None else ('by a puller' if last[1] in pullers else 'by a non-puller OL')
    o[key][f'{pl[j]["group"]} {where}, {by}'] += 1
for con in ('POWER', 'COUNTER', 'TRAP'):
    for src in ('nfl', 'sim'):
        k = (con, src); tot = sum(o[k].values())
        print(f"{con} {src}: {tot} of {N[k]} never cross")
        for w, v in o[k].most_common(6): print(f"    {v/max(1,N[k]):.2f} of plays  {w}")
