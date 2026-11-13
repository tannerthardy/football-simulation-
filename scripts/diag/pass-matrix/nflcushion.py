"""Cushion trace from the snap for deep defenders over a vertical stem (Defense, C9; report only). Raw BDB 2025.
Pairs as nflturn.py (CB/S 2+ yd over a receiver within 8 yd at 1.0 s), kept when the receiver is still climbing
(> 3 yd/s) at 1.5 s. At the snap and 0.5 / 1.0 / 1.5 / 2.0 s (before the release only): the defender's depth from
the ball, his cushion over the receiver, his downfield speed, his speed and facing class to the QB; the receiver's
downfield speed; and the time of the defender's first retreat (downfield speed above 1 yd/s).
  python3 -I nflcushion.py <bdb dir> [weeks]"""
import sys, math, collections as C
import pandas as pd
bdb = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'pff_passCoverage', 'playAction', 'isDropback'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
FAM = {'Cover-2': 'C2', 'Cover-3': 'C3', 'Cover-3 Seam': 'C3', 'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3',
       'Cover-3 Double Cloud': 'C3', 'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
plays = plays[(plays.isDropback == True) & (plays.playAction == False)]
cov = {(r.gameId, r.playId) for r in plays.itertuples() if FAM.get(r.pff_passCoverage)}
DB = {'CB', 'S', 'FS', 'SS', 'DB'}; REC = {'WR', 'TE', 'RB', 'FB'}; MARKS = [0, 5, 10, 15, 20]
rows = []
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(cov))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        snap = ev[ev.isin(['ball_snap', 'snap_direct'])].index; rel = ev[ev == 'pass_forward'].index
        if not len(snap) or not len(rel): continue
        fs, fr = snap[0], rel[0]
        ball = f[f.nflId.isna()].set_index('frameId')
        if fs not in ball.index: continue
        P = {n: g2.set_index('frameId') for n, g2 in f.dropna(subset=['nflId']).groupby('nflId')}
        qb = [n for n in P if pos.get(n) == 'QB']; recs = [n for n in P if pos.get(n) in REC]
        if not qb or not recs: continue
        Q = P[qb[0]]; bx = ball.loc[fs].x; f1 = fs + 10
        dirx = 1 if P[recs[0]].loc[fs].x > Q.loc[fs].x else -1
        for n in P:
            if pos.get(n) not in DB or f1 not in P[n].index: continue
            D = P[n]; d1 = D.loc[f1]
            cand = [(math.hypot(P[r].loc[f1].x - d1.x, P[r].loc[f1].y - d1.y), r) for r in recs if f1 in P[r].index]
            cand = [(dd, r) for dd, r in cand if dd < 8 and (d1.x - P[r].loc[f1].x) * dirx > 2]
            if not cand: continue
            Rr = P[min(cand)[1]]
            k15 = fs + 15
            if k15 not in Rr.index or k15 - 1 not in Rr.index or (Rr.loc[k15].x - Rr.loc[k15 - 1].x) / 0.1 * dirx <= 3: continue
            row = {'retreat': None}
            for k in range(fs + 1, fr + 1):
                if k in D.index and k - 1 in D.index and (D.loc[k].x - D.loc[k - 1].x) / 0.1 * dirx > 1: row['retreat'] = (k - fs) * 0.1; break
            for m in MARKS:
                k = fs + m
                if k > fr or k not in D.index or k - 1 not in D.index or k not in Rr.index or k - 1 not in Rr.index or k not in Q.index: continue
                dk, qk = D.loc[k], Q.loc[k]
                ang = math.degrees(math.atan2(qk.x - dk.x, qk.y - dk.y)) % 360; a = min(abs(dk.o - ang) % 360, 360 - abs(dk.o - ang) % 360)
                vx = (dk.x - D.loc[k - 1].x) / 0.1 * dirx; sp = math.hypot(dk.x - D.loc[k - 1].x, dk.y - D.loc[k - 1].y) / 0.1
                row[m] = {'depth': (dk.x - bx) * dirx, 'cushion': (dk.x - Rr.loc[k].x) * dirx, 'vx': vx, 'spd': sp,
                          'face': 'square' if a <= 45 else 'side-on' if a <= 135 else 'turned', 'rvx': (Rr.loc[k].x - Rr.loc[k - 1].x) / 0.1 * dirx}
            rows.append(row)
    print(f'week {w} done', file=sys.stderr)
q = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
print(f'NFL deep defenders over a vertical stem (weeks {weeks}): n {len(rows)}; first retreat p50 {q([r["retreat"] for r in rows if r["retreat"] is not None]):.1f} s after the snap')
print('  t    n     depth  cushion  his vx  his speed  receiver vx | speed by facing: square / side-on / turned (share)')
for m in MARKS:
    X = [r[m] for r in rows if m in r]
    if not X: continue
    fc = {c: [x['spd'] for x in X if x['face'] == c] for c in ('square', 'side-on', 'turned')}
    print(f"  {m / 10:.1f}  {len(X):5}  {q([x['depth'] for x in X]):5.1f}  {q([x['cushion'] for x in X]):6.1f}  {q([x['vx'] for x in X]):+5.1f}  {q([x['spd'] for x in X]):6.1f}  {q([x['rvx'] for x in X]):+7.1f}    | "
          + ' / '.join(f"{q(v):.1f} ({len(v) / len(X):.0%})" for v in fc.values()))
