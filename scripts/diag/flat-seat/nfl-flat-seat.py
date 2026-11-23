"""Underneath seats on dropbacks, the NFL side (Integration, 2026-11-23, Tools' flat-catch report: our flat defender is
5.7 yd deep at the throw against the NFL's 3.7, behind the catcher on 54% vs 35%). BDB 2025 weeks 1-9, PFF's coverage
assignment per defender (player_play.pff_defensiveCoverageAssignment) and his man matchup
(pff_primaryDefensiveCoverageMatchupNflId). Positions only. One JSON line per (play, defender) in the common
flat-seat format that sim-flat-seat.mts writes, so flat_seat.py reads both:
  src, id, cls (man / hook / curl_flat / flat / hole), rpos (man: matched receiver's position RB / FB / TE / WR),
  rslot (man: 'back' if he started in the backfield, 'inline' within 4 yd of the ball laterally, else 'slot' / 'wide'
  by the receiver's rank from the sideline), route (man: the matched receiver's route), pa, throw (s from the snap or
  null), t: [0.0, 0.1, ... 3.0] from the snap, d: defender [depth past the line, y] per frame, r: matched receiver
  [depth, y] per frame (man) or null (a frame after the tracking ends is null), rec: all eligible receivers [depth, y] per frame (route runners and backs).
Depth is yards past the line toward the defense. Dropbacks only (isDropback), no screens, plays not nullified.
Raw BDB stays in data/raw.
usage: python3 -I scripts/diag/flat-seat/nfl-flat-seat.py OUT.jsonl [weeks=1,...,9]"""
import os, sys, json
import numpy as np, pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
out = open(sys.argv[1], 'w')
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3,4,5,6,7,8,9').split(',')]
CLS = {'MAN': 'man', 'HCL': 'hook', 'HCR': 'hook', 'CFL': 'curl_flat', 'CFR': 'curl_flat', 'FL': 'flat', 'FR': 'flat', 'HOL': 'hole'}
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
plays = plays[(plays.isDropback == True) & (plays.playNullifiedByPenalty != 'Y') & (plays.passLocationType != 'SCREEN')]
P = {(r.gameId, r.playId): r for r in plays.itertuples()}
pos = dict(pd.read_csv(os.path.join(D, 'players.csv'), usecols=['nflId', 'position']).itertuples(index=False))
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'pff_defensiveCoverageAssignment',
                 'pff_primaryDefensiveCoverageMatchupNflId', 'routeRan', 'wasRunningRoute'])
seats, routes, runners = {}, {}, {}
for r in pp.itertuples():
    k = (r.gameId, r.playId)
    if k not in P: continue
    if isinstance(r.routeRan, str): routes[(k, r.nflId)] = r.routeRan
    if r.wasRunningRoute == 1: runners.setdefault(k, set()).add(r.nflId)
    c = CLS.get(r.pff_defensiveCoverageAssignment)
    if c: seats.setdefault(k, []).append((r.nflId, c, r.pff_primaryDefensiveCoverageMatchupNflId))
TS = [round(i / 10, 1) for i in range(31)]
n = 0
for w in weeks:
    buf = None
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 'event'], chunksize=3_000_000):
        if buf is not None: ch = pd.concat([buf, ch])
        last = ch.iloc[-1][['gameId', 'playId']].tolist()
        done = ch[(ch.gameId != last[0]) | (ch.playId != last[1])]; buf = ch[(ch.gameId == last[0]) & (ch.playId == last[1])]
        for (g, p), T in done.groupby(['gameId', 'playId']):
            k = (g, p)
            if k not in P or k not in seats: continue
            pl = P[k]
            ev = T.dropna(subset=['event']).groupby('event').frameId.min()
            if 'ball_snap' not in ev.index: continue
            f0 = int(ev['ball_snap'])
            thr = next((int(ev[e]) for e in ('pass_forward', 'pass_shovel') if e in ev.index), None)
            sgn = 1 if T.playDirection.iloc[0] == 'right' else -1
            los = pl.absoluteYardlineNumber
            X = {}
            for nid, G in T[T.club != 'football'].groupby('nflId'):
                G = G.set_index('frameId')
                fr = [f0 + int(round(t * 10)) for t in TS]
                if fr[0] not in G.index: break
                X[nid] = ([[round((G.at[f, 'x'] - los) * sgn, 2), round(G.at[f, 'y'], 2)] if f in G.index else None for f in fr], G.club.iloc[0])
            else:
                off = pl.possessionTeam
                ball0 = T[(T.club == 'football') & (T.frameId == f0)]
                by = float(ball0.y.iloc[0]) if len(ball0) else 26.65
                elig = [nid for nid, (xy, club) in X.items() if club == off and pos.get(nid) in ('RB', 'FB', 'TE', 'WR')
                        and (nid in runners.get(k, set()) or pos.get(nid) in ('RB', 'FB'))]
                rec = [X[nid][0] for nid in elig]
                for nid, c, m in seats[k]:
                    if nid not in X: continue
                    row = dict(src='nfl', id=f'{g}-{p}-{nid}', cls=c, pa=bool(pl.playAction), throw=round((thr - f0) / 10, 1) if thr else None,
                               t=TS, d=X[nid][0], r=None, rpos=None, rslot=None, route=None, rec=rec, ballY=round(by, 2))
                    if c == 'man':
                        if not (m == m) or int(m) not in X: continue
                        m = int(m); r0 = X[m][0][0]
                        row.update(r=X[m][0], rpos=pos.get(m), route=routes.get((k, m)))
                        if r0[0] < -2.5 and abs(r0[1] - by) < 4.5: row['rslot'] = 'back'
                        elif abs(r0[1] - by) < 4.5: row['rslot'] = 'inline'
                        else:
                            side = [e for e in elig if (X[e][0][0][1] - by) * (r0[1] - by) > 0]
                            wider = sum(abs(X[e][0][0][1] - by) > abs(r0[1] - by) + 0.1 for e in side)
                            row['rslot'] = 'wide' if wider == 0 else 'slot'
                    out.write(json.dumps(row) + '\n'); n += 1
    print('week', w, 'rows', n, flush=True)
out.close()
