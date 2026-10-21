"""Where the back is, relative to his play-side tackle, from the handoff
through the first second of a run (NFL tracking and sim exports, one code
path). Does the back's track follow the line that is there, or a fixed
distance from the ball? Play side = the back's lateral move from snap to
handoff. Offsets are + outside the tackle's snap position (yards).

usage: meshwidth.py FILE [FILE ...] [--concept 'OUTSIDE ZONE'|oz|...] [--uc]"""
import gzip, json, sys
from collections import defaultdict
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]
CON = args[args.index('--concept') + 1] if '--concept' in args else None
UC = '--uc' in args
files = [a for a in args if a.endswith('.gz')]
for path in files:
    st = defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('common', raw)
        if c.get('kind') != 'run': continue
        con = raw.get('concept') or (c.get('cell') or {}).get('concept')
        con = {'outsideZone': 'oz', 'wideZone': 'wz', 'insideZone': 'iz'}.get(con, con)
        if CON and con != CON: continue
        xy, P, dt, car = c['xy'], c['players'], c['dt'], c.get('carrier')
        h = (c.get('events') or {}).get('handoff')
        if car is None or h is None: continue
        pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if k < len(xy) and xy[k][2 * i] is not None else None
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and pos(i, 0)], key=lambda i: pos(i, 0)[1])
        if len(ol) != 5: continue
        los, by = pos(ol[2], 0)[0] + .3, pos(ol[2], 0)[1]
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and pos(i, 0)]
        if not qb or (UC and los - pos(qb[0], 0)[0] > 2.5): continue
        kh = int(round(h / dt))
        if not pos(car, kh) or not pos(car, 0): continue
        ps = 1 if pos(car, kh)[1] - pos(car, 0)[1] > 0 else -1
        ty = (pos(ol[4] if ps > 0 else ol[0], 0)[1] - by) * ps
        st['tackle from ball'].append(ty)
        for t in (0, .3, .6, 1.0):
            p = pos(car, kh + int(round(t / dt)))
            if p: st[f'back-T +{t}s'].append((p[1] - by) * ps - ty)
        # Play-side interior DL (guard to just outside the tackle, on the
        # ball): lateral (+ toward the play) and depth past the ball.
        G = (pos(ol[3] if ps > 0 else ol[1], 0)[1] - by) * ps
        for i, pl in enumerate(P):
            s0 = pos(i, 0)
            if pl['side'] != 'D' or not s0 or s0[0] - los > 2.0: continue
            y0 = (s0[1] - by) * ps
            if not G - .2 < y0 < ty + 1.0: continue
            for t in (.3, .6, 1.0):
                p = pos(i, kh + int(round(t / dt)))
                if p: st[f'DL lat +{t}s'].append((p[1] - by) * ps - y0); st[f'DL vs back +{t}s'].append(((p[1] - by) * ps) - (((pos(car, kh + int(round(t / dt))) or p)[1] - by) * ps))
            st['DL from T at snap'].append(y0 - ty)
        for nm, i in (('PSG', ol[3] if ps > 0 else ol[1]), ('PST', ol[4] if ps > 0 else ol[0])):
            for t in (.3, 1.0):
                p = pos(i, kh + int(round(t / dt)))
                if p: st[f'{nm} lat +{t}s'].append((p[1] - pos(i, 0)[1]) * ps)
        st['back depth at handoff'].append(los - pos(car, kh)[0])
        st['handoff s'].append(h)
    n = len(st['handoff s'])
    print(f"== {path.split('/')[-1]} {CON or 'all'}{' uc' if UC else ''} n {n}")
    for k, v in st.items(): print(f"  {k:22s} {q(v):+.2f} [{q(v, .25):+.2f}, {q(v, .75):+.2f}]")
