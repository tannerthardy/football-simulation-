#!/usr/bin/env python3
"""Who lines up over #2 at the snap, and how: one operator for the 2022 snap extract and sim_snapframe.ts output.
Receivers per side = non-OL, non-QB offensive players under 2.5 yd deep outside the tackles (plus deeper ones outside
3.5 yd of the ball), ordered outside-in; #2 = second from the sideline. #2 class: tight (inside 3.5 yd of his tackle),
slot (3.5-8 yd), wide (8+). The defender over him = nearest defender laterally within 1.5 yd, under 10 yd deep.
Reports: that defender's group (DB / LB), depth p25/50/75, press share (< 2 yd), on-the-line share (< 1.6 yd),
leverage (+ outside, yd) p50; and the share with no one over (apex or none).
usage: overtwo.py FILE.csv.gz [...]"""
import csv, gzip, sys, collections, statistics as st
DB = {'CB', 'SS', 'FS', 'DB', 'S'}; OL = {'T', 'G', 'C'}
def plays(path):
    cur, key = [], None
    with gzip.open(path, 'rt', newline='') as f:
        for r in csv.DictReader(f):
            k = (r['gameId'], r['playId'])
            if k != key and cur: yield cur; cur = []
            key = k; cur.append(r)
    if cur: yield cur
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))]
for path in sys.argv[1:]:
    R = collections.defaultdict(list); N = collections.Counter()
    for P in plays(path):
        O = [r for r in P if r['side'] == 'O']; D = [r for r in P if r['side'] == 'D']
        ol = sorted(float(r['y']) for r in O if r['position'] in OL)
        if len(ol) != 5: continue
        by = float(P[0]['ball_y'])
        for sgn in (1, -1):
            tackle = ol[4] if sgn > 0 else ol[0]
            recs = [r for r in O if r['position'] not in OL | {'QB'} and (float(r['y']) - tackle) * sgn > 0.5
                    and (abs(float(r['x'])) < 2.5 or abs(float(r['y']) - by) > 3.5)]
            recs.sort(key=lambda r: -(float(r['y']) - by) * sgn)
            if len(recs) < 2: continue
            two = recs[1]; ty = float(two['y']); w = (ty - tackle) * sgn
            cls = 'tight' if w < 3.5 else 'slot' if w < 8 else 'wide'
            cand = [d for d in D if abs(float(d['y']) - ty) <= 1.5 and 0 <= float(d['x']) < 10]
            N[cls] += 1
            if not cand: R[(cls, 'none')].append(1); continue
            d = min(cand, key=lambda d: abs(float(d['y']) - ty)); x = float(d['x'])
            g = 'DB' if d['position'] in DB else 'LB' if 'LB' in d['position'] else 'DL'
            R[(cls, g)].append((x, (float(d['y']) - ty) * sgn)); R[(cls, g, P[0]['pff_manZone'])].append((x, (float(d['y']) - ty) * sgn))
    print('==', path.split('/')[-1])
    for cls in ('tight', 'slot', 'wide'):
        n = N[cls]
        if not n: continue
        parts = [f"#2 {cls:5} n {n:5} none {100*len(R[(cls,'none')])/n:3.0f}%"]
        for g in ('DB', 'LB', 'DL'):
            v = R[(cls, g)]
            if not v: continue
            x = [a for a, _ in v]
            parts.append(f"{g} {100*len(v)/n:3.0f}%: depth {q(x,.25):.1f}/{q(x,.5):.1f}/{q(x,.75):.1f} press {100*sum(a<2 for a in x)/len(v):.0f}% line {100*sum(a<1.6 for a in x)/len(v):.0f}% lev {st.median(b for _, b in v):+.1f}")
        print('  ' + ' | '.join(parts))
        for mz in ('Man', 'Zone'):
            v = R[(cls, 'DB', mz)]
            if len(v) > 20: x = [a for a, _ in v]; print(f"      DB {mz:4} n {len(v):5} depth {q(x,.25):.1f}/{q(x,.5):.1f}/{q(x,.75):.1f} press {100*sum(a<2 for a in x)/len(v):.0f}% lev p25/50/75 {q([b for _,b in v],.25):+.1f}/{st.median(b for _, b in v):+.1f}/{q([b for _,b in v],.75):+.1f}")
