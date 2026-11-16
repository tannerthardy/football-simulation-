"""nflcarry.py split by the climber's route and position (Defense, C9 attempt 3; report only). Raw BDB 2025.
Groups: WR go (routeRan GO), split by the climber's downfield pace at 2.7 s (or the last frame before a release after 2.5 s), WR post/corner/wheel, WR other (a route that breaks), TE/RB any. Otherwise as nflcarry.py:
Pairs as nflcue.py: CB/S 2+ yd over a receiver within 8 yd at 1.0 s; the receiver climbing over 3 yd/s at 1.5 s;
zone families C2/C3/C4/C6. Help: another DB 3+ yd deeper within 12 yd laterally at 1.0 s.
At 1.50, 1.75, ... s after the snap (before the release) and at the release: medians of his body angle off the line to
the QB (0 square, 180 turned away), his speed, the receiver's downfield speed, the cushion, the lateral offset from the
receiver's line (|dy|), and the share on the inside shoulder (between the receiver and the ball's lateral spot at the
snap). Facing classes: square <=45, open 45-90, open 90-135, turned >135.
  python3 -I nflcarry_split.py <bdb dir> [weeks]"""
import sys, math, collections as C
import pandas as pd
bdb = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'pff_passCoverage', 'playAction', 'isDropback'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
ZONE = {'Cover-2', 'Cover-3', 'Cover-3 Seam', 'Cover-3 Cloud Left', 'Cover-3 Cloud Right', 'Cover-3 Double Cloud', 'Quarters', 'Cover 6-Left', 'Cover-6 Right'}
pp = pd.read_csv(f'{bdb}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'routeRan'])
route = {(r.gameId, r.playId, r.nflId): str(r.routeRan).upper() for r in pp.itertuples()}
def group(g, p, n):
    if pos.get(n) != 'WR': return 'TE/RB'
    r = route.get((g, p, n), '')
    return 'WR go' if r == 'GO' else 'WR post/corner/wheel' if r in ('POST', 'CORNER', 'WHEEL') else 'WR other'
plays = plays[(plays.isDropback == True) & (plays.playAction == False) & plays.pff_passCoverage.isin(ZONE)]
cov = {(r.gameId, r.playId) for r in plays.itertuples()}
DB = {'CB', 'S', 'FS', 'SS', 'DB'}; REC = {'WR', 'TE', 'RB', 'FB'}
MARKS = [0, 5, 10, 15, 17, 20, 22, 25, 27, 30]  # frames after the snap (0.1 s); 17/22/27 stand for 1.75/2.25/2.75
S = C.defaultdict(list)
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(cov))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        snap = ev[ev.isin(['ball_snap', 'snap_direct'])].index; rel = ev[ev == 'pass_forward'].index
        if not len(snap) or not len(rel): continue
        fs, fr = snap[0], rel[0]; f1 = fs + 10
        ball = f[f.nflId.isna()].set_index('frameId')
        if fs not in ball.index: continue
        by = ball.loc[fs].y
        P = {n: g2.set_index('frameId') for n, g2 in f.dropna(subset=['nflId']).groupby('nflId')}
        qb = [n for n in P if pos.get(n) == 'QB']; recs = [n for n in P if pos.get(n) in REC]
        if not qb or not recs: continue
        Q = P[qb[0]]; dirx = 1 if P[recs[0]].loc[fs].x > Q.loc[fs].x else -1
        dbs = [n for n in P if pos.get(n) in DB and f1 in P[n].index]
        for n in dbs:
            D = P[n]; d1 = D.loc[f1]
            cand = [(math.hypot(P[r].loc[f1].x - d1.x, P[r].loc[f1].y - d1.y), r) for r in recs if f1 in P[r].index]
            cand = [(dd, r) for dd, r in cand if dd < 8 and (d1.x - P[r].loc[f1].x) * dirx > 2]
            if not cand: continue
            rn = min(cand)[1]; Rr = P[rn]; k15 = fs + 15; grp = group(g, p, rn)
            if grp == 'WR go':
                kp = min(fs + 27, fr - 1)
                if kp >= fs + 25 and kp in Rr.index and kp - 1 in Rr.index:
                    pv = (Rr.loc[kp].x - Rr.loc[kp - 1].x) / 0.1 * dirx
                    grp = 'WR go, climber under 7.5' if pv < 7.5 else 'WR go, climber 7.5-8.2' if pv <= 8.2 else 'WR go, climber over 8.2'
                else: grp = 'WR go, released before 2.5 s'
            if k15 not in Rr.index or k15 - 1 not in Rr.index or (Rr.loc[k15].x - Rr.loc[k15 - 1].x) / 0.1 * dirx <= 3: continue
            help_ = any((P[m].loc[f1].x - d1.x) * dirx >= 3 and abs(P[m].loc[f1].y - d1.y) <= 12 for m in dbs if m != n)
            for lab, k in [(f'{m / 10:.2f}'.replace('1.70', '1.75').replace('2.20', '2.25').replace('2.70', '2.75'), fs + m) for m in MARKS if fs + m < fr] + [('release', fr)]:
                if not all(k in X.index and k - 1 in X.index for X in (D, Rr)) or k not in Q.index: continue
                dk, qk, rk = D.loc[k], Q.loc[k], Rr.loc[k]
                ang = math.degrees(math.atan2(qk.x - dk.x, qk.y - dk.y)) % 360; a = min(abs(dk.o - ang) % 360, 360 - abs(dk.o - ang) % 360)
                inside = (dk.y - rk.y) * (by - rk.y) > 0
                S[(help_, grp, lab)].append((a, math.hypot(dk.x - D.loc[k - 1].x, dk.y - D.loc[k - 1].y) / 0.1, (rk.x - Rr.loc[k - 1].x) / 0.1 * dirx,
                                        (dk.x - rk.x) * dirx, abs(dk.y - rk.y), inside))
    print(f'week {w} done', file=sys.stderr)
q = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
for grp in ('WR go, climber under 7.5', 'WR go, climber 7.5-8.2', 'WR go, climber over 8.2', 'WR go, released before 2.5 s', 'WR post/corner/wheel', 'WR other', 'TE/RB'):
  for h in (False, True):
    print(f"NFL zone deep defenders over a climber, {grp}, {'help behind' if h else 'no help'} (weeks {weeks})")
    print('    t        n   angle off QB  his speed  receiver vx  cushion  lateral  inside | square / 45-90 / 90-135 / turned')
    for lab in ['0.00', '0.50', '1.00', '1.50', '1.75', '2.00', '2.25', '2.50', '2.75', '3.00', 'release']:
        V = S.get((h, grp, lab), [])
        if not V: continue
        cl = [sum(lo < v[0] <= hi for v in V) / len(V) for lo, hi in ((-1, 45), (45, 90), (90, 135), (135, 181))]
        print(f"    {lab:7} {len(V):5}   {q([v[0] for v in V]):5.0f}       {q([v[1] for v in V]):4.1f}       {q([v[2] for v in V]):+4.1f}      {q([v[3] for v in V]):4.1f}    {q([v[4] for v in V]):4.1f}   {sum(v[5] for v in V) / len(V):4.0%} | "
              + ' / '.join(f'{c:.0%}' for c in cl))
