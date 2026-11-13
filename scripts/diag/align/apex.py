#!/usr/bin/env python3
"""Apex vs over on a detached #2 (slot 3.5-8 yd outside his tackle), one operator for the snap extracts. Over: a
defender within 1.5 yd of #2 laterally, under 8 deep. Apex: none over, and a defender 2.5-8 deep between #2 and the
tackle (at least 1.5 yd inside #2 and outside the tackle). Splits by coverage (pff_passCoverage), #2's split and down.
usage: apex.py FILE.csv.gz [...]"""
import csv, gzip, sys, collections
OL = {'T', 'G', 'C'}
def plays(path):
    cur, key = [], None
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            k = (r['gameId'], r['playId'])
            if k != key and cur: yield cur; cur = []
            key = k; cur.append(r)
    if cur: yield cur
def fam(c):
    c = (c or '').lower().replace('-', '').replace(' ', '')
    return 'two-high' if any(t in c for t in ('cover2', 'quarters', 'cover4', 'cover6', 'tampa', '2man')) else 'one-high' if any(t in c for t in ('cover1', 'cover3')) else 'zero' if 'cover0' in c else 'other'
for path in sys.argv[1:]:
    R = collections.defaultdict(collections.Counter)
    for P in plays(path):
        O = [r for r in P if r['side'] == 'O']; D = [r for r in P if r['side'] == 'D']
        ol = sorted(float(r['y']) for r in O if r['position'] in OL)
        if len(ol) != 5: continue
        by = float(P[0]['ball_y']); dn, tg = int(P[0]['down']), int(P[0]['yardsToGo'])
        for sgn in (1, -1):
            tk = ol[4] if sgn > 0 else ol[0]
            recs = [r for r in O if r['position'] not in OL | {'QB'} and (float(r['y']) - tk) * sgn > 0.5 and (abs(float(r['x'])) < 2.5 or abs(float(r['y']) - by) > 3.5)]
            recs.sort(key=lambda r: -(float(r['y']) - by) * sgn)
            if len(recs) < 2: continue
            ty = float(recs[1]['y']); w = (ty - tk) * sgn
            if not 3.5 <= w < 8: continue
            over = any(abs(float(d['y']) - ty) <= 1.5 and 0 <= float(d['x']) < 8 for d in D)
            apex = not over and any(2.5 <= float(d['x']) < 8 and 1.5 <= (ty - float(d['y'])) * sgn and (float(d['y']) - tk) * sgn > 0 for d in D)
            k = 'over' if over else 'apex' if apex else 'none'
            sit = 'early' if dn <= 2 else '3rd short' if tg < 4 else '3rd long'
            for key in (('all',), ('cov', fam(P[0]['pff_passCoverage'])), ('split', '3.5-5' if w < 5 else '5-6.5' if w < 6.5 else '6.5-8'), ('sit', sit)):
                R[key][k] += 1
    print('==', path.split('/')[-1])
    for key in sorted(R):
        c = R[key]; n = sum(c.values())
        if n >= 40: print(f"  {'/'.join(key):22} n {n:5}  over {100*c['over']/n:3.0f}%  apex {100*c['apex']/n:3.0f}%  none {100*c['none']/n:3.0f}%")
