"""How far line defenders are moved on runs, single- vs double-blocked: for
each defender on the ball at the snap (< 2 yd deep), the offensive linemen
or inline ends within 1.2 yd of him at 0.8 s after the snap (one = single,
two or more = double) and his displacement toward his own end zone from
the snap to 1.5 s and 2.5 s (+ = driven back). NFL tracking and sim
exports, one code path.
usage: dlwash.py FILE [--concept NAME] [--uc|--gun]"""
import gzip, json, math, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
UC, GUN = '--uc' in args, '--gun' in args
ALIAS = {'outsideZone': 'oz', 'wideZone': 'wz', 'insideZone': 'iz'}
for path in [a for a in args if a.endswith('.gz')]:
    st = {}
    add = lambda k, v: st.setdefault(k, []).append(v)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('common', raw)
        if c.get('kind') != 'run': continue
        con = raw.get('concept') or (c.get('cell') or {}).get('concept'); con = ALIAS.get(con, con)
        if CON and con != CON: continue
        xy, P, dt = c['xy'], c['players'], c['dt']
        pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else None
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and pos(i, 0)], key=lambda i: pos(i, 0)[1])
        if len(ol) != 5: continue
        los = pos(ol[2], 0)[0] + .3
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and pos(i, 0)]
        if (UC or GUN) and (not qb or (los - pos(qb[0], 0)[0] > 2.5) != GUN): continue
        blockers = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] in ('OL', 'TE') and pos(i, 0) and los - pos(i, 0)[0] < 2.5]
        k8, k15, k25 = int(round(.8 / dt)), int(round(1.5 / dt)), int(round(2.5 / dt))
        for i, p in enumerate(P):
            if p['side'] != 'D' or not pos(i, 0) or pos(i, 0)[0] - los >= 2: continue
            at = pos(i, k8)
            if not at: continue
            n = sum(1 for b in blockers if pos(b, k8) and math.hypot(pos(b, k8)[0] - at[0], pos(b, k8)[1] - at[1]) < 1.2)
            kind = 'double' if n >= 2 else 'single' if n == 1 else 'free'
            add(f'{kind} share', 1)
            for k, name in ((k15, '1.5s'), (k25, '2.5s')):
                if pos(i, k): add(f'{kind} driven back {name}', pos(i, k)[0] - pos(i, 0)[0])
    tot = sum(len(v) for k, v in st.items() if k.endswith('share'))
    print(f"== {path.split('/')[-1]} {CON or 'all'}{' uc' if UC else ' gun' if GUN else ''} defenders {tot}")
    for k in sorted(st):
        v = st[k]
        if k.endswith('share'): print(f"  {k:24s} {100 * len(v) / tot:5.1f}%")
        else: print(f"  {k:24s} {q(v):+.2f} [{q(v, .25):+.2f}, {q(v, .75):+.2f}]")
