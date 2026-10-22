"""Box linebackers' fit tempo on runs: off-ball defenders (2.5-8 yd deep at
the snap, within the tackle box + 2 yd) - their depth past the ball and
downhill speed (toward the line) at fixed times after the snap, and the
depth where the carrier meets first contact. NFL tracking and sim exports,
one code path. --uc / --gun as in backpace.py.
Play side for the scrape: the carrier's lateral move from the snap to the handoff.
usage: lbfit.py FILE [--concept NAME] [--uc|--gun]"""
import gzip, json, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
UC, GUN = '--uc' in args, '--gun' in args
ALIAS = {'outsideZone': 'oz', 'wideZone': 'wz', 'insideZone': 'iz'}
T = (1.0, 1.5, 2.0, 2.5)
for path in [a for a in args if a.endswith('.gz')]:
    st = {}
    add = lambda k, v: st.setdefault(k, []).append(v)
    n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('common', raw)
        if c.get('kind') != 'run': continue
        con = raw.get('concept') or (c.get('cell') or {}).get('concept'); con = ALIAS.get(con, con)
        if CON and con != CON: continue
        xy, P, dt, ev = c['xy'], c['players'], c['dt'], c.get('events') or {}
        pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else None
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and pos(i, 0)], key=lambda i: pos(i, 0)[1])
        if len(ol) != 5: continue
        los, by = pos(ol[2], 0)[0] + .3, pos(ol[2], 0)[1]
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and pos(i, 0)]
        if (UC or GUN) and (not qb or (los - pos(qb[0], 0)[0] > 2.5) != GUN): continue
        half = max(abs(pos(ol[0], 0)[1] - by), abs(pos(ol[4], 0)[1] - by)) + 2
        lb = [i for i, p in enumerate(P) if p['side'] == 'D' and pos(i, 0) and 2.5 <= pos(i, 0)[0] - los <= 8 and abs(pos(i, 0)[1] - by) < half]
        car, h = c.get('carrier'), (c.get('events') or {}).get('handoff')
        ps = 0
        if car is not None and h is not None and pos(car, 0) and pos(car, int(round(h / dt))):
            ps = 1 if pos(car, int(round(h / dt)))[1] - pos(car, 0)[1] > 0 else -1
        n += 1
        add('box backers', len(lb))
        for i in lb:
            add('depth at snap', pos(i, 0)[0] - los)
            for t in T:
                k = int(round(t / dt)); a, b = pos(i, k - 1), pos(i, k + 1)
                if pos(i, k): add(f'depth {t}s', pos(i, k)[0] - los)
                if a and b: add(f'downhill {t}s', -(b[0] - a[0]) / (2 * dt))
                if a and b and ps: add(f'play-side scrape {t}s', ps * (b[1] - a[1]) / (2 * dt))
        fc, car = ev.get('first_contact'), c.get('carrier')
        if fc and car is not None and pos(car, int(round(fc / dt))):
            add('first contact x past ball', pos(car, int(round(fc / dt)))[0] - los); add('first contact s', fc)
    print(f"== {path.split('/')[-1]} {CON or 'all'}{' uc' if UC else ' gun' if GUN else ''} runs {n}")
    for k, v in st.items(): print(f"  {k:28s} {q(v):+.2f} [{q(v, .25):+.2f}, {q(v, .75):+.2f}]")
