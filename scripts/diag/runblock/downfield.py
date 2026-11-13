"""When the runner first reaches D yd past the line: which defenders are
downfield of him (by group), and where each DB was at the handoff (depth,
and whether he was outside the numbers-ish: |y - ball| > 8)."""
import gzip, json, sys, statistics as st
from collections import Counter
f = sys.argv[1]; D = float(sys.argv[2]) if len(sys.argv) > 2 else 10
cnt = Counter(); dbs = Counter(); n = 0; dbh = []
for l in gzip.open(f, 'rt'):
    c = json.loads(l); c = c.get('common', c)
    if c.get('kind') != 'run' or c.get('carrier') is None: continue
    P = c['players']; xy, dt, k = c['xy'], c['dt'], c['carrier']
    i = next((j for j, F in enumerate(xy) if F[2 * k] >= D), None)
    if i is None: continue
    n += 1; F = xy[i]; h = min(len(xy) - 1, round(((c.get('events') or {}).get('handoff') or 1) / dt))
    by = Counter()
    for j, p in enumerate(P):
        if p.get('side') != 'D': continue
        if F[2 * j] > F[2 * k]:
            by[p.get('group')] += 1
    for g in ('DB', 'LB', 'DL'): cnt[g] += by[g]
    # DBs: wide (outside 8 yd of the ball at the handoff) vs inside, downfield or not
    for j, p in enumerate(P):
        if p.get('side') != 'D' or p.get('group') != 'DB': continue
        wide = abs(xy[h][2 * j + 1] - c['ball_y']) > 8
        dbs[('wide' if wide else 'inside', 'downfield' if F[2 * j] > F[2 * k] else 'behind')] += 1
print(f.split('/')[-1], 'runs reaching', D, n, '| mean downfield per run:', {g: round(v / n, 2) for g, v in cnt.items()})
print('  DBs per run by handoff width and fate:', {('%s/%s' % k): round(v / n, 2) for k, v in sorted(dbs.items())})
