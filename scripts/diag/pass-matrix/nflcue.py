"""When does an NFL deep defender over a vertical stem open to run? The cue for CUSHION_BREAK attempt 3 (Defense, C9;
report only). Raw BDB 2025. Pairs as nflturn.py (CB/S 2+ yd over a receiver within 8 yd at 1.0 s after the snap).
Population: dropbacks without play action; PFF families C0/C1 (man) and C2/C3/C4/C6 (zone), pass_forward present.
Help: another DB 3+ yd deeper than him and within 12 yd laterally at 1.0 s (observable; no assignment).
Turn: first frame his facing to the QB exceeds 135 deg, before the release. Reported per family x help:
  turned before the release; at the turn cushion p25/50/75 and closing (receiver vx minus his) p50;
  climbing pairs (receiver > 3 yd/s at the release) not turned: cushion at the release p10/25/50, his facing class.
  python3 -I nflcue.py <bdb dir> [weeks]"""
import sys, math, collections as C
import pandas as pd
bdb = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'pff_passCoverage', 'playAction', 'isDropback'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
FAM = {'Cover-0': 'C0/C1 man', 'Cover-1': 'C0/C1 man', 'Cover-1 Double': 'C0/C1 man', 'Cover-2': 'C2', 'Cover-3': 'C3', 'Cover-3 Seam': 'C3',
       'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3', 'Cover-3 Double Cloud': 'C3', 'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
plays = plays[(plays.isDropback == True) & (plays.playAction == False)]
cov = {(r.gameId, r.playId): FAM.get(r.pff_passCoverage) for r in plays.itertuples() if FAM.get(r.pff_passCoverage)}
DB = {'CB', 'S', 'FS', 'SS', 'DB'}; REC = {'WR', 'TE', 'RB', 'FB'}
R = C.defaultdict(list)
def facing(dk, qk):
    ang = math.degrees(math.atan2(qk.x - dk.x, qk.y - dk.y)) % 360
    return min(abs(dk.o - ang) % 360, 360 - abs(dk.o - ang) % 360)
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(cov))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        snap = ev[ev.isin(['ball_snap', 'snap_direct'])].index; rel = ev[ev == 'pass_forward'].index
        if not len(snap) or not len(rel) or rel[0] - snap[0] < 15: continue
        fs, fr = snap[0], rel[0]; f1 = fs + 10
        P = {n: g2.set_index('frameId') for n, g2 in f.dropna(subset=['nflId']).groupby('nflId')}
        qb = [n for n in P if pos.get(n) == 'QB']; recs = [n for n in P if pos.get(n) in REC]
        if not qb or not recs or fr not in P[qb[0]].index: continue
        Q = P[qb[0]]; dirx = 1 if P[recs[0]].loc[fs].x > Q.loc[fs].x else -1
        dbs = [n for n in P if pos.get(n) in DB and f1 in P[n].index]
        for n in dbs:
            D = P[n]
            if fr not in D.index or fr - 1 not in D.index: continue
            d1 = D.loc[f1]
            cand = [(math.hypot(P[r].loc[f1].x - d1.x, P[r].loc[f1].y - d1.y), r) for r in recs if f1 in P[r].index and fr in P[r].index and fr - 1 in P[r].index]
            cand = [(dd, r) for dd, r in cand if dd < 8 and (d1.x - P[r].loc[f1].x) * dirx > 2]
            if not cand: continue
            Rr = P[min(cand)[1]]
            help_ = any((P[m].loc[f1].x - d1.x) * dirx >= 3 and abs(P[m].loc[f1].y - d1.y) <= 12 for m in dbs if m != n)
            turn = None
            for k in range(fs, fr + 1):
                if k not in D.index or k not in Q.index or k not in Rr.index or k - 1 not in D.index or k - 1 not in Rr.index: continue
                if facing(D.loc[k], Q.loc[k]) > 135:
                    rv = (Rr.loc[k].x - Rr.loc[k - 1].x) / 0.1 * dirx; dv = (D.loc[k].x - D.loc[k - 1].x) / 0.1 * dirx
                    turn = ((D.loc[k].x - Rr.loc[k].x) * dirx, rv - dv); break
            rvr = (Rr.loc[fr].x - Rr.loc[fr - 1].x) / 0.1 * dirx; dvr = (D.loc[fr].x - D.loc[fr - 1].x) / 0.1 * dirx
            a = facing(D.loc[fr], Q.loc[fr])
            R[(cov[(g, p)], 'help' if help_ else 'no help')].append({'turn': turn, 'climb': rvr > 3, 'cush': (D.loc[fr].x - Rr.loc[fr].x) * dirx,
                'closing': rvr - dvr, 'face': 'square' if a <= 45 else 'side-on' if a <= 135 else 'turned'})
    print(f'week {w} done', file=sys.stderr)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
print(f'NFL deep defenders over a receiver at 1.0 s (weeks {weeks}); help = another DB 3+ yd deeper within 12 yd laterally at 1.0 s')
for key in sorted(R):
    V = R[key]; T = [v['turn'] for v in V if v['turn']]
    CL = [v for v in V if v['climb'] and not v['turn']]
    fc = C.Counter(v['face'] for v in CL)
    print(f"  {key[0]:10} {key[1]:8} n {len(V):4}: turned {len(T) / len(V):4.0%}; at the turn cushion p25/50/75 {q([t[0] for t in T], .25):.1f}/{q([t[0] for t in T]):.1f}/{q([t[0] for t in T], .75):.1f}, closing {q([t[1] for t in T]):+.1f}")
    if CL: print(f"  {'':19}climbing, not turned n {len(CL)}: cushion at the release p10/25/50 {q([v['cush'] for v in CL], .1):.1f}/{q([v['cush'] for v in CL], .25):.1f}/{q([v['cush'] for v in CL]):.1f}, closing p50 {q([v['closing'] for v in CL]):+.1f}; "
                 f"below 1 yd {sum(v['cush'] < 1 for v in CL) / len(CL):.0%}; square/side-on {fc['square'] / len(CL):.0%}/{fc['side-on'] / len(CL):.0%}")
