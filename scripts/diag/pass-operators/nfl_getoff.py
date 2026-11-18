"""Pass-rush get-off and pressure in the NFL (Integration, 2026-11-17, from a public chart: 'Pass-Rush Get-Off vs Pressure
Rate', about +1.25 pressure points per 0.1 s faster for edges and +1.15 for DTs, mean get-off 0.87 / 1.06 s, one dot per
player-game with 10+ rushes; definition unconfirmed). BDB 2025 player_play carries NGS getOffTimeAsPassRusher and
causedPressure. Reports, for initial pass rushers on dropbacks, by position group (edge: DE / OLB; interior: DT / NT):
  - NGS get-off: mean, p10 / p50 / p90, the spread across player-games (sd of player-game means, 10+ rushes) and within
    one player across snaps (mean per-player sd);
  - the per-player-game slope of pressure rate (causedPressure) on mean get-off, points per 0.1 s (OLS), and the corr;
  - on tracking weeks (argv weeks, default 1), our operator: snap to crossing the line of scrimmage (the first frame his
    x is at or past the ball's snap x) and snap to first movement (0.2 yd from his snap spot), against NGS on the same
    rushes (median difference, corr), to check what NGS get-off measures.
Association across player-games, not a causal slope. Raw data stays in data/raw (ignored).
usage: python3 -I scripts/diag/pass-operators/nfl_getoff.py [weeks=1]"""
import os, sys
import numpy as np, pandas as pd
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
D = os.path.join(ROOT, 'data', 'raw', 'bdb2025', 'big-data-bowl-data')
weeks = [int(w) for w in (sys.argv[1] if len(sys.argv) > 1 else '1').split(',')]
plays = pd.read_csv(os.path.join(D, 'plays.csv'), usecols=['gameId', 'playId', 'isDropback'])
pp = pd.read_csv(os.path.join(D, 'player_play.csv'), usecols=['gameId', 'playId', 'nflId', 'wasInitialPassRusher', 'causedPressure', 'getOffTimeAsPassRusher'])
pos = pd.read_csv(os.path.join(D, 'players.csv'), usecols=['nflId', 'position'])
x = pp.merge(plays, on=['gameId', 'playId']).merge(pos, on='nflId')
x = x[(x.isDropback == True) & (x.wasInitialPassRusher == 1)]
x['grp'] = np.where(x.position.isin(['DE', 'OLB']), 'edge', np.where(x.position.isin(['DT', 'NT']), 'interior', None))
x = x[x.grp.notna() & x.getOffTimeAsPassRusher.notna()]
x['pr'] = x.causedPressure.astype(float)
for g in ('edge', 'interior'):
    X = x[x.grp == g]; go = X.getOffTimeAsPassRusher
    pg = X.groupby(['gameId', 'nflId']).agg(n=('pr', 'size'), go=('getOffTimeAsPassRusher', 'mean'), pr=('pr', 'mean')).reset_index()
    pg = pg[pg.n >= 10]
    within = X.groupby('nflId').getOffTimeAsPassRusher.std().dropna()
    b = np.polyfit(pg.go, 100 * pg.pr, 1)[0] / 10 if len(pg) > 2 else float('nan')
    print(f"NFL {g}: rushes {len(X)}, NGS get-off mean {go.mean():.2f} s, p10 / p50 / p90 {go.quantile(.1):.2f} / {go.median():.2f} / {go.quantile(.9):.2f} | pressure {100*X.pr.mean():.1f}%")
    print(f"  player-games 10+ rushes: {len(pg)}, sd of their mean get-off {pg.go.std():.3f} s; within one player across snaps sd p50 {within.median():.3f} s | pressure on get-off: {-b:+.2f} pts per 0.1 s faster, corr {np.corrcoef(pg.go, pg.pr)[0,1]:+.2f}")
# Our operator on the tracking, against NGS on the same rushes.
keep = x.set_index(['gameId', 'playId', 'nflId'])
res = []
for w in weeks:
    for ch in pd.read_csv(os.path.join(D, f'tracking_week_{w}.csv'), usecols=['gameId', 'playId', 'nflId', 'frameId', 'frameType', 'event', 'x', 'y', 'playDirection', 'club'], chunksize=3_000_000):
        ch = ch[ch.frameType != 'BEFORE_SNAP']
        for (gid, pid), P in ch.groupby(['gameId', 'playId']):
            ball = P[P.club == 'football']
            if not len(ball): continue
            f0 = P.frameId.min(); bx = ball[ball.frameId == f0].x
            if not len(bx): continue
            bx = float(bx.iloc[0]); sgn = 1 if P.playDirection.iloc[0] == 'right' else -1   # offence attacks +x when right
            for nid, Q in P[P.nflId.notna()].groupby('nflId'):
                k = (gid, pid, nid)
                if k not in keep.index: continue
                Q = Q.sort_values('frameId'); t = (Q.frameId.values - f0) / 10.0; px = (Q.x.values - bx) * sgn; py = Q.y.values
                cross = t[np.argmax(px <= 0)] if (px <= 0).any() and px[0] > 0 else np.nan
                mv = np.hypot(px - px[0], py - py[0]); move = t[np.argmax(mv >= 0.2)] if (mv >= 0.2).any() else np.nan
                r = keep.loc[k]; r = r.iloc[0] if isinstance(r, pd.DataFrame) else r
                res.append((r.grp, r.getOffTimeAsPassRusher, cross, move))
R = pd.DataFrame(res, columns=['grp', 'ngs', 'cross', 'move'])
for g in ('edge', 'interior'):
    Z = R[(R.grp == g) & R.cross.notna()]
    print(f"NFL {g}, weeks {weeks}: {len(Z)} rushes with a crossing | ours: crossing p50 {Z.cross.median():.2f} s, first movement p50 {R[R.grp == g].move.median():.2f} s | NGS on the same p50 {Z.ngs.median():.2f} s; crossing - NGS p50 {(Z.cross - Z.ngs).median():+.2f} s, corr {np.corrcoef(Z.cross, Z.ngs)[0,1]:.2f}; within 0.1 s {100*((Z.cross - Z.ngs).abs() <= 0.1).mean():.0f}%")
