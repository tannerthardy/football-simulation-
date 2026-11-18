"""#1 slant vs go (Coverage, 2026-11-18): how early do his first steps and hips separate them? NFL BDB 2025 weeks 1-3.
Per route: from the snap, every 0.1 s to 1.5 s: inside angle of his path (deg off upfield, + = toward the ball),
inside angle of his orientation `o`, depth past the LOS, inside lateral displacement. Writes a per-frame JSON (keep it out of git; slant_go_sep.py reads it).
usage: python3 -I scripts/mechanics/slant_go.py BDB_2025_DIR OUT.json"""
import sys, json, math
import pandas as pd
D = sys.argv[1]; OUT = sys.argv[2]
pp = pd.read_csv(f'{D}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'routeRan'])
pp = pp[pp.routeRan.isin(['SLANT', 'GO'])]
plays = pd.read_csv(f'{D}/plays.csv', usecols=['gameId', 'playId', 'absoluteYardlineNumber'])
rows = []
for wk in (1, 2, 3):
    keys = set(map(tuple, pp[['gameId', 'playId']].values))
    for ch in pd.read_csv(f'{D}/tracking_week_{wk}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'frameType', 'club', 'playDirection', 'x', 'y', 's', 'o', 'dir', 'event'], chunksize=2_000_000):
        ch = ch[[k in keys for k in zip(ch.gameId, ch.playId)]]
        if len(ch): rows.append(ch)
    print('week', wk, file=sys.stderr)
tr = pd.concat(rows)
res = []
for (g, p), f in tr.groupby(['gameId', 'playId']):
    snapf = f[f.event == 'ball_snap'].frameId
    if snapf.empty: continue
    snap = int(snapf.iloc[0])
    ball = f[f.nflId.isna() & (f.frameId == snap)]
    if ball.empty: continue
    flip = f.playDirection.iloc[0] == 'left'
    bx, by = float(ball.x.iloc[0]), float(ball.y.iloc[0])
    if flip: bx, by = 120 - bx, 53.3 - by
    at = f[(f.frameId == snap) & f.nflId.notna()].copy()
    if flip: at['x'] = 120 - at.x; at['y'] = 53.3 - at.y
    rr = pp[(pp.gameId == g) & (pp.playId == p)]
    off_club = f[f.nflId.isin(rr.nflId)].club.iloc[0] if len(f[f.nflId.isin(rr.nflId)]) else None
    offense = at[at.club == off_club]
    for _, r in rr.iterrows():
        me = at[at.nflId == r.nflId]
        if me.empty: continue
        my = float(me.y.iloc[0]); side = 1 if my > by else -1
        # #1: no teammate wider on his side (more than 0.5 yd)
        if ((offense.y - by) * side > (my - by) * side + 0.5).any(): continue
        if abs(my - by) < 6: continue  # a real wide alignment
        tk = f[(f.nflId == r.nflId) & (f.frameId >= snap) & (f.frameId <= snap + 15)].sort_values('frameId')
        if len(tk) < 16: continue
        x = tk.x.values.copy(); y = tk.y.values.copy(); o = tk.o.values.copy(); d = tk.dir.values.copy()
        if flip: x = 120 - x; y = 53.3 - y; o = (o + 180) % 360; d = (d + 180) % 360
        inward = -side  # sign of y toward the ball
        series = []
        for k in range(0, 16):
            # BDB angles: 0 = +y, 90 = +x (clockwise from north). Upfield is +x after flip.
            def inside(ang):
                ux, uy = math.sin(math.radians(ang)), math.cos(math.radians(ang))
                return math.degrees(math.atan2(uy * inward, ux))
            series.append({'t': round(k * 0.1, 1), 'depth': round(x[k] - bx, 2), 'lat_in': round((y[k] - y[0]) * inward, 2),
                           'path_in': round(inside(d[k]), 1), 'hips_in': round(inside(o[k]), 1), 's': round(float(tk.s.values[k]), 2)})
        res.append({'g': int(g), 'p': int(p), 'route': r.routeRan, 'split': round(abs(my - by), 1), 'series': series})
json.dump(res, open(OUT, 'w'))
print(len(res), 'routes', file=sys.stderr)
