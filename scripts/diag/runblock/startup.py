"""Start-up from the snap, one operator for NFL and sim common plays: speed of
box linebackers (2.5-8 yd off the ball, inside the tackles + 2 at the snap)
and of interior offensive linemen at 0.2/0.4/0.6/0.8/1.0 s, runs under centre.
usage: startup.py FILE [--concept NAME] [--shift S]  (NFL: --shift 0.1, the tracked snap frame lags the snap)"""
import gzip, json, sys, math, statistics as st
f = sys.argv[1]; args = sys.argv[2:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
SHIFT = float(args[args.index("--shift") + 1]) if "--shift" in args else 0.0
T = [.2, .4, .6, .8, 1.0]
S = {g: {t: [] for t in T} for g in ('LB', 'OL', 'DL', 'DB')}
n = 0
for l in gzip.open(f, 'rt'):
    c = json.loads(l); c = c.get('common', c)
    if c.get('kind') != 'run': continue
    if CON and (c.get('cell') or {}).get('concept') != CON: continue
    P, xy, dt = c['players'], c['xy'], c['dt']
    qb = next((i for i, p in enumerate(P) if p.get('group') == 'QB'), None)
    if qb is None or xy[0][2 * qb] < -2: continue
    ol = [i for i, p in enumerate(P) if p.get('group') == 'OL']
    if len(ol) < 5: continue
    ys = sorted(xy[0][2 * i + 1] for i in ol); lo, hi = ys[0] - 2, ys[-1] + 2
    lbs = [i for i, p in enumerate(P) if p.get('side') == 'D' and p.get('group') == 'LB' and 2.5 <= xy[0][2 * i] <= 8 and lo <= xy[0][2 * i + 1] <= hi]
    inner = sorted(ol, key=lambda i: xy[0][2 * i + 1])[1:4]
    dl = [i for i, p in enumerate(P) if p.get('side') == 'D' and p.get('group') == 'DL' and xy[0][2 * i] < 2.5]
    db = [i for i, p in enumerate(P) if p.get('side') == 'D' and p.get('group') == 'DB']
    n += 1
    for g, ids in (('LB', lbs), ('OL', inner), ('DL', dl), ('DB', db)):
        for t in T:
            a, b = round((t - SHIFT - .1) / dt), round((t - SHIFT + .1) / dt)
            if a < 0: continue
            if b >= len(xy): continue
            for i in ids:
                S[g][t].append(math.hypot(xy[b][2 * i] - xy[a][2 * i], xy[b][2 * i + 1] - xy[a][2 * i + 1]) / (2 * .1 if dt == .1 else (b - a) * dt))
print(f.split('/')[-1], CON or 'all', 'runs', n)
for g in S:
    print('  %s speed p50 at %s: %s' % (g, '/'.join(str(t) for t in T), ' '.join('%.2f' % st.median(S[g][t]) if S[g][t] else '-' for t in T)))
