"""#1's stop depth by route (BDB 2025, 2022 weeks 1-3): Defense's quarters-corner "#1 stops" operator, split by PFF routeRan.

#1: the outermost route runner on each side of the ball at the snap (wasRunningRoute). A stop is the first time in
0-3.5 s after the snap that he, having climbed over 3 yd/s downfield, drops under 1 yd/s downfield; its depth is his
x past the line (yd). Also whether the stop came before the pass_forward. Dropbacks only.

  python3 -I scripts/diag/routes/nfl_one_stops.py <bdb2025 dir> [weeks] [rows.csv]
"""
import sys, collections
import pandas as pd

root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = pd.read_csv(f'{root}/plays.csv', usecols=['gameId', 'playId', 'absoluteYardlineNumber', 'isDropback', 'playAction', 'pff_manZone'])
plays = plays[plays.isDropback == True]
pp = pd.read_csv(f'{root}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'wasRunningRoute', 'routeRan'])
pp = pp[pp.wasRunningRoute == 1].merge(plays, on=['gameId', 'playId'])
rows = []
for w in weeks:
    tr = pd.read_csv(f'{root}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'playDirection', 'x', 'y', 'event', 'club'])
    ball = tr[tr.club == 'football']
    snaps = tr[tr.event == 'ball_snap'].groupby(['gameId', 'playId']).frameId.min().rename('snapF')
    fwd = tr[tr.event == 'pass_forward'].groupby(['gameId', 'playId']).frameId.min().rename('fwdF')
    bsnap = ball.merge(snaps.reset_index(), on=['gameId', 'playId']); bsnap = bsnap[bsnap.frameId == bsnap.snapF][['gameId', 'playId', 'y']].rename(columns={'y': 'ballY'})
    t = tr.merge(pp[['gameId', 'playId', 'nflId', 'routeRan', 'absoluteYardlineNumber', 'playAction', 'pff_manZone']], on=['gameId', 'playId', 'nflId'])
    t = t.merge(snaps.reset_index(), on=['gameId', 'playId']).merge(fwd.reset_index(), on=['gameId', 'playId'], how='left').merge(bsnap, on=['gameId', 'playId'])
    t = t[(t.frameId >= t.snapF) & (t.frameId <= t.snapF + 35)].sort_values(['gameId', 'playId', 'nflId', 'frameId'])
    for (g, p), play in t.groupby(['gameId', 'playId']):
        at = play[play.frameId == play.snapF.iloc[0]]
        if at.empty: continue
        by = play.ballY.iloc[0]
        for side in (1, -1):
            s = at[(at.y - by) * side > 0]
            if s.empty: continue
            one = s.loc[((s.y - by) * side).idxmax()]
            pl = play[play.nflId == one.nflId]
            d = 1 if pl.playDirection.iloc[0] == 'right' else -1
            los = pl.absoluteYardlineNumber.iloc[0]
            xs = pl.x.values; vx = (xs[1:] - xs[:-1]) * 10 * d
            climbed = False; stop = None
            for i, v in enumerate(vx):
                if v > 3: climbed = True
                elif climbed and v < 1: stop = i + 1; break
            fw = pl.fwdF.iloc[0]
            rows.append({'route': one.routeRan, 'pa': bool(pl.playAction.iloc[0]), 'mz': pl.pff_manZone.iloc[0],
                         'stop': stop is not None, 't': stop / 10 if stop else None, 'depth': (xs[stop] - los) * d if stop else None,
                         'beforeThrow': (stop is not None and (pd.isna(fw) or pl.frameId.values[stop] <= fw))})
    print(f'weeks to {w}: {len(rows)} #1s', file=sys.stderr)
df = pd.DataFrame(rows)
if len(sys.argv) > 3: df.to_csv(sys.argv[3], index=False)
st = df[df.stop]
bins = pd.cut(st.depth, [-99, 5, 9, 99], labels=['<=5', '5-9', '9+'])
print(f'#1s {len(df)}; stop share {df.stop.mean():.1%}; stop t/depth p50 {st.t.median():.1f} s / {st.depth.median():.1f} yd; before the throw {st.beforeThrow.mean():.0%}')
print('depth mix', (bins.value_counts(normalize=True).round(3) * 100).to_dict())
print('\nroute       #1s  stop%  stops  depth p25/p50/p75   t p50   <=5 / 5-9 / 9+ (share of the route\'s stops)')
for r, g in df.groupby('route'):
    s = g[g.stop]
    if len(g) < 30: continue
    b = pd.cut(s.depth, [-99, 5, 9, 99], labels=['a', 'b', 'c']).value_counts(normalize=True)
    q = s.depth.quantile([.25, .5, .75]).round(1).tolist() if len(s) else [None] * 3
    print(f'{r:10s} {len(g):5d} {g.stop.mean():5.0%} {len(s):6d}   {q}   {s.t.median() if len(s) else float("nan"):4.1f}   {b.get("a", 0):.0%} / {b.get("b", 0):.0%} / {b.get("c", 0):.0%}')
print('\nshare of all stops by route and bin:')
print((pd.crosstab(st.route, bins, normalize='all') * 100).round(1).to_string())
