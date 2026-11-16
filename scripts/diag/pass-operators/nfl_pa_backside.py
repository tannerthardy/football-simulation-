"""Play action's ends in the NFL (2026-11-16: both ends, the one away from the back's first lateral move and the one on its side, the fake side; Defense noted ours DE_W is the fake-side end) (Integration, 2026-11-16; the sim side is pa-backside-trace.mts): on gun dropbacks
(SHOTGUN / PISTOL, isDropback), play action against not, the edge defender on the side away from the back's first lateral
move (the back's y change over 0.0-0.8 s after the snap; the "backside" of the fake, as ours fakes strong and DE_W is
weak). The end: the defender within 2.5 yd of the line at the snap who is outermost on that side of the ball, inside 6 yd
of the ball laterally... widened to the last offensive lineman + 4 yd. Reported at 1.0 / 1.5 / 2.0 s after the snap, p50:
his depth past the line into the backfield, his lateral move toward the ball, the QB's depth; the share who were initial
pass rushers (player_play); and at 1.5 s the share rushing upfield (depth past 2.0 yd) vs squeezing / holding (within).
Raw BDB 2025 from data/raw (ignored; nothing raw is written to Git). usage: python3 -I scripts/diag/pass-operators/nfl_pa_backside.py [weeks=1,2,3]
"""
import sys, os
import pandas as pd
import numpy as np
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
weeks = [int(w) for w in (sys.argv[1] if len(sys.argv) > 1 else '1,2,3').split(',')]
plays = pd.read_csv(os.path.join(D, 'plays.csv'), usecols=['gameId', 'playId', 'offenseFormation', 'playAction', 'isDropback', 'possessionTeam', 'dropbackType'])
plays = plays[(plays.isDropback == True) & plays.offenseFormation.isin(['SHOTGUN', 'PISTOL'])]
plays = plays[plays.dropbackType.isin(['TRADITIONAL'])]
players = pd.read_csv(os.path.join(D, 'players.csv'), usecols=['nflId', 'position'])
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'wasInitialPassRusher'])
pos = dict(zip(players.nflId, players.position))
keep = set(zip(plays.gameId, plays.playId))
pa = dict(zip(zip(plays.gameId, plays.playId), plays.playAction))
offteam = dict(zip(zip(plays.gameId, plays.playId), plays.possessionTeam))
rusher = {(g, p, n): v for g, p, n, v in zip(pp.gameId, pp.playId, pp.nflId, pp.wasInitialPassRusher)}
rows = []
for w in weeks:
    f = os.path.join(D, f'tracking_week_{w}.csv')
    cols = ['gameId', 'playId', 'nflId', 'frameId', 'frameType', 'club', 'playDirection', 'x', 'y', 'event']
    buf = []
    for ch in pd.read_csv(f, usecols=cols, chunksize=2_000_000):
        ch = ch[[(g, p) in keep for g, p in zip(ch.gameId, ch.playId)]]
        if len(ch): buf.append(ch[ch.frameType != 'BEFORE_SNAP'] if 'frameType' in ch else ch)
    if not buf: continue
    T = pd.concat(buf)
    for (g, p), P in T.groupby(['gameId', 'playId']):
        snapf = P.loc[P.event == 'ball_snap', 'frameId']
        f0 = int(snapf.min()) if len(snapf) else int(P.frameId.min())
        P = P[P.frameId >= f0]
        flip = P.playDirection.iloc[0] == 'left'
        X = np.where(flip, 120 - P.x.values, P.x.values); Y = np.where(flip, 53.3 - P.y.values, P.y.values)
        P = P.assign(X=X, Y=Y, t=(P.frameId - f0) / 10.0)
        ball = P[P.club == 'football']
        if not len(ball): continue
        los, by = ball.X.iloc[0], ball.Y.iloc[0]
        off = offteam[(g, p)]
        S0 = P[(P.t == 0) & P.nflId.notna()]
        O = S0[S0.club == off]; Dd = S0[(S0.club != off) & (S0.club != 'football')]
        rb = O[O.nflId.map(pos).isin(['RB', 'FB'])]; qb = O[O.nflId.map(pos) == 'QB']; ol = O[O.nflId.map(pos).isin(['T', 'G', 'C'])]
        if len(rb) != 1 or len(qb) != 1 or len(ol) < 5: continue
        rbid = rb.nflId.iloc[0]
        rbt = P[(P.nflId == rbid) & (P.t <= 0.8)]
        if len(rbt) < 5: continue
        dy = rbt.Y.iloc[-1] - rbt.Y.iloc[0]
        if abs(dy) < 0.3: continue
        for which, back in (('away', -np.sign(dy)), ('fake', np.sign(dy))):  # away from / toward the back's first lateral move
            edge_lim = (ol.Y.max() + 4) if back > 0 else (ol.Y.min() - 4)
            cand = Dd[(Dd.X - los).abs() <= 2.5]
            cand = cand[(cand.Y - by) * back > 0]
            cand = cand[(cand.Y - edge_lim) * back <= 0]
            if not len(cand): continue
            e = cand.loc[((cand.Y - by) * back).idxmax()]
            eid = e.nflId
            E = P[P.nflId == eid].set_index('t'); Q = P[P.nflId == qb.nflId.iloc[0]].set_index('t')
            r = {'side': which, 'pa': bool(pa[(g, p)]), 'rusher': rusher.get((g, p, eid)), 'at': {}}
            for k in (1.0, 1.5, 2.0):
                if k in E.index and k in Q.index:
                    r['at'][k] = {'depth': los - E.loc[k, 'X'], 'toward': (e.Y - E.loc[k, 'Y']) * back, 'qb': los - Q.loc[k, 'X']}
            rows.append(r)
q = lambda v: float(np.median(v)) if len(v) else float('nan')
for side, pa_ in (('away', True), ('away', False), ('fake', True), ('fake', False)):
    S = [r for r in rows if r['pa'] == pa_ and r['side'] == side]
    if not S: continue
    ru = [r for r in S if r['rusher'] is not None]
    print(f"{side}-side end, {'play action' if pa_ else 'no play action'} (gun traditional dropbacks, n {len(S)}): initial pass rusher {100*sum(1 for r in ru if r['rusher'])/max(1,len(ru)):.0f}%")
    for k in (1.0, 1.5, 2.0):
        R = [r['at'][k] for r in S if k in r['at']]
        line = f"  {k} s (n {len(R)}): end's depth past the line {q([x['depth'] for x in R]):.2f} | toward the ball {q([x['toward'] for x in R]):.2f} | QB depth {q([x['qb'] for x in R]):.2f}"
        if k == 1.5: line += f" | upfield (> 2.0 yd past) {100*sum(1 for x in R if x['depth'] > 2.0)/max(1,len(R)):.0f}%"
        print(line)
