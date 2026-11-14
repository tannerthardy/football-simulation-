#!/usr/bin/env python3
"""Defender depth over the receivers at the snap, all dropbacks, one operator for the snap extracts (nfl_snapframe.py,
sim_snapframe.ts). For each side with two or more detached receivers (outside the tackle, off the ball or > 3.5 yd from
it), #1 the widest and #2 the next, #2 a slot 3.5-8 yd outside his tackle:
- over #1: the defender nearest #1 laterally within 2.5 yd, 0-15 yd deep; his depth (yd past the line);
- on #2: the defender over him (within 1.5 yd laterally) or else apexed inside him (1.5 yd inside #2 to the tackle),
  0-10 deep; his depth and his distance to #2.
Coverage players only (no DE/DT/NT/EDGE; no defender on the line within 3 yd of a tackle).
Grouped by coverage family (pff_passCoverage, man split into press and off by the corner over #1 within 2 yd), by
down and distance, and by #2's split. Observation only.
usage: slotdepth.py FILE.csv.gz [...]"""
import csv, gzip, sys, collections, math
OL = {'T', 'G', 'C', 'OT', 'OG'}
DL = {'DE', 'DT', 'NT', 'EDGE', 'DL'}
def plays(path):
    cur, key = [], None
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            k = (r['gameId'], r['playId'])
            if k != key and cur: yield cur; cur = []
            key = k; cur.append(r)
    if cur: yield cur
def fam(c, man):
    c = (c or '').lower().replace('-', '').replace(' ', '')
    if man: return 'man'
    if 'cover3' in c: return 'cover3'
    if 'quarters' in c or 'cover4' in c or 'cover6' in c: return 'quarters/6'
    if 'cover2' in c or 'tampa' in c: return 'cover2'
    if 'cover1' in c or 'cover0' in c or '2man' in c: return 'man'
    return 'other'
def q(v):
    v = sorted(v); n = len(v)
    return f"{v[n//4]:4.1f}/{v[n//2]:4.1f}/{v[(3*n)//4]:4.1f} (n {n:5})" if n >= 20 else f"{'-':>15} (n {n:5})"
for path in sys.argv[1:]:
    R = collections.defaultdict(lambda: collections.defaultdict(list))
    for P in plays(path):
        if P[0].get('isDropback', '').upper() not in ('TRUE', '1'): continue
        O = [r for r in P if r['side'] == 'O']
        ol = sorted(float(r['y']) for r in O if r['position'] in OL)
        # Coverage players only: no down linemen, no edge set on the line beside the tackle.
        D = [r for r in P if r['side'] == 'D' and r['position'] not in DL and not (float(r['x']) < 1.5 and len(ol) == 5
             and min(abs(float(r['y']) - ol[0]), abs(float(r['y']) - ol[4])) < 3)]
        ol = sorted(float(r['y']) for r in O if r['position'] in OL)
        if len(ol) != 5: continue
        by = float(P[0]['ball_y']); dn, tg = int(float(P[0]['down'])), float(P[0]['yardsToGo'])
        manz = (P[0].get('pff_manZone') or '').lower() == 'man'
        for sgn in (1, -1):
            tk = ol[4] if sgn > 0 else ol[0]
            recs = [r for r in O if r['position'] not in OL | {'QB'} and (float(r['y']) - tk) * sgn > 0.5 and (abs(float(r['x'])) < 2.5 or abs(float(r['y']) - by) > 3.5)]
            recs.sort(key=lambda r: -(float(r['y']) - by) * sgn)
            if len(recs) < 2: continue
            y1, y2 = float(recs[0]['y']), float(recs[1]['y']); w = (y2 - tk) * sgn
            if not 3.5 <= w < 8: continue
            o1 = [d for d in D if abs(float(d['y']) - y1) <= 2.5 and 0 <= float(d['x']) < 15]
            if not o1: continue
            d1 = min(o1, key=lambda d: abs(float(d['y']) - y1)); dep1 = float(d1['x'])
            over2 = [d for d in D if abs(float(d['y']) - y2) <= 1.5 and 0 <= float(d['x']) < 10]
            apex2 = [d for d in D if 0 <= float(d['x']) < 10 and (y2 - float(d['y'])) * sgn >= 1.5 and (float(d['y']) - tk) * sgn > 0.5]
            c2 = over2 or apex2
            if not c2: continue
            d2 = min(c2, key=lambda d: math.hypot(float(d['y']) - y2, float(d['x'])))
            dep2 = float(d2['x']); dist2 = math.hypot(float(d2['y']) - y2, float(d2['x']) - float(recs[1]['x']))
            f = fam(P[0].get('pff_passCoverage'), manz)
            if f == 'man': f = 'man press' if dep1 < 2 else 'man off'
            sit = '1st' if dn == 1 else ('2nd/3rd short' if tg <= 3 else '2nd/3rd medium' if tg <= 7 else '2nd/3rd long')
            for key in (('all',), ('cov', f), ('sit', sit), ('split', '3.5-5' if w < 5 else '5-6.5' if w < 6.5 else '6.5-8')):
                R[key]['d1'].append(dep1); R[key]['d2'].append(dep2); R[key]['x2'].append(dist2)
                R[key]['over'].append(1 if over2 else 0)
    print('==', path.split('/')[-1], '  p25/p50/p75 yd')
    for key in sorted(R, key=lambda k: (len(k), k)):
        r = R[key]
        if len(r['d1']) < 20: continue
        print(f"  {'/'.join(key):22} over #1 depth {q(r['d1'])} | on #2 depth {q(r['d2'])} dist {q(r['x2'])} | over (not apex) {100*sum(r['over'])/len(r['over']):3.0f}%")
