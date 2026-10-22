"""The back's pace into the line: from the handoff until first contact (or
+2.5 s), his minimum speed after +0.3 s, where it happens relative to the
line, and the heading change across it (a cut). NFL tracking and sim exports,
one code path; under-center or shotgun via --uc/--gun.
Also: speed at first contact by where it happens (x past the ball) and by
time since the handoff, so pace and structure can be told apart.
usage: backpace.py FILE [--concept NAME] [--uc|--gun]"""
import gzip, json, math, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
UC, GUN = '--uc' in args, '--gun' in args
ALIAS = {'outsideZone': 'oz', 'wideZone': 'wz', 'insideZone': 'iz'}
for path in [a for a in args if a.endswith('.gz')]:
    st = {k: [] for k in ('min speed', 'min at x past ball', 'min at s after handoff', 'heading change deg', 'speed at contact', 'contact x past ball')}
    cuts = n = 0
    byx = {}; byt = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('common', raw)
        if c.get('kind') != 'run': continue
        con = raw.get('concept') or (c.get('cell') or {}).get('concept'); con = ALIAS.get(con, con)
        if CON and con != CON: continue
        xy, P, dt, car, ev = c['xy'], c['players'], c['dt'], c.get('carrier'), c.get('events') or {}
        h = ev.get('handoff')
        if car is None or h is None: continue
        pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else None
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and pos(i, 0)], key=lambda i: pos(i, 0)[1])
        if len(ol) != 5: continue
        los = pos(ol[2], 0)[0] + .3
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and pos(i, 0)]
        if (UC or GUN) and (not qb or (los - pos(qb[0], 0)[0] > 2.5) != GUN): continue
        kh = int(round(h / dt)); fc = ev.get('first_contact')
        kend = min(len(xy) - 2, int(round(fc / dt)) if fc else kh + int(2.5 / dt))
        sp = {}
        for k in range(kh + int(.3 / dt), kend):
            a, b = pos(car, k - 1), pos(car, k + 1)
            if a and b: sp[k] = (math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * dt), math.atan2(b[1] - a[1], b[0] - a[0]))
        if len(sp) < 3: continue
        n += 1
        km = min(sp, key=lambda k: sp[k][0])
        st['min speed'].append(sp[km][0]); st['min at x past ball'].append(pos(car, km)[0] - los)
        st['min at s after handoff'].append((km - kh) * dt)
        k0, k1 = max(min(sp), km - int(.4 / dt)), min(max(sp), km + int(.4 / dt))
        if k0 in sp and k1 in sp:
            d = abs((sp[k1][1] - sp[k0][1] + math.pi) % (2 * math.pi) - math.pi) * 180 / math.pi
            st['heading change deg'].append(d); cuts += d > 30
        if fc and pos(car, kend):
            k = int(round(fc / dt)); a, b = pos(car, k - 1), pos(car, k + 1)
            if a and b:
                v = math.hypot(b[0] - a[0], b[1] - a[1]) / (2 * dt); x = pos(car, k)[0] - los
                st['speed at contact'].append(v); st['contact x past ball'].append(x)
                byx.setdefault('<0' if x < 0 else '0-2' if x < 2 else '2-5' if x < 5 else '5+', []).append(v)
                ts = (k - kh) * dt
                byt.setdefault('<0.8s' if ts < .8 else '0.8-1.4s' if ts < 1.4 else '1.4s+', []).append(v)
    print(f"== {path.split('/')[-1]} {CON or 'all'}{' uc' if UC else ' gun' if GUN else ''} n {n} | heading change > 30 deg around the slowest point {100 * cuts / max(n, 1):.0f}%")
    for k, v in st.items(): print(f"  {k:24s} {q(v):+.2f} [{q(v, .25):+.2f}, {q(v, .75):+.2f}]")
    print('  speed at contact by x past ball: ' + ' | '.join(f"{k} n {len(byx[k])} {q(byx[k]):.2f}" for k in ('<0', '0-2', '2-5', '5+') if k in byx))
    print('  speed at contact by time after handoff: ' + ' | '.join(f"{k} n {len(byt[k])} {q(byt[k]):.2f}" for k in ('<0.8s', '0.8-1.4s', '1.4s+') if k in byt))
