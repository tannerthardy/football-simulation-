"""NFL facing at the release for zone deep defenders over the catch point, and interceptions by facing (Defense, C9;
report only). Raw BDB 2025 tracking (orientation `o` is not in the common play format).

Population: dropbacks without play action, PFF coverage Cover 2/3/4/6 families, a targeted receiver, with the
pass_forward and pass_arrived (or outcome) events. Defenders (not DL) 3-8 yd from the catch point (the target at
arrival) at the release and 2+ yd deeper than it. Facing: the angle between his orientation and the line to the QB
at the release (BDB angles: degrees clockwise from +y). Square = within 45 deg, side-on = 45-135, turned away = 135+.
For each class: n, his speed and his speed toward the catch point at +0.4 s.
Interceptions: the intercepting defender's facing to the QB at the release, all coverages.

  python3 -I nflfacing.py <bdb dir> [weeks, default 1,2,3]
"""
import sys, math, collections as C
import pandas as pd

bdb = sys.argv[1]
weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = pd.read_csv(f'{bdb}/plays.csv', usecols=['gameId', 'playId', 'passResult', 'pff_passCoverage', 'playAction', 'isDropback'])
pp = pd.read_csv(f'{bdb}/player_play.csv', usecols=['gameId', 'playId', 'nflId', 'wasTargettedReceiver', 'hadInterception'])
pos = pd.read_csv(f'{bdb}/players.csv', usecols=['nflId', 'position']).set_index('nflId')['position'].to_dict()
FAM = {'Cover-2': 'C2', 'Cover-3': 'C3', 'Cover-3 Seam': 'C3', 'Cover-3 Cloud Left': 'C3', 'Cover-3 Cloud Right': 'C3',
       'Cover-3 Double Cloud': 'C3', 'Quarters': 'C4', 'Cover 6-Left': 'C6', 'Cover-6 Right': 'C6'}
plays = plays[(plays.isDropback == True) & (plays.playAction == False)]
cov = {(r.gameId, r.playId): FAM.get(r.pff_passCoverage) for r in plays.itertuples()}
tgt = {(r.gameId, r.playId): r.nflId for r in pp[pp.wasTargettedReceiver == 1].itertuples()}
ints = {(r.gameId, r.playId): r.nflId for r in pp[pp.hadInterception == 1].itertuples()}
DL = {'DE', 'DT', 'NT'}
cls = lambda a: 'square' if a <= 45 else 'side-on' if a <= 135 else 'turned away'
R = C.defaultdict(list); I = C.Counter()
for w in weeks:
    df = pd.read_csv(f'{bdb}/tracking_week_{w}.csv', usecols=['gameId', 'playId', 'nflId', 'frameId', 'club', 'x', 'y', 'o', 'event'])
    df = df[df.set_index(['gameId', 'playId']).index.isin(list(cov.keys()))]
    for (g, p), f in df.groupby(['gameId', 'playId']):
        ev = f.dropna(subset=['event']).drop_duplicates('frameId').set_index('frameId')['event']
        rel = ev[ev == 'pass_forward'].index
        arr = ev[ev.isin(['pass_arrived', 'pass_outcome_caught', 'pass_outcome_incomplete', 'pass_outcome_interception'])].index
        if not len(rel) or not len(arr): continue
        fr, fa = rel[0], arr[arr > rel[0]].min() if (arr > rel[0]).any() else None
        if fa is None or pd.isna(fa): continue
        at = f.set_index(['frameId', 'nflId'])
        players = f[f.frameId == fr]
        qb = [n for n in players.nflId.dropna() if pos.get(n) == 'QB']
        if not qb: continue
        q = at.loc[(fr, qb[0])]
        k = (g, p)
        if k in ints and (fr, ints[k]) in at.index:
            d = at.loc[(fr, ints[k])]
            ang = math.degrees(math.atan2(q.x - d.x, q.y - d.y)) % 360
            I[cls(min(abs(d.o - ang) % 360, 360 - abs(d.o - ang) % 360))] += 1
        if cov.get(k) is None or k not in tgt or (fa, tgt[k]) not in at.index: continue
        cp = at.loc[(fa, tgt[k])]
        offclub = at.loc[(fr, tgt[k])].club
        for n in players.nflId.dropna():
            d0 = at.loc[(fr, n)]
            if d0.club == offclub or pos.get(n) in DL or (fr + 4, n) not in at.index: continue
            if not 3 <= math.hypot(d0.x - cp.x, d0.y - cp.y) < 8: continue
            # depth against the catch point, toward the defense's own goal: the offense's direction is from QB to target
            dirx = 1 if cp.x > q.x else -1
            if (d0.x - cp.x) * dirx <= 2: continue
            ang = math.degrees(math.atan2(q.x - d0.x, q.y - d0.y)) % 360
            a = min(abs(d0.o - ang) % 360, 360 - abs(d0.o - ang) % 360)
            d4 = at.loc[(fr + 4, n)]; vx, vy = (d4.x - d0.x) / 0.4, (d4.y - d0.y) / 0.4
            ux, uy = cp.x - d0.x, cp.y - d0.y; L = math.hypot(ux, uy) or 1
            R[(cov[k], cls(a))].append((math.hypot(vx, vy), (vx * ux + vy * uy) / L))
    print(f'week {w} done', file=sys.stderr)
print('zone deep defenders over the catch point, facing to the QB at the release (NFL, weeks', weeks, ')')
for fam in ('C2', 'C3', 'C4', 'C6'):
    tot = sum(len(R[(fam, c)]) for c in ('square', 'side-on', 'turned away'))
    if not tot: continue
    row = []
    for c in ('square', 'side-on', 'turned away'):
        V = R[(fam, c)]
        row.append(f"{c} {len(V) / tot:3.0%} (toward +0.4 s {sum(v[1] for v in V) / len(V):+.2f})" if V else f"{c} 0%")
    print(f"  {fam} n {tot:4}: " + '; '.join(row))
n = sum(I.values())
print('interceptions, the intercepting defender facing the QB at the release:', ', '.join(f"{c} {I[c]} ({I[c] / n:.0%})" for c in ('square', 'side-on', 'turned away')) if n else 'none')
