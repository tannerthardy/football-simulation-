"""Carrier's lateral speed toward the play (sign of his y at handoff+1 s) and
depth, at fixed times after the snap; under-centre runs of one concept.
usage: backlat.py FILE CONCEPT"""
import gzip, json, sys, statistics as st
f, con = sys.argv[1], sys.argv[2]
T = [.3, .5, .8, 1.0, 1.3]
lat = {t: [] for t in T}; hand = []
for l in gzip.open(f, 'rt'):
    c = json.loads(l); c = c.get('common', c)
    if c.get('kind') != 'run' or (c.get('cell') or {}).get('concept') != con: continue
    xy, dt, k = c['xy'], c['dt'], c['carrier']
    qb = next((i for i, p in enumerate(c['players']) if p.get('group') == 'QB'), None)
    if qb is None or k is None or xy[0][2 * qb] < -2: continue
    h = (c['events'] or {}).get('handoff'); 
    if h: hand.append(h)
    y = lambda t, i: xy[min(len(xy) - 1, round(t / dt))][2 * i + 1]
    end = min(len(xy) - 1, round(((h or 1) + 1) / dt))
    side = 1 if xy[end][2 * k + 1] - xy[0][2 * k + 1] > 0 else -1
    for t in T:
        a, b = round((t - .1) / dt), round((t + .1) / dt)
        if b >= len(xy): continue
        lat[t].append(side * (xy[b][2 * k + 1] - xy[a][2 * k + 1]) / (.2))
print(f.split('/')[-1], con, 'n', len(lat[.3]), 'handoff p50 %.2f' % st.median(hand) if hand else '')
for t in T: print('  %.1fs carrier lateral toward play p50 %+.2f' % (t, st.median(lat[t])))
