# NFL receiver speed by time since the snap, by route (player_play.routeRan: GO, CROSS, IN, ...), depth class at 3.0 s
# and coverage (plays.pff_manZone), only while the ball is still held (no pass_forward yet) at that time, on drop-backs,
# BDB 2025. One week per run: python3 -I nfl_route_speed.py DATA_DIR WEEK OUT.json ; pool with route_speed_report.py.
import csv, sys, math, json, collections as C
D, W, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
play = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE', 'True'): play[(r['gameId'], r['playId'])] = (float(r['absoluteYardlineNumber']), r['pff_manZone'])
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
route = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in play and r['routeRan'] not in ('', 'NA') and r['wasRunningRoute'] in ('1', '1.0', 'TRUE', 'True'): route[(k, r['nflId'])] = r['routeRan']
tr = C.defaultdict(list); snap = {}; thrown = {}
for r in csv.DictReader(open(f'{D}/tracking_week_{W}.csv')):
    k = (r['gameId'], r['playId'])
    if k not in play or r['displayName'] == 'football': continue
    ev = r['event']
    if ev == 'ball_snap': snap.setdefault(k, int(r['frameId']))
    if ev in ('pass_forward', 'qb_sack', 'qb_strip_sack', 'run', 'handoff'): thrown.setdefault(k, int(r['frameId']))
    key = (k, r['nflId'])
    if key in route: tr[key].append((int(r['frameId']), float(r['x']), float(r['s']), r['playDirection']))
rows = []
for (k, i), F in tr.items():
    if k not in snap: continue
    s0 = snap[k]; end = thrown.get(k, 10 ** 9)
    by = {f: (x, s, d) for f, x, s, d in F}
    if s0 not in by: continue
    los = play[k][0]
    row = {'route': route[(k, i)], 'cov': play[k][1], 'pos': pos.get(i, '?'), 'sp': {}}
    ok = True
    for t in TS:
        f = s0 + int(round(t * 10))
        if f >= end or f not in by: ok = False; break
        row['sp'][str(t)] = by[f][1]
        if t == 3.0:
            x, _, d = by[f]; row['depth3'] = (x - los) * (1 if d == 'right' else -1)
    if ok: rows.append(row)
json.dump(rows, open(OUT, 'w'))
print(len(rows), 'rows')
