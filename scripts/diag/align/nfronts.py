#!/usr/bin/env python3
"""Front families at the snap, one operator for the 2022 snap extract and sim_snapframe.ts output (observation only).
On the line = within 2 yd of the ball and inside the tackle + 3.5 yd. Line units: 0 ball, 1 guard, 2 tackle (body lateral
over the line's own splits); interior = inside 2.3 units. Linemen (DE/DT/NT) and non-linemen (LB/DB) are kept apart, so
a mugged backer is a mug, not a lineman. Families by the interior linemen: over / under (two, a B-gap and an A-gap man,
3-tech to the strength / away), even (two, both B or both A), tite-mint (nose + two 4i, 1.6-2.3 units), bear (nose + two
3s or guards, 0.8-1.6), okie (nose only inside, both tackles' outside covered on the line), odd (nose only), 2i-0-2i etc.
'other'. Mug = non-linemen on the line inside the guards (< 1.1 units): single / double. 'penny' = five on the line with
three interior linemen and one off-ball backer. Situations: early, 3rd/4th long (4+), 3rd/4th short, short yardage (<=2
yd any down). usage: nfronts.py FILE.csv.gz [...]"""
import csv, gzip, sys, collections
OL = {'T', 'G', 'C'}; DLP = {'DE', 'DT', 'NT'}; DBP = {'CB', 'SS', 'FS', 'DB', 'S'}
def plays(path):
    cur, key = [], None
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            k = (r['gameId'], r['playId'])
            if k != key and cur: yield cur; cur = []
            key = k; cur.append(r)
    if cur: yield cur
for path in sys.argv[1:]:
    R = collections.defaultdict(collections.Counter)
    for P in plays(path):
        O = [r for r in P if r['side'] == 'O']; D = [r for r in P if r['side'] == 'D']
        ol = sorted(O, key=lambda r: float(r['y'])); ol = [r for r in ol if r['position'] in OL]
        if len(ol) != 5: continue
        by = float(P[0]['ball_y']); ys = [float(r['y']) - by for r in ol]
        g = {1: abs(ys[3]), -1: abs(ys[1])}; t = {1: abs(ys[4]), -1: abs(ys[0])}
        def units(y):
            k = 1 if y > 0 else -1; a = abs(y)
            return k * (a / g[k] if a <= g[k] else 1 + (a - g[k]) / max(t[k] - g[k], .3))
        dbs = sum(r['position'] in DBP for r in D); pkg = 'base' if dbs <= 4 else 'nickel' if dbs == 5 else 'dime'
        opos = collections.Counter(r['position'] for r in O); heavy = opos['TE'] + opos['FB'] + opos['RB'] >= 3
        d, tg = int(P[0]['down']), int(P[0]['yardsToGo'])
        sit = 'short yardage' if tg <= 2 else 'early' if d <= 2 else '3rd long' if tg >= 4 else '3rd short'
        line = [r for r in D if 0 <= float(r['x']) < 2 and abs(float(r['y']) - by) <= t[1 if float(r['y']) > by else -1] + 3.5]
        dl = sorted(units(float(r['y']) - by) for r in line if r['position'] in DLP)
        inner = sorted((u for u in dl if abs(u) < 2.3), key=abs)
        mugs = [r for r in line if r['position'] not in DLP and abs(units(float(r['y']) - by)) < 1.1]
        offball = [r for r in D if 2.5 <= float(r['x']) <= 8 and abs(float(r['y']) - by) <= t[1 if float(r['y']) > by else -1] + 2]
        if len(inner) == 3 and abs(inner[0]) < .5 and inner[1] * inner[2] < 0:
            w = min(abs(inner[1]), abs(inner[2])); fam = 'tite-mint' if w >= 1.6 else 'bear' if w >= .8 else 'odd-tight'
        elif len(inner) == 1 and abs(inner[0]) < .5:
            outs = [u for u in dl if 2.3 <= abs(u) < 3.2]
            fam = 'okie' if any(u > 0 for u in outs) and any(u < 0 for u in outs) else 'odd'
        elif len(inner) == 2:
            a, b = inner
            if abs(b) < 1.1 or abs(a) >= 1.1: fam = 'even'
            elif a * b < 0 or abs(a) < .25: fam = 'over/under'
            else: fam = 'other'
        elif len(inner) >= 4: fam = 'heavy'
        elif len(inner) == 0: fam = 'no interior DL'
        else: fam = 'other'
        mug = 'double mug' if len(mugs) >= 2 else 'mug' if mugs else ''
        penny = len(line) == 5 and len(inner) == 3 and len(offball) == 1
        k = (pkg + (' heavy-off' if heavy else ''), sit)
        R[k]['n'] += 1; R[k][fam] += 1
        if mug: R[k][mug] += 1
        if penny: R[k]['penny(5-1)'] += 1
        R[k][f'line{len(line)}'] += 1
    print('==', path.split('/')[-1])
    for k in sorted(R):
        c = R[k]; n = c['n']
        if n < 40: continue
        fams = ' '.join(f"{f} {100*c[f]/n:.0f}%" for f in ('over/under', 'even', 'tite-mint', 'bear', 'okie', 'odd', 'odd-tight', 'heavy', 'no interior DL', 'other') if c[f] and 100*c[f]/n >= 1)
        print(f"  {k[0]:16} {k[1]:13} n {n:5} | {fams} | mug {100*c['mug']/n:.0f}% double {100*c['double mug']/n:.0f}% | penny {100*c['penny(5-1)']/n:.0f}%")
