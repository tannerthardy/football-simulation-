# GO routes only (full effort on both sides, so this reads capacity, not choice): receiver speed by time since the snap in 0.25 s bins to 4 s, and the distance covered at 1 / 2 / 3 s.
# BDB 2025 drop-backs, player_play.routeRan == GO, ball still held (frames before pass_forward), WR separately from TE/RB, FREE releases only (no defender within 1.5 yd of him in the first 0.5 s after the snap)
# and all releases. Per bin: n, median and top decile (p90) of the provider's s; distance by the tracked x, y path from the snap.
#   python3 -I scripts/diag/route-speed/nfl_go_speed.py OUT.json WEEK [WEEK ...]       (from the repo root)
import csv, sys, json, math, collections as C
D = 'data/raw/bdb2025/big-data-bowl-data'
out = sys.argv[1]
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE', 'True'): play[(r['gameId'], r['playId'])] = r['possessionTeam']
route = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k in play and r['routeRan'] == 'GO' and r['wasRunningRoute'] in ('1', '1.0', 'TRUE', 'True'): route[(k, r['nflId'])] = 1
rows = []   # one per (play, receiver): group, free, [(t, s)], dist at 1/2/3
for w in sys.argv[2:]:
    snap = {}; thrown = {}; trk = C.defaultdict(list); dfn = C.defaultdict(lambda: C.defaultdict(list))
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in play or r['displayName'] == 'football': continue
        if r['event'] == 'ball_snap': snap.setdefault(k, int(r['frameId']))
        if r['event'] in ('pass_forward', 'qb_sack', 'qb_strip_sack', 'run', 'handoff'): thrown.setdefault(k, int(r['frameId']))
        f = int(r['frameId']); key = (k, r['nflId'])
        if key in route: trk[key].append((f, float(r['x']), float(r['y']), float(r['s'])))
        if r['club'] != play[k] and f <= 60 + 100: dfn[k][f].append((float(r['x']), float(r['y'])))
    for (k, i), F in trk.items():
        if k not in snap or pos.get(i) not in ('WR', 'TE', 'RB'): continue
        s0 = snap[k]; end = thrown.get(k, 10 ** 9); F.sort()
        by = {f: (x, y, s) for f, x, y, s in F}
        if s0 not in by: continue
        mind = min((math.hypot(by[f][0] - dx, by[f][1] - dy) for f in range(s0, s0 + 6) if f in by for dx, dy in dfn[k].get(f, [])), default=99)
        series = [((f - s0) / 10, by[f][2]) for f in range(s0, min(end, s0 + 41)) if f in by]
        dist = {}; d = 0.0; prev = by[s0]
        for f in range(s0 + 1, min(end, s0 + 31)):
            if f not in by: break
            d += math.hypot(by[f][0] - prev[0], by[f][1] - prev[1]); prev = by[f]
            if (f - s0) in (10, 20, 30): dist[(f - s0) // 10] = d
        rows.append(dict(g='WR' if pos[i] == 'WR' else 'TE/RB', free=mind >= 1.5, series=series, dist=dist))
    print('week', w, len(rows), file=sys.stderr)
json.dump(rows, open(out, 'w'))
