"""Check matrix.py's trajectory route classifier against BDB 2025 routeRan labels on raw tracking (one week).
  python3 -I route_check.py <bdb dir> <week>"""
import sys, csv, collections as C, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from matrix import classify_route
D, wk = sys.argv[1], sys.argv[2]
plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if r['isDropback'] in ('TRUE', 'True')}
lab = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in plays and r['routeRan'] not in ('', 'NA'): lab[(k, r['nflId'])] = r['routeRan']
T = C.defaultdict(lambda: C.defaultdict(dict)); ev = C.defaultdict(dict); dirn = {}; ball = {}
for r in csv.DictReader(open(f'{D}/tracking_week_{wk}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in plays: continue
    f = int(r['frameId'])
    if r['event'] not in ('', 'NA'): ev[k].setdefault(r['event'], f)
    if r['nflId'] in ('', 'NA'):
        if r['frameType'] == 'SNAP' or r['event'] == 'ball_snap': ball[k] = float(r['y'])
        continue
    dirn[k] = r['playDirection']
    T[k][r['nflId']][f] = (float(r['x']), float(r['y']))
M = C.defaultdict(C.Counter)
for k, P in T.items():
    e = ev[k]; snap = e.get('ball_snap')
    if snap is None: continue
    left = dirn[k] == 'left'; pr = plays[k]
    los = float(pr['absoluteYardlineNumber']); los = 120 - los if left else los
    ballY = None
    end_ev = e.get('pass_forward', e.get('qb_sack', snap + 30)) + 4
    by = ball.get(k, 26.65); by = 53.3 - by if left else by
    for nid, fr in P.items():
        if (k, nid) not in lab: continue
        path = []
        for f in range(snap, max(fr) + 1):
            if f not in fr: break
            x, y = fr[f]; x = 120 - x if left else x; y = 53.3 - y if left else y
            path.append((x - los, y))
        if len(path) < 6: continue
        # His sideline: the side of the ball he aligned on (ball y ~ the centre's y at the snap; use field middle of the play's OL proxy: the QB).
        side = 1 if path[0][1] > by else -1
        got = classify_route(path, side, min(len(path) - 1, end_ev - snap))
        M[lab[(k, nid)]][got] += 1
tot = sum(sum(c.values()) for c in M.values()); ok = 0
SAME = {'GO': 'GO', 'POST': 'POST', 'CORNER': 'CORNER', 'OUT': 'OUT', 'IN': 'IN', 'SLANT': 'SLANT', 'HITCH': 'HITCH', 'FLAT': 'FLAT', 'CROSS': 'CROSS', 'WHEEL': 'WHEEL', 'ANGLE': 'ANGLE', 'SCREEN': 'SCREEN'}
for lb, c in sorted(M.items(), key=lambda t: -sum(t[1].values())):
    n = sum(c.values()); ok += c[lb]
    print(f'{lb:7} n {n:5}  agree {100 * c[lb] / n:5.1f}%  ' + ', '.join(f'{k} {100 * v / n:.0f}%' for k, v in c.most_common(4)))
print(f'overall agreement {100 * ok / tot:.1f}% of {tot}')
