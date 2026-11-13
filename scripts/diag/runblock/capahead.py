"""The deepest DB at the handoff, as the runner first reaches 0/3/5/8/10 yd
past the line: how far ahead of the runner he is (x), lateral gap |dy|, and
his speed toward the line (+ = coming down). NFL and sim common plays alike.
usage: capahead.py FILE [--concept NAME] [--uc]"""
import gzip, json, sys, statistics as st
f = sys.argv[1]; args = sys.argv[2:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
UC = '--uc' in args
M = [0, 3, 5, 8, 10]
R = {m: {'ahead': [], 'dy': [], 'down': []} for m in M}
for l in gzip.open(f, 'rt'):
    c = json.loads(l); c = c.get('common', c)
    if c.get('kind') != 'run' or c.get('carrier') is None: continue
    if CON and (c.get('cell') or {}).get('concept') != CON: continue
    P = c['players']; xy, dt, k = c['xy'], c['dt'], c['carrier']
    qb = next((i for i, p in enumerate(P) if p.get('group') == 'QB'), None)
    if UC and (qb is None or xy[0][2 * qb] < -2): continue
    db = [i for i, p in enumerate(P) if p.get('side') == 'D' and p.get('group') == 'DB']
    if not db: continue
    h = (c.get('events') or {}).get('handoff') or 1.0
    ih = min(len(xy) - 1, round(h / dt))
    s = max(db, key=lambda i: xy[ih][2 * i])
    for m in M:
        i = next((j for j, F in enumerate(xy) if j >= ih and F[2 * k] >= m), None)
        if i is None or i < 2: continue
        F = xy[i]
        R[m]['ahead'].append(F[2 * s] - F[2 * k]); R[m]['dy'].append(abs(F[2 * s + 1] - F[2 * k + 1]))
        R[m]['down'].append((xy[i - 2][2 * s] - F[2 * s]) / (2 * dt))
print(f.split('/')[-1], CON or 'all')
for m in M:
    r = R[m]
    if r['ahead']: print('  runner at %2d yd (n %4d): cap ahead %+.2f  |dy| %.2f  coming down %+.2f yd/s' % (m, len(r['ahead']), st.median(r['ahead']), st.median(r['dy']), st.median(r['down'])))
