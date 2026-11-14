"""NFL RB targets (BDB 2025, weeks given): by routeRan, the share of RB targets and of pass plays; per route the throw time
after the snap, the catch point (width from the nearest sideline, depth past the LOS), the back's alignment width
from the ball, the nearest defender to the back at the throw (distance; his depth relative to the back) and the share
caught. Same quantities as rb_targets.py on our common-format export.
   python3 -I scripts/diag/backs/nfl_rb_targets.py <bdb2025 dir> [weeks] > out/backs/nfl.json"""
import csv, sys, json
from collections import defaultdict
root = sys.argv[1]; weeks = [int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{root}/players.csv'))}
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{root}/plays.csv'))}
dropbacks = {k for k, r in plays.items() if r.get('isDropback') in ('TRUE', 'True', '1')}
tgt = {}
for r in csv.DictReader(open(f'{root}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True') and pos.get(r['nflId']) in ('RB', 'FB'): tgt[k] = (r['nflId'], r['routeRan'] or 'NA')
want = set(tgt)
T = defaultdict(lambda: defaultdict(dict)); ev = defaultdict(dict); meta = {}
for w in weeks:
    for r in csv.DictReader(open(f'{root}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in want: continue
        f = int(r['frameId'])
        if r['displayName'] == 'football':
            e = r['event']
            if e in ('ball_snap', 'pass_forward', 'pass_arrived', 'pass_outcome_caught') and e not in ev[k]: ev[k][e] = f
            if e == 'ball_snap': meta[k] = (float(r['x']), float(r['y']), 1 if r['playDirection'] == 'right' else -1)
            T[k]['ball'][f] = (float(r['x']), float(r['y']))
        elif r['nflId'] == tgt[k][0]: T[k]['rb'][f] = (float(r['x']), float(r['y']))
        elif r['club'] != plays[k]['possessionTeam'] and r['club'] != 'football': T[k][r['nflId']][f] = (float(r['x']), float(r['y']))
out = []
for k, e in ev.items():
    if 'ball_snap' not in e or 'pass_forward' not in e or k not in meta: continue
    sx, sy, dirn = meta[k]; f0, ft = e['ball_snap'], e['pass_forward']; rb = T[k]['rb']
    if f0 not in rb or ft not in rb: continue
    D = [v for kk, v in T[k].items() if kk not in ('ball', 'rb') and ft in v]
    rx, ry = rb[ft]
    near = min(D, key=lambda v: (v[ft][0] - rx) ** 2 + (v[ft][1] - ry) ** 2) if D else None
    fc = e.get('pass_arrived')
    caught = plays[k]['passResult'] == 'C'
    cp = rb.get(fc) if fc else None
    out.append({'route': tgt[k][1], 'tThrow': (ft - f0) / 10, 'alignW': abs(rb[f0][1] - sy), 'caught': caught,
                'nearD': ((near[ft][0] - rx) ** 2 + (near[ft][1] - ry) ** 2) ** .5 if near else None,
                'nearDeeper': ((near[ft][0] - rx) * dirn) if near else None,
                'catchW': min(cp[1], 53.33 - cp[1]) if cp else None, 'catchD': (cp[0] - sx) * dirn if cp else None})
json.dump({'dropbacks': len([k for k in dropbacks if int(k[0][4:6]) >= 9 and k[0][:4] == '2022']), 'rb_targets_all_weeks': len(tgt), 'rows': out}, sys.stdout)
