"""The QB's drop on NFL traditional drop-backs, play action vs not (BDB 2025, weeks given): his depth behind the snap
spot at 0.5 / 1.0 / 1.5 / 2.0 s, the time he reaches his deepest point before the throw (his set), that depth, and
the time to the pass. By alignment (shotgun vs under center/pistol). Same quantities as pa-drop.ts in the sim.
   python3 -I scripts/diag/concepts/nfl_pa_drop.py <bdb2025 dir> [weeks]
"""
import csv, sys, statistics as st
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = {}
for r in csv.DictReader(open(f'{root}/plays.csv')):
    if r['isDropback'] not in ('TRUE', 'True', '1') or r['dropbackType'] != 'TRADITIONAL': continue
    plays[(r['gameId'], r['playId'])] = {'pa': r['playAction'] in ('TRUE', 'True', '1'), 'team': r['possessionTeam'], 'gun': r['offenseFormation'] == 'SHOTGUN'}
qbs = {r['nflId'] for r in csv.DictReader(open(f'{root}/players.csv')) if r['position'] == 'QB'}
snap, rel, q = {}, {}, {}
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        if r['displayName'] == 'football':
            if r['event'] == 'ball_snap': snap[k] = (float(r['x']), int(r['frameId']), 1 if r['playDirection'] == 'right' else -1)
            continue
        if r['nflId'] in qbs and r['club'] == plays[k]['team']:
            q.setdefault(k, {})[int(r['frameId'])] = float(r['x'])
            if r['event'] == 'pass_forward': rel[k] = int(r['frameId'])
out = {}
for k, f in rel.items():
    if k not in snap or k not in q: continue
    sx, sf, d = snap[k]; Q = q[k]
    dep = {fr: (sx - x) * d for fr, x in Q.items()}
    path = [(fr, dep[fr]) for fr in range(sf, f + 1) if fr in dep]
    if not path: continue
    deepest = max(path, key=lambda p: p[1])
    key = ('gun' if plays[k]['gun'] else 'under') + (' PA' if plays[k]['pa'] else ' no PA')
    out.setdefault(key, []).append({**{f'd{t}': dep.get(sf + int(t * 10)) for t in (0.5, 1.0, 1.5, 2.0)}, 'setT': (deepest[0] - sf) / 10, 'setD': deepest[1], 'ttt': (f - sf) / 10})
med = lambda xs: round(st.median([x for x in xs if x is not None]), 2)
for key in sorted(out):
    R = out[key]
    print(f"{key}: n {len(R)}; depth at 0.5/1.0/1.5/2.0 s {med([r['d0.5'] for r in R])}/{med([r['d1.0'] for r in R])}/{med([r['d1.5'] for r in R])}/{med([r['d2.0'] for r in R])} yd; deepest {med([r['setD'] for r in R])} yd at {med([r['setT'] for r in R])} s; pass at {med([r['ttt'] for r in R])} s")
