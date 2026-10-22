"""The crease an inside run goes through, NFL tracking and sim exports
alike. At the frame the carrier first reaches the line: the defensive
linemen (DL group, < 2 yd off the ball at the snap) nearest him on each
side, the lateral width between them (the crease framed by defenders), how
far each moved laterally since the snap (+ = away from the carrier, opening
it) and how far the crossing point is from the nearest DL's snap position
(was the crease already there at the snap?).
usage: crease.py FILE [FILE ...] [--uc] [--concepts duo,iz,...]"""
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
        xy, P, car = c['xy'], c['players'], c['carrier']
        ol = [i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and xy[0][2 * i] is not None]
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and xy[0][2 * i] is not None]
        if len(ol) != 5: continue
        los = max(xy[0][2 * i] for i in ol) + .3
        if UC and (not qb or los - xy[0][2 * qb[0]] > 2.5): continue
        kc = next((k for k, row in enumerate(xy) if row and row[2 * car] is not None and row[2 * car] - los >= 0), None)
        if kc is None: continue
        cy = xy[kc][2 * car + 1]
        dl = [i for i, p in enumerate(P) if p['side'] == 'D' and p['group'] == 'DL' and xy[0][2 * i] is not None
              and xy[0][2 * i] - los < 2 and xy[kc][2 * i] is not None]
        left = [i for i in dl if xy[kc][2 * i + 1] < cy]; right = [i for i in dl if xy[kc][2 * i + 1] >= cy]
        b = by.setdefault(con, {'w': [], 'move': [], 'snap': [], 'n': 0})
        b['n'] += 1
        if left and right:
            l = max(left, key=lambda i: xy[kc][2 * i + 1]); r = min(right, key=lambda i: xy[kc][2 * i + 1])
            b['w'].append(xy[kc][2 * r + 1] - xy[kc][2 * l + 1])
            b['move'].append(-(xy[kc][2 * l + 1] - xy[0][2 * l + 1]))
            b['move'].append(xy[kc][2 * r + 1] - xy[0][2 * r + 1])
        if dl: b['snap'].append(min(abs(xy[0][2 * i + 1] - cy) for i in dl))
    print(f"== {path.split('/')[-1]}{' uc' if UC else ''}")
    for con, b in sorted(by.items()):
        print(f"  {con:8s} n {b['n']:5d} | crease between DL p25/50/75 {q(b['w'],.25):.2f}/{q(b['w']):.2f}/{q(b['w'],.75):.2f} | "
              f"DL lateral move away p50 {q(b['move']):+.2f} | crossing to nearest DL snap spot p50 {q(b['snap']):.2f}")
