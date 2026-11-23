"""The catch in motion, NFL side (Integration, 2026-11-23): BDB 2025 completions in the per-catch format
sim-catch-film.mts writes, so catch_speed.py reads both. Per completion, one JSON line:
  src 'nfl', id, route (player_play routeRan), air (pass length), t (s from the catch: pass_outcome_caught, 0.1 s
  frames from the throw - 1.0 s to the catch + 1.0 s), r (receiver [x, y] per frame), b (ball [x, y, z] per frame,
  z null: BDB has no ball height), throw / arrive (s from the catch: pass_forward, pass_arrived).
x yards past the line toward the defense, y across. Positions only; velocities are derived the same way on both sides.
Raw BDB stays in data/raw (ignored); the output goes to the scratchpad, never to Git.
usage: python3 -I scripts/diag/catch-speed/nfl-catch-film.py OUT.jsonl [weeks=1,2,3]"""
import json, os, sys
import pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
out = open(sys.argv[1], 'w'); weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
plays = plays[(plays.passResult == 'C') & (plays.playNullifiedByPenalty != 'Y')]
P = {(r.gameId, r.playId): r for r in plays.itertuples()}
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'hadPassReception', 'routeRan'])
rec = {(r.gameId, r.playId): (r.nflId, r.routeRan) for r in pp[pp.hadPassReception == 1].itertuples()}
n = 0
for w in weeks:
    buf = None
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 'event'], chunksize=3_000_000):
        if buf is not None: ch = pd.concat([buf, ch])
        last = ch.iloc[-1][['gameId', 'playId']].tolist()
        done = ch[(ch.gameId != last[0]) | (ch.playId != last[1])]; buf = ch[(ch.gameId == last[0]) & (ch.playId == last[1])]
        for (g, p), T in done.groupby(['gameId', 'playId']):
            if (g, p) not in P or (g, p) not in rec: continue
            ev = T.dropna(subset=['event']).groupby('event').frameId.min()
            if 'pass_outcome_caught' not in ev.index or 'pass_forward' not in ev.index or 'ball_snap' not in ev.index: continue
            fc, ft, fs = int(ev['pass_outcome_caught']), int(ev['pass_forward']), int(ev['ball_snap'])
            nid, route = rec[(g, p)]
            sgn = 1 if T.playDirection.iloc[0] == 'right' else -1
            ball = T[T.club == 'football'].set_index('frameId'); R = T[T.nflId == nid].set_index('frameId')
            if fs not in ball.index: continue
            los = float(ball.at[fs, 'x'])
            frames = [f for f in range(ft - 10, fc + 11) if f in R.index and f in ball.index]
            if len(frames) < 10: continue
            X = lambda v: round(float((v - los) * sgn), 2)
            row = {'src': 'nfl', 'id': f'{g}-{p}', 'route': route if isinstance(route, str) else None,
                   'air': float(P[(g, p)].passLength) if not pd.isna(P[(g, p)].passLength) else None,
                   't': [round((f - fc) / 10, 2) for f in frames], 'r': [[X(R.at[f, 'x']), round(float(R.at[f, 'y']), 2)] for f in frames],
                   'b': [[X(ball.at[f, 'x']), round(float(ball.at[f, 'y']), 2), None] for f in frames],
                   'throw': round((ft - fc) / 10, 2), 'arrive': round((int(ev['pass_arrived']) - fc) / 10, 2) if 'pass_arrived' in ev.index else 0.0}
            out.write(json.dumps(row) + '\n'); n += 1
out.close(); print('catches', n)
