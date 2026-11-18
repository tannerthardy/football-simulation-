"""Corner turn on a vertical (Coverage, 2026-11-18): does the corner over a #1 who runs GO open and run, man vs zone,
press vs off? NFL BDB 2025 weeks 1-3. Per corner (CB) whose nearest wide receiver at the snap runs GO: every 0.1 s to
3.0 s, his facing relative to his own travel (deg; 0 = running forward, 180 = backpedal), his facing relative to the
QB (cosine; 1 = squared to the QB), his speed, the receiver's speed and the cushion (receiver's depth minus his).
Press = within 2.5 yd of the receiver at the snap. Writes a per-frame JSON (keep it out of git)."""
import sys, json, math
import pandas as pd
D, OUT = sys.argv[1], sys.argv[2]
pos = pd.read_csv(f'{D}/players.csv', usecols=['nflId', 'position']).set_index('nflId').position.to_dict()
pp = pd.read_csv(f'{D}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'routeRan'])
go = pp[pp.routeRan == 'GO']
plays = pd.read_csv(f'{D}/plays.csv', usecols=['gameId', 'playId', 'pff_manZone', 'pff_passCoverage'])
keys = set(map(tuple, go[['gameId', 'playId']].values))
rows = []
for wk in (1, 2, 3):
    for ch in pd.read_csv(f'{D}/tracking_week_{wk}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'playDirection', 'x', 'y', 's', 'o', 'dir', 'event'], chunksize=2_000_000):
        ch = ch[[k in keys for k in zip(ch.gameId, ch.playId)]]
        if len(ch): rows.append(ch)
    print('week', wk, file=sys.stderr)
tr = pd.concat(rows)
cov = plays.set_index(['gameId', 'playId'])
res = []
def ang(a):  # BDB: 0 = +y, 90 = +x  -> radians in x/y frame
    r = math.radians(a); return math.sin(r), math.cos(r)
for (g, p), f in tr.groupby(['gameId', 'playId']):
    snapf = f[f.event == 'ball_snap'].frameId
    if snapf.empty or (g, p) not in cov.index: continue
    snap = int(snapf.iloc[0]); mz = cov.loc[(g, p)].pff_manZone; cv = cov.loc[(g, p)].pff_passCoverage
    if mz not in ('Man', 'Zone'): continue
    flip = f.playDirection.iloc[0] == 'left'
    at = f[(f.frameId == snap) & f.nflId.notna()]
    gos = go[(go.gameId == g) & (go.playId == p)].nflId.values
    off_club = at[at.nflId.isin(gos)].club
    if off_club.empty: continue
    off_club = off_club.iloc[0]
    qb = [n for n in at[at.club == off_club].nflId if pos.get(n) == 'QB']
    cbs = [n for n in at[at.club != off_club].nflId if pos.get(n) == 'CB']
    wrs = [n for n in at[at.club == off_club].nflId if pos.get(n) == 'WR']
    if not qb: continue
    trk = {n: d.sort_values('frameId') for n, d in f[f.nflId.isin(cbs + wrs + qb)].groupby('nflId')}
    def series(n):
        d = trk[n]; d = d[(d.frameId >= snap) & (d.frameId <= snap + 30)]
        if len(d) < 31: return None
        x = d.x.values.copy(); y = d.y.values.copy(); o = d.o.values.copy(); di = d.dir.values.copy()
        if flip: x = 120 - x; y = 53.3 - y; o = (o + 180) % 360; di = (di + 180) % 360
        return x, y, o, di, d.s.values
    Q = series(qb[0])
    if Q is None: continue
    for cb in cbs:
        C = series(cb)
        if C is None: continue
        near = min(wrs, key=lambda w: math.hypot(trk[w][trk[w].frameId == snap].x.values[0] - trk[cb][trk[cb].frameId == snap].x.values[0], trk[w][trk[w].frameId == snap].y.values[0] - trk[cb][trk[cb].frameId == snap].y.values[0]) if len(trk[w][trk[w].frameId == snap]) and len(trk[cb][trk[cb].frameId == snap]) else 99, default=None)
        if near is None or near not in gos: continue
        W = series(near)
        if W is None: continue
        d0 = math.hypot(W[0][0] - C[0][0], W[1][0] - C[1][0])
        if d0 > 12: continue
        ser = []
        for k in range(0, 31):
            ox, oy = ang(C[2][k]); dx, dy = ang(C[3][k])
            rel = math.degrees(math.acos(max(-1, min(1, ox * dx + oy * dy))))
            qx, qy = Q[0][k] - C[0][k], Q[1][k] - C[1][k]; qd = math.hypot(qx, qy) or 1
            ser.append({'t': round(k * 0.1, 1), 'face_vs_travel': round(rel, 1), 'face_qb': round((ox * qx + oy * qy) / qd, 2),
                        's': round(float(C[4][k]), 2), 'wr_s': round(float(W[4][k]), 2), 'cushion': round(C[0][k] - W[0][k], 2)})
        res.append({'g': int(g), 'p': int(p), 'mz': mz, 'cov': cv, 'press': d0 < 2.5, 'd0': round(d0, 1), 'series': ser})
json.dump(res, open(OUT, 'w')); print(len(res), 'corners', file=sys.stderr)
