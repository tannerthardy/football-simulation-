"""NFL start acceleration by travel direction relative to the shoulders (BDB2025 'o', 'dir', 'a', 's').
Frames while starting (s < 1.0 yd/s, speed rising over the next 0.1 s), all plays, after the snap.
Angle = |dir - o| folded to 0-180: 0 forward, 90 sideways, 180 backward. p50/p75/p90 of 'a' by group."""
import csv, sys, statistics as st, collections
D = sys.argv[1]; weeks = sys.argv[2:] or ['1']
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
G = {'G': 'OL', 'T': 'OL', 'C': 'OL', 'DT': 'DL', 'NT': 'DL', 'DE': 'DL', 'ILB': 'LB', 'MLB': 'LB', 'OLB': 'LB',
     'CB': 'DB', 'SS': 'DB', 'FS': 'DB', 'DB': 'DB', 'WR': 'WR', 'RB': 'RB', 'FB': 'RB', 'TE': 'TE'}
acc = collections.defaultdict(list)
for w in weeks:
    prev = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        if r['nflId'] in ('', 'NA') or r['frameType'] != 'AFTER_SNAP': continue
        key = (r['gameId'], r['playId'], r['nflId'])
        try: s, a, o, d = float(r['s']), float(r['a']), float(r['o']), float(r['dir'])
        except ValueError: continue
        p = prev.get(key)
        prev[key] = (s, a, o, d)
        if p is None: continue
        ps, pa, po, pd = p
        if ps >= 1.0 or s <= ps: continue   # previous frame was a start and speed rose
        ang = abs((pd - po + 180) % 360 - 180)
        b = 'fwd 0-45' if ang < 45 else 'side 45-135' if ang < 135 else 'back 135-180'
        g = G.get(pos.get(r['nflId']), 'other')
        acc[(g, b)].append(pa); acc[('ALL', b)].append(pa)
q = lambda v, p: sorted(v)[int(p * (len(v) - 1))]
for g in ('ALL', 'OL', 'DL', 'LB', 'DB', 'WR', 'RB', 'TE'):
    line = f"{g:4s}"
    for b in ('fwd 0-45', 'side 45-135', 'back 135-180'):
        v = acc.get((g, b), [])
        line += f" | {b}: n {len(v):6d} p50 {q(v,.5):4.2f} p75 {q(v,.75):4.2f} p90 {q(v,.9):4.2f}" if len(v) > 20 else f" | {b}: n {len(v)}"
    print(line)
