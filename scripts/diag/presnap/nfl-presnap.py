"""Pre-snap movement, the NFL side (Integration, 2026-11-23, the user's request: "we need a lot more movement
pre-snap"). BDB 2025 tracking, positions only, one JSON line per play in the common pre-snap format that
sim-presnap.mts writes, so presnap.py reads both:
  src 'nfl', id, kind ('run' | 'pass'), down, togo, form (offenseFormation), cov (pff_passCoverage), man (pff_manZone),
  t: seconds from the snap per 0.1 s frame, from the line set (or, with none, from 3 s before the snap) to 1.5 s after;
  ls (s from the snap of the line set, or null), events: [[t, name]] for man_in_motion / shift / line_set / ball_snap;
  players: [{ side 'O' | 'D', pos, rush (an initial pass rusher), assign (pff_defensiveCoverageAssignment), motion
             (inMotionAtBallSnap or motionSinceLineset or shiftSinceLineset) }],
  xy per frame [x0, y0, ...]: x yards past the ball's snap x toward the defense, y yards from the ball's snap y.
Raw BDB stays in data/raw; the output goes to the scratchpad, never to Git.
usage: python3 -I scripts/diag/presnap/nfl-presnap.py OUT.jsonl [weeks=1,...,9]"""
import json, os, sys
import pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
out = open(sys.argv[1], 'w')
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3,4,5,6,7,8,9').split(',')]
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
plays = plays[(plays.qbSpike != True) & (plays.qbKneel != 1) & (plays.playNullifiedByPenalty != 'Y')]
P = {(r.gameId, r.playId): r for r in plays.itertuples()}
pp = pd.read_csv(os.path.join(D, 'player_play.csv'))
PP = {(r.gameId, r.playId, r.nflId): r for r in pp.itertuples()}
pos = dict(zip(*[pd.read_csv(os.path.join(D, 'players.csv'))[c] for c in ('nflId', 'position')]))
EV = {'man_in_motion', 'shift', 'line_set', 'ball_snap'}
n = 0
for w in weeks:
    buf = None
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 'event'], chunksize=3_000_000):
        if buf is not None: ch = pd.concat([buf, ch])
        last = ch.iloc[-1][['gameId', 'playId']].tolist()
        done = ch[(ch.gameId != last[0]) | (ch.playId != last[1])]; buf = ch[(ch.gameId == last[0]) & (ch.playId == last[1])]
        for (g, p), T in done.groupby(['gameId', 'playId']):
            pl = P.get((g, p))
            if pl is None: continue
            snapF = T.loc[T.event == 'ball_snap', 'frameId']
            if not len(snapF): continue
            sf = int(snapF.min()); lsF = T.loc[T.event == 'line_set', 'frameId']
            ls = int(lsF.min()) if len(lsF) else None
            f0 = ls if ls is not None and ls < sf else sf - 30
            T = T[(T.frameId >= f0) & (T.frameId <= sf + 15)]
            ball = T[(T.club == 'football') & (T.frameId == sf)]
            if not len(ball): continue
            sgn = 1 if T.playDirection.iloc[0] == 'right' else -1; bx, by = float(ball.x.iloc[0]), float(ball.y.iloc[0])
            off = pl.possessionTeam
            club = T.dropna(subset=['nflId']).groupby('nflId').club.first()
            ids = sorted(T.nflId.dropna().unique(), key=lambda i: (club[i] != off, pos.get(i, ''), i))
            if len(ids) != 22: continue
            frames = sorted(T.frameId.unique())
            X = T.dropna(subset=['nflId']).pivot_table(index='frameId', columns='nflId', values='x').reindex(frames).ffill().bfill()
            Y = T.dropna(subset=['nflId']).pivot_table(index='frameId', columns='nflId', values='y').reindex(frames).ffill().bfill()
            if any(i not in X.columns for i in ids): continue
            xy = [[v for i in ids for v in (round(float((X.at[f, i] - bx) * sgn), 2), round(float((Y.at[f, i] - by) * sgn), 2))] for f in frames]
            evs = T.dropna(subset=['event']); evs = evs[evs.event.isin(EV)].groupby('event').frameId.unique()
            events = sorted([[round((int(f) - sf) / 10, 1), e] for e, fs in evs.items() for f in fs])
            players = []
            for i in ids:
                r = PP.get((g, p, i)); side = 'O' if club[i] == off else 'D'
                players.append(dict(side=side, pos=pos.get(i), rush=bool(r is not None and r.wasInitialPassRusher == 1),
                                    assign=(r.pff_defensiveCoverageAssignment if r is not None and isinstance(r.pff_defensiveCoverageAssignment, str) else None),
                                    motion=bool(r is not None and (r.inMotionAtBallSnap == True or r.motionSinceLineset == True or r.shiftSinceLineset == True))))
            out.write(json.dumps(dict(src='nfl', id=f'{g}-{p}', kind='pass' if pl.isDropback else 'run', down=int(pl.down), togo=int(pl.yardsToGo),
                                      form=pl.offenseFormation if isinstance(pl.offenseFormation, str) else None, cov=pl.pff_passCoverage if isinstance(pl.pff_passCoverage, str) else None,
                                      man=pl.pff_manZone if isinstance(pl.pff_manZone, str) else None, t=[round((f - sf) / 10, 1) for f in frames],
                                      ls=round((ls - sf) / 10, 1) if ls is not None else None, events=events, players=players, xy=xy)) + '\n')
            n += 1
    print('week', w, 'plays', n, flush=True)
out.close()
