"""When does a deep defender open and run? (Defense, C9 turned-away carry; report only.) Raw BDB 2025.

Population: dropbacks without play action, PFF coverage Cover 2/3/4/6, with pass_forward. Deep defenders: CB/S/FS/SS
2+ yd deeper than a receiver within 8 yd of him at 1.0 s after the snap (his receiver: the nearest such one).
Through the stem (snap to release), each frame: his facing to the QB (orientation against the line to the QB),
his cushion (his depth minus his receiver's, along the offence's direction), the receiver's downfield speed.
Turn: the first frame his facing to the QB exceeds 135 deg (turned away; a hip turn to run).
Reported by family: share turned before the release; cushion and the receiver's closing rate (receiver downfield
speed minus his) at the turn; time from snap to the turn; and, split by the receiver's state at the release
(still climbing over 3 yd/s vs stopped or broken off), the share turned at the release.

  python3 -I nflturn.py <bdb dir> [weeks, default 1,2,3]
"""
import sys, math, collections as C
import pandas as pd

bdb = sys.argv[1]
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'pff_passCoverage', 'playAction', 'isDropback'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
FAM = {'Cover-2': 'C2', 'Cover-3': 'C3', 'Cover-3 Seam': 'C3', 'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3',
       'Cover-3 Double Cloud': 'C3', 'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
plays = plays[(plays.isDropback == True) & (plays.playAction == False)]
cov = {(r.gameId, r.playId): FAM.get(r.pff_passCoverage) for r in plays.itertuples() if FAM.get(r.pff_passCoverage)}
DB = {'CB', 'S', 'FS', 'SS', 'DB'}; REC = {'WR', 'TE', 'RB', 'FB'}
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
R = C.defaultdict(list)
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(cov.keys()))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        snap = ev[ev.isin(['ball_snap', 'snap_direct'])].index; rel = ev[ev == 'pass_forward'].index
        if not len(snap) or not len(rel) or rel[0] - snap[0] < 15: continue
        fs, fr = snap[0], rel[0]
        P = {n: g2.set_index('frameId') for n, g2 in f.dropna(subset=['nflId']).groupby('nflId')}
        qb = [n for n in P if pos.get(n) == 'QB']
        if not qb or fr not in P[qb[0]].index: continue
        Q = P[qb[0]]
        recs = [n for n in P if pos.get(n) in REC]
        f1 = fs + 10
        # offence direction: from the QB at the snap toward the line
        dirx = 1 if P[recs[0]].loc[fs].x > Q.loc[fs].x else -1 if recs else 1
        for n in P:
            if pos.get(n) not in DB or f1 not in P[n].index or fr not in P[n].index: continue
            D = P[n]; d1 = D.loc[f1]
            cand = [(math.hypot(P[r].loc[f1].x - d1.x, P[r].loc[f1].y - d1.y), r) for r in recs if f1 in P[r].index and fr in P[r].index]
            cand = [(dd, r) for dd, r in cand if dd < 8 and (d1.x - P[r].loc[f1].x) * dirx > 2]
            if not cand: continue
            r = min(cand)[1]; Rr = P[r]
            turn = None
            for k in range(fs, fr + 1):
                if k not in D.index or k not in Q.index or k not in Rr.index: continue
                dk, qk = D.loc[k], Q.loc[k]
                ang = math.degrees(math.atan2(qk.x - dk.x, qk.y - dk.y)) % 360
                a = min(abs(dk.o - ang) % 360, 360 - abs(dk.o - ang) % 360)
                if a > 135:
                    if k - 1 in D.index and k - 1 in Rr.index:
                        rv = (Rr.loc[k].x - Rr.loc[k - 1].x) / 0.1 * dirx; dv = (D.loc[k].x - D.loc[k - 1].x) / 0.1 * dirx
                        turn = ((k - fs) * 0.1, (dk.x - Rr.loc[k].x) * dirx, rv - dv, rv)
                    break
            rvr = (Rr.loc[fr].x - Rr.loc[fr - 1].x) / 0.1 * dirx if fr - 1 in Rr.index else 0
            k15 = fs + 15
            stem = (Rr.loc[k15].x - Rr.loc[k15 - 1].x) / 0.1 * dirx if k15 in Rr.index and k15 - 1 in Rr.index else None
            dr, qr = D.loc[fr], Q.loc[fr]
            angr = math.degrees(math.atan2(qr.x - dr.x, qr.y - dr.y)) % 360
            facer = min(abs(dr.o - angr) % 360, 360 - abs(dr.o - angr) % 360)
            dspd = math.hypot(D.loc[fr].x - D.loc[fr - 1].x, D.loc[fr].y - D.loc[fr - 1].y) / 0.1 if fr - 1 in D.index else None
            R[cov[(g, p)]].append({'turn': turn, 'climbing': rvr > 3, 'stem': stem, 'faceRel': facer, 'spdRel': dspd})
    print(f'week {w} done', file=sys.stderr)
print('deep defenders (CB/S) over a receiver at 1.0 s after the snap, through the stem (NFL weeks', weeks, ')')
ALL = [v for V in R.values() for v in V]
CL = [v for v in ALL if v['climbing'] and v['spdRel'] is not None]
print(f"  receiver still climbing at the release (n {len(CL)}): the deep defender's facing to the QB and his speed")
for name, lo, hi in (('square (0-45)', 0, 45), ('side-on (45-90)', 45, 90), ('side-on (90-135)', 90, 135), ('turned away (135+)', 135, 181)):
    B = [v for v in CL if lo <= v['faceRel'] < hi]
    if B: print(f"    {name:20} {len(B) / len(CL):4.0%}  speed p50 {sorted(v['spdRel'] for v in B)[len(B) // 2]:.1f} yd/s, faster than 5 yd/s {sum(v['spdRel'] > 5 for v in B) / len(B):3.0%}")
for lo, hi in ((-9, 5), (5, 6), (6, 7), (7, 99)):
    B = [v for v in ALL if v['stem'] is not None and lo <= v['stem'] < hi]
    if B: print(f"  receiver stem speed at 1.5 s {lo}-{hi} yd/s: n {len(B)} ({len(B) / len(ALL):.0%}), turned before the release {sum(1 for v in B if v['turn']) / len(B):.0%}")
for fam in ('C2', 'C3', 'C4', 'C6'):
    V = R[fam]
    if not V: continue
    T = [v['turn'] for v in V if v['turn']]
    clim = [v for v in V if v['climbing']]; stop = [v for v in V if not v['climbing']]
    print(f"  {fam} n {len(V):4}: turned before the release {len(T) / len(V):3.0%}; at the turn: cushion p25/50/75 {q([t[1] for t in T], .25):.1f}/{q([t[1] for t in T]):.1f}/{q([t[2] for t in T], .75) if False else q([t[1] for t in T], .75):.1f} yd, "
          f"closing {q([t[2] for t in T]):+.1f} yd/s, receiver {q([t[3] for t in T]):.1f} yd/s, {q([t[0] for t in T]):.1f} s after the snap")
    print(f"       receiver still climbing at the release: n {len(clim)}, turned {sum(1 for v in clim if v['turn']) / max(1, len(clim)):3.0%}; stopped or broken off: n {len(stop)}, turned {sum(1 for v in stop if v['turn']) / max(1, len(stop)):3.0%}")
