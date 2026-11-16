"""nflcarry_bins.py: the deep man's orientation by the receiver's position relative to him (Defense, C9 3c question; report
only). WR go, no help behind (pairs as nflcarry_split.py). Every frame from 1.0 s to 1.0 s after the release: torso
angle off the QB and his speed, binned by the signed cushion (his depth over the receiver, 0.5 yd bins from +3 to -2;
negative = the receiver past him) and by ball in the air or not. Was: nflcarry.py split by the climber's route and position (Defense, C9 attempt 3; report only). Raw BDB 2025.
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
            rn = min(cand)[1]; Rr = P[rn]; k15 = fs + 15
            if group(g, p, rn) != 'WR go': continue
            if k15 not in Rr.index or k15 - 1 not in Rr.index or (Rr.loc[k15].x - Rr.loc[k15 - 1].x) / 0.1 * dirx <= 3: continue
            if any((P[m].loc[f1].x - d1.x) * dirx >= 3 and abs(P[m].loc[f1].y - d1.y) <= 12 for m in dbs if m != n): continue
            for k in range(f1, fr + 11):
                if not all(k in X.index and k - 1 in X.index for X in (D, Rr)) or k not in Q.index: continue
                dk, qk, rk = D.loc[k], Q.loc[k], Rr.loc[k]
                ang = math.degrees(math.atan2(qk.x - dk.x, qk.y - dk.y)) % 360; a = min(abs(dk.o - ang) % 360, 360 - abs(dk.o - ang) % 360)
                cush = (dk.x - rk.x) * dirx
                if cush > 3.25 or cush < -2.25: continue
                b = round(cush * 2) / 2
                S[(k > fr, b)].append((a, math.hypot(dk.x - D.loc[k - 1].x, dk.y - D.loc[k - 1].y) / 0.1))
    print(f'week {w} done', file=sys.stderr)
q = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
for air in (False, True):
    print(f"NFL WR go, no help: deep man by signed cushion, {'ball in the air' if air else 'before the throw'} (weeks {weeks}); frames")
    print('  cushion   frames  angle off QB p25/p50/p75   share > 120   share > 135   his speed')
    for b in [3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0, -0.5, -1.0, -1.5, -2.0]:
        V = S.get((air, b), [])
        if not V: continue
        A = sorted(v[0] for v in V)
        print(f"  {b:+5.1f}   {len(V):6}   {A[len(A)//4]:4.0f} / {q(A):4.0f} / {A[3*len(A)//4]:4.0f}        {sum(x > 120 for x in A)/len(A):4.0%}         {sum(x > 135 for x in A)/len(A):4.0%}       {q([v[1] for v in V]):4.1f}")
