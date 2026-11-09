"""Under-center / gun: QB and RB paths for runs (by concept) vs play-action passes, raw BDB 2025 week."""
import csv, sys, math, statistics as st, collections
D, W = sys.argv[1], sys.argv[2]
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv'))}
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
T = collections.defaultdict(lambda: collections.defaultdict(dict)); EV = collections.defaultdict(dict); DIR = {}
for r in csv.DictReader(open(f'{D}/tracking_week_{W}.csv')):
    k = (r['gameId'], r['playId'])
    if r['frameType'] == 'BEFORE_SNAP' and r['event'] != 'ball_snap': continue
    who = 'ball' if r['displayName'] == 'football' else pos.get(r['nflId'])
    if who not in ('ball', 'QB', 'RB'): continue
    T[k][int(r['frameId'])].setdefault(who, []).append((float(r['x']), float(r['y'])))
    DIR[k] = r['playDirection']
    if r['event'] and r['event'] not in EV[k]: EV[k][r['event']] = int(r['frameId'])
R = collections.defaultdict(list)
for k, fr in T.items():
    p = plays.get(k)
    if not p or 'ball_snap' not in EV[k]: continue
    s0 = EV[k]['ball_snap']; f0 = fr.get(s0, {})
    if len(f0.get('QB', [])) != 1 or len(f0.get('RB', [])) != 1 or 'ball' not in f0: continue
    sx = 1 if DIR[k] == 'right' else -1
    b = f0['ball'][0]; q0 = f0['QB'][0]; r0 = f0['RB'][0]
    al = 'under' if math.dist(b, q0) < 2 else 'gun'
    if p['isDropback'] == 'TRUE':
        if p['playAction'] != 'TRUE': continue
        lab = 'PA'
    else:
        lab = 'run ' + (p['pff_runConceptPrimary'] or '?')[:12]
    # play side: the back's lateral direction from the snap to 1.4 s (for PA: the fake's direction)
    f14 = fr.get(s0 + 14, {})
    if 'RB' not in f14 or 'QB' not in f14: continue
    ps = 1 if (f14['RB'][0][1] - r0[1]) >= 0 else -1
    for t in (6, 10, 14):
        f = fr.get(s0 + t, {})
        if 'QB' not in f or 'RB' not in f: continue
        q = f['QB'][0]; rb = f['RB'][0]
        R[(al, lab, t, 'qd')].append(-(q[0] - b[0]) * sx); R[(al, lab, t, 'ql')].append((q[1] - b[1]) * ps)
        R[(al, lab, t, 'rd')].append(-(rb[0] - b[0]) * sx); R[(al, lab, t, 'rl')].append((rb[1] - b[1]) * ps)
        R[(al, lab, t, 'sep')].append(math.dist(q, rb))
    R[(al, lab, 0, 'n')].append(1)
keys = sorted({(a, l) for a, l, t, m in R})
for al, lab in keys:
    n = len(R[(al, lab, 0, 'n')])
    if n < 15: continue
    md = lambda t, m: st.median(R[(al, lab, t, m)]) if R[(al, lab, t, m)] else float('nan')
    print(f"{al:5s} {lab:17s} n{n:4d} | " + ' | '.join(f"t{t/10:.1f} QB {md(t,'qd'):.1f}/{md(t,'ql'):+.1f} RB {md(t,'rd'):.1f}/{md(t,'rl'):+.1f} sep {md(t,'sep'):.1f}" for t in (6, 10, 14)))
