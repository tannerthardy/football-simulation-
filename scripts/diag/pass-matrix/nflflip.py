"""How fast does a deep defender open from side-on to running? (Defense, C9; report only.) Raw BDB 2025.
Pairs as nflcue.py (CB/S 2+ yd over a receiver within 8 yd at 1.0 s after the snap), dropbacks without play action,
zone and man families. Facing off downfield: the angle between his orientation and the offence's direction.
Flip: from the last frame he is side-on (70-110 deg off downfield) to the first later frame he runs with it (under
30 deg), from the snap to 0.5 s after the release; flips longer than 1.5 s are not counted. Reported: flip time
p25/50/75, his speed at the start of the flip, and the mean turn rate (deg/s).
  python3 -I nflflip.py <bdb dir> [weeks]"""
import sys, math, collections as C
import pandas as pd
bdb = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'pff_passCoverage', 'playAction', 'isDropback'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
MAN = {'Cover-0', 'Cover-1', 'Cover-1 Double', '2-Man'}
ZONE = {'Cover-2', 'Cover-3', 'Cover-3 Seam', 'Cover-3 Cloud Left', 'Cover-3 Cloud Right', 'Cover-3 Double Cloud', 'Quarters', 'Cover 6-Left', 'Cover-6 Right'}
plays = plays[(plays.isDropback == True) & (plays.playAction == False)]
cov = {(r.gameId, r.playId): ('man' if r.pff_passCoverage in MAN else 'zone') for r in plays.itertuples() if r.pff_passCoverage in MAN | ZONE}
DB = {'CB', 'S', 'FS', 'SS', 'DB'}; REC = {'WR', 'TE', 'RB', 'FB'}
R = C.defaultdict(list)
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(cov))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        snap = ev[ev.isin(['ball_snap', 'snap_direct'])].index; rel = ev[ev == 'pass_forward'].index
        if not len(snap) or not len(rel): continue
        fs, fr = snap[0], rel[0]; f1 = fs + 10
        P = {n: g2.set_index('frameId') for n, g2 in f.dropna(subset=['nflId']).groupby('nflId')}
        qb = [n for n in P if pos.get(n) == 'QB']; recs = [n for n in P if pos.get(n) in REC]
        if not qb or not recs: continue
        Q = P[qb[0]]; dirx = 1 if P[recs[0]].loc[fs].x > Q.loc[fs].x else -1
        down = 90 if dirx == 1 else 270  # BDB orientation: 90 deg faces +x
        for n in P:
            if pos.get(n) not in DB or f1 not in P[n].index: continue
            D = P[n]; d1 = D.loc[f1]
            if not any(f1 in P[r].index and math.hypot(P[r].loc[f1].x - d1.x, P[r].loc[f1].y - d1.y) < 8 and (d1.x - P[r].loc[f1].x) * dirx > 2 for r in recs): continue
            last_side = None
            for k in range(fs, fr + 6):
                if k not in D.index or k - 1 not in D.index: continue
                off = min(abs(D.loc[k].o - down) % 360, 360 - abs(D.loc[k].o - down) % 360)
                if 70 <= off <= 110: last_side = k
                elif off < 30 and last_side is not None:
                    dt = (k - last_side) * 0.1
                    if dt <= 1.5:
                        sp = math.hypot(D.loc[last_side].x - D.loc[last_side - 1].x, D.loc[last_side].y - D.loc[last_side - 1].y) / 0.1 if last_side - 1 in D.index else float('nan')
                        R[cov[(g, p)]].append((dt, sp))
                    break
    print(f'week {w} done', file=sys.stderr)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for k, V in R.items():
    T = [v[0] for v in V]
    print(f"NFL {k}: flips from side-on to running n {len(V)}: time p25/50/75 {q(T, .25):.2f}/{q(T):.2f}/{q(T, .75):.2f} s, speed at side-on p50 {q([v[1] for v in V]):.1f} yd/s, mean rate over 60+ deg {60 / q(T):.0f}-{90 / q(T):.0f} deg/s")
