"""NFL targeted passes at the ball's arrival: where the ball is against the receiver, his speed, the nearest defender, and whether he caught it, dropped it (the tracking's dropped_pass tag) or it was incomplete otherwise.
  python3 -I scripts/diag/catch/nfl_arrival.py OUT.jsonl.gz [weeks=1,2,...,9]
Adapted from scripts/diag/catch-speed/nfl-drop-proxy.py (claude/quirky-franklin-9lbwbp), whose arrival frame, defender distance and cosine it keeps: pass_arrived; ball distance = horizontal distance from the football to the receiver at that frame;
near = the nearest defender to the receiver; speed over +-0.1 s; cos = his velocity against the ball's (+ = ball from behind him). Rows: {c: caught, drop: dropped_pass tag, d: ball distance, sp, cos, near}."""
import os, sys, math, json, gzip
import numpy as np, pandas as pd
D = '/home/user/football-simulation-/data/raw/bdb2025/big-data-bowl-data'
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3,4,5,6,7,8,9').split(',')]
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
plays = plays[plays.passResult.isin(['C', 'I']) & (plays.playNullifiedByPenalty != 'Y')]
res = dict(zip(zip(plays.gameId, plays.playId), plays.passResult)); poss = dict(zip(zip(plays.gameId, plays.playId), plays.possessionTeam))
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'wasTargettedReceiver'])
tgt = {(r.gameId, r.playId): r.nflId for r in pp[pp.wasTargettedReceiver == 1].itertuples()}
out = gzip.open(sys.argv[1], 'wt'); n = 0
for w in weeks:
    buf = None
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'x', 'y', 's', 'event'], chunksize=3_000_000):
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
            d_ball = math.hypot(B.at[fa, 'x'] - rx, B.at[fa, 'y'] - ry)
            Dd = T[(T.frameId == fa) & (T.club != poss[(g, p)]) & (T.club != 'football')]
            near = float(np.min(np.hypot(Dd.x - rx, Dd.y - ry))) if len(Dd) else 99
            vx, vy = (R.at[fa + 1, 'x'] - R.at[fa - 1, 'x']) / 0.2, (R.at[fa + 1, 'y'] - R.at[fa - 1, 'y']) / 0.2; sp = math.hypot(vx, vy)
            bx, by = B.at[fa, 'x'] - B.at[fa - 2, 'x'], B.at[fa, 'y'] - B.at[fa - 2, 'y']; bl = math.hypot(bx, by)
            cos = (vx * bx + vy * by) / (sp * bl) if sp > 1 and bl > 0.3 else None
            out.write(json.dumps({'c': res[(g, p)] == 'C', 'drop': 'dropped_pass' in ev.index, 'd': round(d_ball, 2), 'sp': round(sp, 2), 'cos': None if cos is None else round(cos, 2), 'near': round(near, 2), 'bs': round(float(B.at[fa, 's']), 2), 'week': w}) + '\n'); n += 1
    print('week', w, n, file=sys.stderr)
out.close()
