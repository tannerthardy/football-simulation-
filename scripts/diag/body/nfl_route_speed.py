"""Receiver speed by time since the snap on a called route, from BDB 2025 tracking (weeks 1-9): non-play-action dropbacks, receivers with player_play.routeRan, speed every 0.1 s from the snap to pass_forward
(the provider's s). Press = a defender within 2 yd ahead of the receiver (toward the defense) and 1.5 yd across at the snap. The same operator as route-speed-sim.mts.
  python3 -I scripts/diag/body/nfl_route_speed.py DATA_DIR OUT.json [weeks=1,2,...,9]"""
import json, sys
import numpy as np, pandas as pd
D = sys.argv[1]; out = sys.argv[2]; weeks = [int(w) for w in (sys.argv[3] if len(sys.argv) > 3 else '1,2,3,4,5,6,7,8,9').split(',')]
players = pd.read_csv(f'{D}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
plays = pd.read_csv(f'{D}/plays.csv', usecols=['gameId', 'playId', 'isDropback', 'playAction', 'possessionTeam', 'defensiveTeam', 'playNullifiedByPenalty'])
plays = plays[(plays.isDropback.astype(str).str.upper() == 'TRUE') & (plays.playAction.astype(str).str.upper() == 'FALSE')]
pp = pd.read_csv(f'{D}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'routeRan', 'wasRunningRoute'])
pp = pp[pp.wasRunningRoute.astype(str).str.upper().isin(['1', '1.0', 'TRUE'])].dropna(subset=['routeRan'])
route_of = {(int(r.gameId), int(r.playId), int(r.nflId)): r.routeRan for r in pp.itertuples()}
pkeys = {(int(r.gameId), int(r.playId)): (r.possessionTeam, r.defensiveTeam) for r in plays.itertuples()}
rows = []
for w in weeks:
    T = pd.read_csv(f'{D}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 's', 'event'], dtype={'x': 'float32', 'y': 'float32', 's': 'float32'})
    T = T[T.nflId.notna()]
    for (g, p), P in T.groupby(['gameId', 'playId'], sort=False):
        k = (int(g), int(p))
        if k not in pkeys: continue
        ev = P[P.event.isin(['ball_snap', 'pass_forward'])].groupby('event').frameId.min()
        if 'ball_snap' not in ev or 'pass_forward' not in ev: continue
        s0, s1 = int(ev['ball_snap']), int(ev['pass_forward'])
        if s1 - s0 < 10: continue
        off, dfn = pkeys[k]; d = 1 if P.playDirection.iloc[0] == 'right' else -1
        snap = P[P.frameId == s0]
        defs = snap[snap.club == dfn]
        for nid, R in P.groupby('nflId'):
            rt = route_of.get((int(g), int(p), int(nid)))
            if rt is None: continue
            R = R.set_index('frameId'); 
            if s0 not in R.index: continue
            x0, y0 = float(R.loc[s0, 'x']), float(R.loc[s0, 'y'])
            press = bool((((defs.x - x0) * d > 0) & (np.hypot(defs.x - x0, defs.y - y0) < 2.0) & ((defs.y - y0).abs() < 1.5)).any())
            sp = [float(R.loc[f, 's']) if f in R.index else float('nan') for f in range(s0, min(s1, s0 + 60) + 1)]
            rows.append(dict(g=int(g), pos=players.get(int(nid), '?'), route=rt, press=press, kt=s1 - s0, s=[round(v, 2) for v in sp]))
    print(f'week {w}: {len(rows)} receiver routes', file=sys.stderr, flush=True)
json.dump(rows, open(out, 'w'))
print(len(rows), 'rows ->', out, file=sys.stderr)
