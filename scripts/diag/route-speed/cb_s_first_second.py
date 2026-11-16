"""The deep man's first second, split by seat (Defense's request for #125): zone families, a CB or S at least 2 yd deeper than a receiver within 8 yd of him at 1.0 s,
that receiver climbing over 3 yd/s at 1.5 s (the pairs of nflcarry_split.py; GO_NO_HELP=1 adds its go-route and no-help conditions). Raw BDB 2025.
For each seat (CB, S) and for CBs by coverage family (Cover-3 family, Quarters, Cover-2, Cover-6): the defender's speed at 0.25, 0.5, 0.75 and 1.0 s after the snap
(10 Hz; speed at a frame is the centred difference over +-0.1 s, 0.25 / 0.75 s the mean of the two frames about them), the time his speed first reaches 1 yd/s, and his torso
angle off the line to the QB at 0.5 and 1.0 s (0 = facing the QB, 180 = back to him).  Medians with p25/p75; n = defenders (one per play per defender).
    python3 -I cb_s_first_second.py <bdb dir> [weeks]"""
import sys, math, collections as C
import pandas as pd
import os
GO = os.environ.get('GO_NO_HELP') == '1'  # nflcarry_split.py's pairs exactly: the receiver ran a GO route and no other DB is 3+ yd deeper than the defender within 12 yd laterally at 1.0 s
bdb = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3,4,5,6,7,8,9').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'pff_passCoverage', 'playAction', 'isDropback'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
FAM = {'Cover-2': 'Cover-2', 'Cover-3': 'Cover-3 family', 'Cover-3 Seam': 'Cover-3 family', 'Cover-3 Cloud Left': 'Cover-3 family', 'Cover-3 Cloud Right': 'Cover-3 family',
       'Cover-3 Double Cloud': 'Cover-3 family', 'Quarters': 'Quarters', 'Cover 6-Left': 'Cover-6', 'Cover-6 Right': 'Cover-6'}
plays = plays[(plays.isDropback == True) & (plays.playAction == False) & plays.pff_passCoverage.isin(FAM)]
fam = {(r.gameId, r.playId): FAM[r.pff_passCoverage] for r in plays.itertuples()}
pp = pd.read_csv(f'{bdb}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'routeRan']) if GO else None
route = {(r.gameId, r.playId, r.nflId): str(r.routeRan).upper() for r in pp.itertuples()} if GO else {}
DB = {'CB', 'S', 'FS', 'SS', 'DB'}; REC = {'WR', 'TE', 'RB', 'FB'}
R = C.defaultdict(list)
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(fam))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        snap = ev[ev.isin(['ball_snap', 'snap_direct'])].index
        if not len(snap): continue
        fs = snap[0]; f1 = fs + 10; k15 = fs + 15
        P = {n: g2.set_index('frameId') for n, g2 in f.dropna(subset=['nflId']).groupby('nflId')}
        qb = [n for n in P if pos.get(n) == 'QB']; recs = [n for n in P if pos.get(n) in REC]; dbs = [n for n in P if pos.get(n) in DB and f1 in P[n].index]
        if not qb or not recs: continue
        Q = P[qb[0]]; dirx = 1 if P[recs[0]].loc[fs].x > Q.loc[fs].x else -1
        for n in dbs:
            D = P[n]; d1 = D.loc[f1]
            cand = [(math.hypot(P[r].loc[f1].x - d1.x, P[r].loc[f1].y - d1.y), r) for r in recs if f1 in P[r].index]
            cand = [(dd, r) for dd, r in cand if dd < 8 and (d1.x - P[r].loc[f1].x) * dirx > 2]
            if not cand: continue
            rn = min(cand)[1]; Rr = P[rn]
            if GO and (route.get((g, p, rn), '') != 'GO' or any((P[m].loc[f1].x - d1.x) * dirx >= 3 and abs(P[m].loc[f1].y - d1.y) <= 12 for m in dbs if m != n)): continue
            if k15 not in Rr.index or k15 - 1 not in Rr.index or (Rr.loc[k15].x - Rr.loc[k15 - 1].x) / 0.1 * dirx <= 3: continue
            def spd(k):
                if k - 1 not in D.index or k + 1 not in D.index: return None
                a, b = D.loc[k - 1], D.loc[k + 1]; return math.hypot(b.x - a.x, b.y - a.y) / 0.2
            def ang(k):
                if k not in D.index or k not in Q.index: return None
                a = math.degrees(math.atan2(Q.loc[k].x - D.loc[k].x, Q.loc[k].y - D.loc[k].y)) % 360; o = D.loc[k].o
                return min(abs(o - a) % 360, 360 - abs(o - a) % 360)
            s = {k: spd(fs + k) for k in range(1, 12)}
            if any(s[k] is None for k in (2, 3, 5, 7, 8, 10)): continue
            first = next((k for k in range(1, 12) if s[k] is not None and s[k] >= 1.0), None)
            row = dict(s25=(s[2] + s[3]) / 2, s50=s[5], s75=(s[7] + s[8]) / 2, s100=s[10], t1=None if first is None else first / 10, a50=ang(fs + 5), a100=ang(fs + 10))
            seat = 'CB' if pos[n] == 'CB' else 'S'
            R[seat].append(row)
            if seat == 'CB': R['CB ' + fam[(g, p)]].append(row)
    print(f'week {w} done', file=sys.stderr)
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
print('NFL zone families, defender 2+ yd deeper than a receiver within 8 yd at 1.0 s, receiver climbing over 3 yd/s at 1.5 s (weeks %s); medians (p25-p75)' % weeks)
print(f"{'seat / family':22} {'n':>5} | speed yd/s at 0.25 s   0.5 s   0.75 s   1.0 s | time to 1 yd/s (s) | torso off QB at 0.5 s / 1.0 s")
for k in ['CB', 'S', 'CB Cover-3 family', 'CB Quarters', 'CB Cover-2', 'CB Cover-6']:
    v = R.get(k, [])
    if not v: continue
    c = lambda key: f"{q([r[key] for r in v], .5):4.1f} ({q([r[key] for r in v], .25):3.1f}-{q([r[key] for r in v], .75):3.1f})"
    print(f"{k:22} {len(v):5} | {c('s25')} {c('s50')} {c('s75')} {c('s100')} | {q([r['t1'] for r in v], .5):4.2f} ({q([r['t1'] for r in v], .25):.2f}-{q([r['t1'] for r in v], .75):.2f}) | {q([r['a50'] for r in v], .5):4.0f} / {q([r['a100'] for r in v], .5):4.0f}")
