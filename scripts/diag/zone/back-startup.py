"""The ball carrier's start-up on runs: his speed at fixed times after the
snap (central difference on the 0.1 s grid), NFL tracking vs sim, one code
path. The tracked snap frame lags the snap by about 0.1 s, so --shift 0.1
reads NFL frames that much earlier for the same time from the real snap.
usage: back-startup.py FILE [--concept NAME] [--uc] [--shift S]"""
import gzip, json, math, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
SHIFT = float(args[args.index('--shift') + 1]) if '--shift' in args else 0.0
UC = '--uc' in args
ALIAS = {'outsideZone': 'oz', 'wideZone': 'wz', 'insideZone': 'iz'}
T = (0.2, 0.4, 0.6, 0.8, 1.0, 1.2)
for path in [a for a in args if a.endswith('.gz')]:
    sp = {t: [] for t in T}; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('common', raw)
        if c.get('kind') != 'run': continue
        con = raw.get('concept') or (c.get('cell') or {}).get('concept'); con = ALIAS.get(con, con)
        if CON and con != CON: continue
        xy, P, dt, car = c['xy'], c['players'], c['dt'], c.get('carrier')
        if car is None or P[car]['group'] != 'RB': continue
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB']
        ol = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and xy[0][2 * i] is not None]
        if UC and (not qb or len(ol) != 5 or max(xy[0][2 * i] for i in ol) + .3 - xy[0][2 * qb[0]] > 2.5): continue
        n += 1
        for t in T:
            k = (t - SHIFT) / dt; k0 = int(math.floor(k)); w = k - k0
            def at(j):
                return (xy[j][2 * car], xy[j][2 * car + 1]) if 0 <= j < len(xy) and xy[j][2 * car] is not None else None
            a, b, c2, d = at(k0 - 1), at(k0 + 1), at(k0), at(k0 + 2)
            if not (a and b and c2 and d): continue
            v0 = math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * dt); v1 = math.hypot(d[0] - c2[0], d[1] - c2[1]) / (2 * dt)
            sp[t].append(v0 + w * (v1 - v0))
    print(f"== {path.split('/')[-1]} {CON or 'all'}{' uc' if UC else ''} shift {SHIFT} n {n}")
    print('  speed after the snap p25/50/75: ' + ' | '.join(f"{t:.1f}s {q(sp[t], .25):.2f}/{q(sp[t]):.2f}/{q(sp[t], .75):.2f}" for t in T))
