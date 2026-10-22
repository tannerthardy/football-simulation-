"""Run outcomes by concept, NFL tracking and sim exports alike: share of runs
whose carrier reaches 0/3/5 yd past the line, and where (x past the ball)
and when (s after the handoff) the first contact comes. Separates "the
back gets there untouched" from "he gets there through contact".
usage: reach-contact.py FILE [FILE ...] [--uc] [--concepts A,B]"""
import gzip, json, sys
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
args = sys.argv[1:]; UC = '--uc' in args
CONS = args[args.index('--concepts') + 1].split(',') if '--concepts' in args else None
ALIAS = {'POWER': 'power', 'COUNTER': 'counter', 'MAN': 'duo', 'TRAP': 'trap', 'INSIDE ZONE': 'iz', 'OUTSIDE ZONE': 'oz',
         'insideZone': 'iz', 'outsideZone': 'oz', 'wideZone': 'wz'}
for path in [a for a in args if a.endswith('.gz')]:
    by = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('common', raw)
        if c.get('kind') != 'run' or c.get('carrier') is None: continue
        con = raw.get('concept') or (c.get('cell') or {}).get('concept'); con = ALIAS.get(con, con)
        if CONS and con not in CONS: continue
        xy, P, dt, car, ev = c['xy'], c['players'], c['dt'], c['carrier'], c.get('events') or {}
        ol = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and xy[0][2 * i] is not None]
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and xy[0][2 * i] is not None]
        if len(ol) != 5: continue
        los = max(xy[0][2 * i] for i in ol) + .3
        if UC and (not qb or los - xy[0][2 * qb[0]] > 2.5): continue
        xs = [row[2 * car] - los for row in xy if row and row[2 * car] is not None]
        if not xs: continue
        b = by.setdefault(con, {'n': 0, 'r0': 0, 'r3': 0, 'r5': 0, 'cx': [], 'ct': [], 'who': {}, 'dl': []})
        # As he crosses the line: the nearest line defender (DL group).
        kc = next((k for k, row in enumerate(xy) if row and row[2 * car] is not None and row[2 * car] - los >= 0), None)
        if kc is not None:
            ds = [((xy[kc][2 * i] - xy[kc][2 * car]) ** 2 + (xy[kc][2 * i + 1] - xy[kc][2 * car + 1]) ** 2) ** .5
                  for i, p in enumerate(P) if p['side'] == 'D' and p['group'] == 'DL' and xy[kc][2 * i] is not None]
            if ds: b['dl'].append(min(ds))
        b['n'] += 1; m = max(xs); b['r0'] += m >= 0; b['r3'] += m >= 3; b['r5'] += m >= 5
        fc, h = ev.get('first_contact'), ev.get('handoff')
        if fc is not None:
            k = min(len(xy) - 1, int(round(fc / dt)))
            if xy[k][2 * car] is not None:
                b['cx'].append(xy[k][2 * car] - los)
                cx, cy = xy[k][2 * car], xy[k][2 * car + 1]
                ds = [(abs(xy[k][2 * i] - cx) + abs(xy[k][2 * i + 1] - cy), p['group']) for i, p in enumerate(P)
                      if p['side'] == 'D' and xy[k][2 * i] is not None]
                if ds: g = min(ds)[1]; b['who'][g] = b['who'].get(g, 0) + 1
            if h is not None: b['ct'].append(fc - h)
    print(f"== {path.split('/')[-1]}{' uc' if UC else ''}")
    for con, b in sorted(by.items()):
        n = b['n']
        print(f"  {con:8s} n {n:5d} | reach 0/3/5 yd {100*b['r0']/n:4.0f}/{100*b['r3']/n:4.0f}/{100*b['r5']/n:4.0f}% | first contact x p25/50/75 {q(b['cx'],.25):+.2f}/{q(b['cx']):+.2f}/{q(b['cx'],.75):+.2f} | after handoff {q(b['ct']):.2f} s | nearest DL at the line p25/50 {q(b['dl'],.25):.2f}/{q(b['dl']):.2f} | by " + ' '.join(f"{g} {100*v/max(1,len(b['cx'])):.0f}%" for g, v in sorted(b['who'].items())))
