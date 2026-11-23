"""The NFL side of the drop question (Integration, 2026-11-23). BDB 2025 has no dropped-pass tag, so: on targeted
passes where the ball arrives (pass_arrived) within 1.0 yd of the targeted receiver and no defender is within 1.5 yd,
the incompletion rate (an uncontested ball at his hands that is not caught: a drop, near enough), by the receiver's
speed then (positions over +-0.1 s) and by the ball's direction against his travel (cosine of his velocity with the
ball's: + = from behind him). Rows also written for the sim comparison. Raw BDB stays in data/raw.
usage: python3 -I scripts/diag/catch-speed/nfl-drop-proxy.py [weeks=1,2,3]"""
import os, sys, math, collections
import numpy as np, pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
weeks = [int(w) for w in (sys.argv[1] if len(sys.argv) > 1 else '1,2,3').split(',')]
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
plays = plays[plays.passResult.isin(['C', 'I']) & (plays.playNullifiedByPenalty != 'Y')]
res = dict(zip(zip(plays.gameId, plays.playId), plays.passResult)); poss = dict(zip(zip(plays.gameId, plays.playId), plays.possessionTeam))
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'wasTargettedReceiver'])
tgt = {(r.gameId, r.playId): r.nflId for r in pp[pp.wasTargettedReceiver == 1].itertuples()}
rows = []
for w in weeks:
    buf = None
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'x', 'y', 'event'], chunksize=3_000_000):
        if buf is not None: ch = pd.concat([buf, ch])
        last = ch.iloc[-1][['gameId', 'playId']].tolist()
        done = ch[(ch.gameId != last[0]) | (ch.playId != last[1])]; buf = ch[(ch.gameId == last[0]) & (ch.playId == last[1])]
        for (g, p), T in done.groupby(['gameId', 'playId']):
            if (g, p) not in res or (g, p) not in tgt: continue
            ev = T.dropna(subset=['event']).groupby('event').frameId.min()
            if 'pass_arrived' not in ev.index: continue
            fa = int(ev['pass_arrived'])
            R = T[T.nflId == tgt[(g, p)]].set_index('frameId'); B = T[T.club == 'football'].set_index('frameId')
            if not all(f in R.index for f in (fa - 1, fa, fa + 1)) or not all(f in B.index for f in (fa - 2, fa)): continue
            rx, ry = R.at[fa, 'x'], R.at[fa, 'y']
            if math.hypot(B.at[fa, 'x'] - rx, B.at[fa, 'y'] - ry) > 1.0: continue
            Dd = T[(T.frameId == fa) & (T.club != poss[(g, p)]) & (T.club != 'football')]
            near = float(np.min(np.hypot(Dd.x - rx, Dd.y - ry))) if len(Dd) else 99
            vx, vy = (R.at[fa + 1, 'x'] - R.at[fa - 1, 'x']) / 0.2, (R.at[fa + 1, 'y'] - R.at[fa - 1, 'y']) / 0.2; sp = math.hypot(vx, vy)
            bx, by = B.at[fa, 'x'] - B.at[fa - 2, 'x'], B.at[fa, 'y'] - B.at[fa - 2, 'y']; bl = math.hypot(bx, by)
            cos = (vx * bx + vy * by) / (sp * bl) if sp > 1 and bl > 0.3 else None
            rows.append((res[(g, p)] == 'C', sp, cos, near))
print(f'NFL targeted passes, ball within 1.0 yd at arrival: {len(rows)}')
for lab, S in (('uncontested (no defender within 1.5 yd)', [r for r in rows if r[3] > 1.5]), ('contested (a defender within 1.5 yd)', [r for r in rows if r[3] <= 1.5])):
    print(f'  {lab}: n {len(S)}, not caught {100 * sum(not r[0] for r in S) / max(1, len(S)):.1f}%')
    for lo, hi in ((0, 2), (2, 4), (4, 6), (6, 8), (8, 99)):
        B_ = [r for r in S if lo <= r[1] < hi]
        if B_: print(f'    speed {lo}-{hi}: n {len(B_):4d}, not caught {100 * sum(not r[0] for r in B_) / len(B_):.1f}%')
    for lab2, f in (('ball from behind (cos > 0.5)', lambda c: c is not None and c > 0.5), ('across', lambda c: c is not None and -0.5 <= c <= 0.5), ('he runs at it (cos < -0.5)', lambda c: c is not None and c < -0.5)):
        B_ = [r for r in S if f(r[2])]
        if B_: print(f'    {lab2}: n {len(B_)}, not caught {100 * sum(not r[0] for r in B_) / len(B_):.1f}%')
