# NFL sacks (BDB 2025 tracking): time from the first defender within 2 yd / 1 yd of the QB (after the snap) to the
# qb_sack event frame, and the QB's speed and travel between first 1-yd contact and the sack. usage:
# python3 -I nfl_sack_time.py <bdb dir> 1,2,3
import csv, sys, math, collections as C, statistics as st
D = sys.argv[1]; weeks = sys.argv[2].split(',')
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
plays = {(r['gameId'], r['playId']): r['possessionTeam'] for r in csv.DictReader(open(f'{D}/plays.csv'))}
T = C.defaultdict(lambda: C.defaultdict(dict)); ev = C.defaultdict(dict)
for w in weeks:
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        f = int(r['frameId'])
        if r['event'] in ('ball_snap', 'qb_sack', 'pass_forward') and r['event'] not in ev[k]: ev[k][r['event']] = f
        if r['nflId'] in ('', 'NA'): continue
        T[k][r['nflId']][f] = (float(r['x']), float(r['y']), r['club'])
to2, to1, rest, qspd, qtrav = [], [], [], [], []
for k, e in ev.items():
    if 'qb_sack' not in e or 'ball_snap' not in e or 'pass_forward' in e or k not in plays: continue
    P = T[k]; off = plays[k]
    qbs = [i for i, tr in P.items() if pos.get(i) == 'QB' and e['ball_snap'] in tr and tr[e['ball_snap']][2] == off]
    if len(qbs) != 1: continue
    q = P[qbs[0]]; defs = [tr for tr in P.values() if e['ball_snap'] in tr and tr[e['ball_snap']][2] != off]
    near = lambda f: min((math.hypot(dt[f][0] - q[f][0], dt[f][1] - q[f][1]) for dt in defs if f in dt), default=99)
    s, z = e['ball_snap'], e['qb_sack']
    f2 = next((f for f in range(s, z + 1) if f in q and near(f) <= 2), None)
    f1 = next((f for f in range(s, z + 1) if f in q and near(f) <= 1), None)
    if f2 is None or f1 is None: continue
    to2.append((z - f2) / 10); to1.append((z - f1) / 10)
    qtrav.append(math.hypot(q[z][0] - q[f1][0], q[z][1] - q[f1][1]))
    qspd.append(sum(math.hypot(q[f + 1][0] - q[f][0], q[f + 1][1] - q[f][1]) for f in range(f1, z) if f + 1 in q) / max(0.1, (z - f1) / 10))
pc = lambda a, p: sorted(a)[int(p * (len(a) - 1))]
print(f"NFL sacks n {len(to1)}: 2 yd -> sack p25/p50/p75 {pc(to2,.25):.1f} {pc(to2,.5):.1f} {pc(to2,.75):.1f} s; 1 yd -> sack {pc(to1,.25):.1f} {pc(to1,.5):.1f} {pc(to1,.75):.1f} s; QB from 1 yd to the sack: {st.median(qtrav):.2f} yd at {st.median(qspd):.2f} yd/s")
