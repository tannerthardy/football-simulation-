"""NFL launch point on play-action drop-backs by dropbackType (BDB 2025 tracking, weeks given): the QB's depth behind
the snap spot and width from it at pass_forward, the time from ball_snap, and the QB's speed at the release, for
DESIGNED_ROLLOUT (boot) and TRADITIONAL play action. Also the drop-back's own dropbackDistance as a check.
   python3 -I scripts/diag/concepts/nfl_boot_launch.py <bdb2025 dir> [weeks, default 1,2,3]
"""
import csv, sys, statistics as st
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
plays = {}
for r in csv.DictReader(open(f'{root}/plays.csv')):
    if r['isDropback'] not in ('TRUE', 'True', '1') or r['playAction'] not in ('TRUE', 'True', '1'): continue
    t = r['dropbackType']
    kind = 'boot' if t.startswith('DESIGNED_ROLLOUT') else 'trad' if t == 'TRADITIONAL' else None
    if kind: plays[(r['gameId'], r['playId'])] = {'kind': kind, 'team': r['possessionTeam'], 'dist': r['dropbackDistance']}
qbs = {r['nflId'] for r in csv.DictReader(open(f'{root}/players.csv')) if r['position'] == 'QB'}
snap, rel, qbpos, frames = {}, {}, {}, {}
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in plays: continue
        if r['displayName'] == 'football':
            if r['event'] == 'ball_snap': snap[k] = (float(r['x']), float(r['y']), int(r['frameId']), r['playDirection'])
            continue
        if r['nflId'] in qbs and r['club'] == plays[k]['team']:
            qbpos.setdefault(k, {})[int(r['frameId'])] = (float(r['x']), float(r['y']), float(r['s']))
            if r['event'] == 'pass_forward': rel[k] = int(r['frameId'])
out = {'boot': [], 'trad': []}
for k, f in rel.items():
    if k not in snap or k not in qbpos or f not in qbpos[k]: continue
    sx, sy, sf, d = snap[k]; x, y, s = qbpos[k][f]; sgn = 1 if d == 'right' else -1
    out[plays[k]['kind']].append({'depth': (sx - x) * sgn, 'width': abs(y - sy), 't': (f - sf) / 10, 'speed': s})
med = lambda xs: round(st.median(xs), 2)
q = lambda xs, p: round(sorted(xs)[int(p * (len(xs) - 1))], 2)
for kind, R in out.items():
    if not R: continue
    print(f"{kind}: n {len(R)}; depth p25/50/75 {q([r['depth'] for r in R],.25)}/{med([r['depth'] for r in R])}/{q([r['depth'] for r in R],.75)} yd;"
          f" width {q([r['width'] for r in R],.25)}/{med([r['width'] for r in R])}/{q([r['width'] for r in R],.75)} yd;"
          f" time to pass {q([r['t'] for r in R],.25)}/{med([r['t'] for r in R])}/{q([r['t'] for r in R],.75)} s; QB speed at release p50 {med([r['speed'] for r in R])} yd/s")
