"""Defensive backs on runs, one operator for NFL and sim common plays: depth past
the line (x, attack +x) of the deepest and second-deepest DB at the snap,
handoff, handoff+0.5/1.0 s; their speed toward the line; and when the runner
first reaches 5 yd, how far ahead of him each of them is.
usage: dbdepth.py FILE [--concept NAME] [--uc]"""
import gzip, json, sys, statistics as st
f = sys.argv[1]; args = sys.argv[2:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
UC = '--uc' in args
rows = {k: [] for k in ('snap1', 'snap2', 'h1', 'h2', 'h+.5_1', 'h+1_1', 'h+1_2', 'v1_h+.5', 'ahead5_1', 'ahead5_2', 'n')}
groups = set()
for l in gzip.open(f, 'rt'):
    c = json.loads(l); c = c.get('common', c)
    if c.get('kind') != 'run' or c.get('carrier') is None: continue
    if CON and (c.get('cell') or {}).get('concept') != CON: continue
    P = c['players']; xy, dt, k = c['xy'], c['dt'], c['carrier']
    for p in P: groups.add(p.get('group'))
    qb = next((i for i, p in enumerate(P) if p.get('group') == 'QB'), None)
    if UC and (qb is None or xy[0][2 * qb] < -2): continue
    db = [i for i, p in enumerate(P) if p.get('side') == 'D' and p.get('group') in ('DB', 'CB', 'S', 'SAF', 'FS', 'SS')]
    if len(db) < 2: continue
    h = (c.get('events') or {}).get('handoff') or 1.0
    fr = lambda t: xy[min(len(xy) - 1, max(0, round(t / dt)))]
    def deep(t):
        F = fr(t); return sorted((F[2 * i] for i in db), reverse=True)
    s = deep(0); rows['snap1'].append(s[0]); rows['snap2'].append(s[1])
    s = deep(h); rows['h1'].append(s[0]); rows['h2'].append(s[1])
    rows['h+.5_1'].append(deep(h + .5)[0])
    s = deep(h + 1); rows['h+1_1'].append(s[0]); rows['h+1_2'].append(s[1])
    a, b = deep(h + .3)[0], deep(h + .7)[0]; rows['v1_h+.5'].append((b - a) / .4)
    i5 = next((i for i, F in enumerate(xy) if F[2 * k] >= 5), None)
    if i5 is not None:
        F = xy[i5]; ah = sorted((F[2 * i] - F[2 * k] for i in db), reverse=True)
        rows['ahead5_1'].append(ah[0]); rows['ahead5_2'].append(ah[1])
print(f.split('/')[-1], CON or 'all', 'runs', len(rows['snap1']), '| groups', sorted(g for g in groups if g))
for k, v in rows.items():
    if v: print('  %-10s p25/50/75 %+.2f %+.2f %+.2f  (n %d)' % (k, *st.quantiles(v, n=4), len(v)))
