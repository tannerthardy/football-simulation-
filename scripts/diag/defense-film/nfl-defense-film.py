"""The NFL's side of the defense-film operator (Integration, 2026-11-23): BDB 2025 tracking in the format
sim-defense-film.mts writes, so defense_film.py reads both. Per play, one JSON line:
  src 'nfl', id, kind ('run' | 'pass': isDropback), pa (playAction), dropback, form (offenseFormation),
  cov: { id (pff_passCoverage), fam (cover0 / cover1 / cover2 / cover2man / cover3 / cover4 / cover6 / other),
         shell (zero / one-high / two-high, from the family), look (null: not labelled; measured), man (pff_manZone) },
  blitz (indices of non-linemen who were initial pass rushers), motion (index of the man in motion since the line set,
  or null), players: [{ side, pos, slot (null), assign (pff_defensiveCoverageAssignment), rush (initial pass rusher),
  route (wasRunningRoute), block (blocked someone), motionPlayer }],
  t (s from the snap, 0.1 s frames, from the line set but at most 3 s before the snap, to 3.5 s after),
  xy per frame [x0, y0, ...]: x yards past the ball's snap x toward the defense, y across the field (absolute),
  ballY, handoff / throw (s from the snap: handoff, pass_forward), carrier (the rusher's index on runs).
Raw BDB stays in data/raw (ignored); the output goes to the scratchpad / out, never to Git.
usage: python3 -I scripts/diag/defense-film/nfl-defense-film.py OUT.jsonl [weeks=1,2]"""
import json, os, sys
import numpy as np, pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
out = open(sys.argv[1], 'w')
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
FAM = {'Cover-0': 'cover0', 'Cover-1': 'cover1', 'Cover-1 Double': 'cover1', 'Cover-2': 'cover2', '2-Man': 'cover2man',
       'Cover-3': 'cover3', 'Cover-3 Seam': 'cover3', 'Cover-3 Cloud Left': 'cover3', 'Cover-3 Cloud Right': 'cover3',
       'Cover-3 Double Cloud': 'cover3', 'Quarters': 'cover4', 'Cover 6-Left': 'cover6', 'Cover-6 Right': 'cover6'}
SHELL = {'cover0': 'zero', 'cover1': 'one-high', 'cover3': 'one-high', 'cover2': 'two-high', 'cover2man': 'two-high',
         'cover4': 'two-high', 'cover6': 'two-high'}
DL = {'DE', 'DT', 'NT'}
plays = pd.read_csv(os.path.join(D, 'plays.csv'))
plays = plays[(plays.qbSpike != True) & (plays.qbKneel != 1) & (plays.playNullifiedByPenalty != 'Y')]
P = {(r.gameId, r.playId): r for r in plays.itertuples()}
pp = pd.read_csv(os.path.join(D, 'player_play.csv'))
PP = {(r.gameId, r.playId, r.nflId): r for r in pp.itertuples()}
pos = dict(zip(*[pd.read_csv(os.path.join(D, 'players.csv'))[c] for c in ('nflId', 'position')]))
n = 0
for w in weeks:
    buf = None
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), chunksize=3_000_000):
        if buf is not None: ch = pd.concat([buf, ch])
        last = ch.iloc[-1][['gameId', 'playId']].tolist()
        done = ch[(ch.gameId != last[0]) | (ch.playId != last[1])]; buf = ch[(ch.gameId == last[0]) & (ch.playId == last[1])]
        for (g, p), T in done.groupby(['gameId', 'playId']):
            pl = P.get((g, p))
            if pl is None: continue
            snapF = T.loc[T.event == 'ball_snap', 'frameId']
            if not len(snapF): continue
            sf = int(snapF.min()); lsF = T.loc[T.event == 'line_set', 'frameId']
            f0 = max(int(lsF.min()) if len(lsF) else sf - 30, sf - 30)
            T = T[(T.frameId >= f0) & (T.frameId <= sf + 35)]
            ball = T[(T.club == 'football') & (T.frameId == sf)]
            if not len(ball): continue
            sgn = 1 if T.playDirection.iloc[0] == 'right' else -1; bx, by = float(ball.x.iloc[0]), float(ball.y.iloc[0])
            ids = [i for i in T.nflId.dropna().unique()]
            off = pl.possessionTeam
            club = T.dropna(subset=['nflId']).groupby('nflId').club.first()
            ids.sort(key=lambda i: (club[i] != off, pos.get(i, ''), i))
            frames = sorted(T.frameId.unique())
            X = T.dropna(subset=['nflId']).pivot_table(index='frameId', columns='nflId', values='x')
            Y = T.dropna(subset=['nflId']).pivot_table(index='frameId', columns='nflId', values='y')
            if any(i not in X.columns for i in ids) or len(ids) != 22: continue
            X, Y = X.reindex(frames).ffill().bfill(), Y.reindex(frames).ffill().bfill()
            xy = [[v for i in ids for v in (round(float((X.at[f, i] - bx) * sgn), 2), round(float(Y.at[f, i]), 2))] for f in frames]
            ev = T.dropna(subset=['event']).groupby('event').frameId.min()
            at = lambda e: round((int(ev[e]) - sf) / 10, 2) if e in ev.index else None
            fam = FAM.get(pl.pff_passCoverage, 'other')
            players = []
            for i in ids:
                r = PP.get((g, p, i)); side = 'O' if club[i] == off else 'D'
                players.append({'side': side, 'pos': pos.get(i, ''), 'slot': None,
                                'assign': (r.pff_defensiveCoverageAssignment if r is not None and isinstance(r.pff_defensiveCoverageAssignment, str) else None),
                                'rush': bool(r is not None and r.wasInitialPassRusher == 1), 'route': bool(r is not None and r.wasRunningRoute == 1),
                                'block': bool(r is not None and not pd.isna(r.blockedPlayerNFLId1)),
                                'motionPlayer': bool(r is not None and (r.motionSinceLineset == True or r.inMotionAtBallSnap == True))})
            motion = [k for k, q in enumerate(players) if q['side'] == 'O' and q['motionPlayer']]
            carrier = next((k for k, i in enumerate(ids) if PP.get((g, p, i)) is not None and PP[(g, p, i)].hadRushAttempt == 1), None)
            row = {'src': 'nfl', 'id': f'{g}-{p}', 'kind': 'pass' if pl.isDropback else 'run', 'pa': bool(pl.playAction), 'dropback': bool(pl.isDropback),
                   'form': pl.offenseFormation if isinstance(pl.offenseFormation, str) else None, 'run': pl.pff_runConceptPrimary if isinstance(pl.pff_runConceptPrimary, str) else None,
                   'cov': {'id': pl.pff_passCoverage if isinstance(pl.pff_passCoverage, str) else None, 'fam': fam, 'shell': SHELL.get(fam), 'look': None, 'man': pl.pff_manZone == 'Man'},
                   'blitz': [k for k, q in enumerate(players) if q['side'] == 'D' and q['rush'] and q['pos'] not in DL],
                   'motion': motion[0] if len(motion) == 1 else None, 'players': players,
                   't': [round((f - sf) / 10, 2) for f in frames], 'xy': xy, 'ballY': round(by, 2),
                   'handoff': at('handoff'), 'throw': at('pass_forward'), 'carrier': carrier}
            out.write(json.dumps(row) + '\n'); n += 1
out.close(); print('plays', n)
