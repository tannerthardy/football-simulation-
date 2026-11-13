"""NFL side of pa-effect.ts (same operator): on drop-backs (BDB 2025, weeks given), play action vs not. Off-ball box
defenders at the snap (3-8 yd off the line of scrimmage, within 6 yd of the ball): depth change toward the line at
0.5 and 1.0 s after the snap (positive = downhill) and peak downhill speed in the first 1.0 s; with yards a play by
down/distance bucket and QB alignment (shotgun vs not).
   python3 -I scripts/diag/concepts/pa_effect_nfl.py <bdb2025 dir> [weeks]
"""
import csv, sys, statistics as st
from collections import defaultdict
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = {}
for r in csv.DictReader(open(f'{root}/plays.csv')):
    if r['isDropback'] not in ('TRUE', 'True', '1') or r['qbSpike'] in ('TRUE', 'True', '1') or r['dropbackType'] != 'TRADITIONAL': continue
    plays[(r['gameId'], r['playId'])] = {'pa': r['playAction'] in ('TRUE', 'True', '1'), 'def': r['defensiveTeam'], 'los': float(r['absoluteYardlineNumber']),
        'yds': float(r['yardsGained'] or 0), 'gun': r['offenseFormation'] == 'SHOTGUN', 'down': int(r['down']), 'togo': int(r['yardsToGo'])}
track = defaultdict(lambda: defaultdict(dict))  # play -> nflId -> frame -> (x, y, s, dir)
snap, ball, pdir = {}, {}, {}
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        f = int(r['frameId'])
        if r['displayName'] == 'football':
            if r['event'] == 'ball_snap': snap[k] = f; ball[k] = (float(r['x']), float(r['y'])); pdir[k] = r['playDirection']
            continue
        if r['club'] != plays[k]['def']: continue
        track[k][r['nflId']][f] = (float(r['x']), float(r['y']))
rows = []
for k, P in track.items():
    if k not in snap: continue
    sf, (bx, by), d = snap[k], ball[k], (1 if pdir[k] == 'right' else -1)
    lb = []
    for pid, fr in P.items():
        if sf not in fr: continue
        x, y = fr[sf]; dep = (x - bx) * d
        if 3 <= dep <= 8 and abs(y - by) <= 6: lb.append(fr)
    d05, d10, pk = [], [], []
    for fr in lb:
        x0 = fr[sf][0]
        if sf + 5 in fr: d05.append((x0 - fr[sf + 5][0]) * d)
        if sf + 10 in fr: d10.append((x0 - fr[sf + 10][0]) * d)
        sp = [((fr[f - 1][0] - fr[f][0]) * d) / 0.1 for f in range(sf + 1, sf + 11) if f in fr and f - 1 in fr]
        if sp: pk.append(max(sp))
    rows.append({**plays[k], 'd05': d05, 'd10': d10, 'peak': pk})
def summary(name, R):
    flat = lambda key: [v for r in R for v in r[key]]
    med = lambda xs: round(st.median(xs), 2) if xs else None
    print(f"{name}: plays {len(R)} yd/play {sum(r['yds'] for r in R)/max(len(R),1):.2f}; box LBs {len(flat('d10'))}; downhill at 0.5 / 1.0 s p50 {med(flat('d05'))} / {med(flat('d10'))} yd;"
          f" p75 {round(sorted(flat('d10'))[int(.75*len(flat('d10')))],2) if flat('d10') else None}; peak downhill speed p50 {med(flat('peak'))} yd/s")
for gun in (True, False):
    for pa in (False, True):
        summary(f"{'gun' if gun else 'under/pistol'} {'PA' if pa else 'no PA'}", [r for r in rows if r['gun'] == gun and r['pa'] == pa])
summary('all no PA', [r for r in rows if not r['pa']]); summary('all PA', [r for r in rows if r['pa']])
