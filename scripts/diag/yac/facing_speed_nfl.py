"""NFL side of facing_speed.py: BDB 2025 (2022 weeks 1-9) dropback plays as arrays per play: 22 players x frames of x, y, s (provider speed, yd/s), o (orientation, deg), dir (direction of motion, deg),
side (club vs possession), position, and the frame of the throw. usage: python3 -I scripts/diag/yac/facing_speed_nfl.py OUT.pkl [WEEK ...]"""
import csv, sys, pickle, math, collections as C
D = 'data/raw/bdb2025/big-data-bowl-data'
out = sys.argv[1]; weeks = [int(w) for w in sys.argv[2:]] or list(range(1, 10))
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE', 'True'): play[(r['gameId'], r['playId'])] = (r['possessionTeam'], r['pff_manZone'])
plays = {}
for w in weeks:
    rows = C.defaultdict(lambda: C.defaultdict(dict))  # play -> nflId -> frame -> row
    ev = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in play or r['displayName'] == 'football': continue
        f = int(r['frameId'])
        if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
        if r['o'] in ('', 'NA') or r['dir'] in ('', 'NA') or r['s'] in ('', 'NA'): continue
        rows[k][r['nflId']][f] = (float(r['x']), float(r['y']), float(r['s']), float(r['o']), float(r['dir']), r['club'])
    for k, pl in rows.items():
        e = ev.get(k, {})
        if 'ball_snap' not in e or 'pass_forward' not in e: continue
        f0, f1 = e['ball_snap'], max(max(fr) for fr in pl.values())
        ids = sorted(pl); F = f1 - f0 + 1
        if len(ids) < 20 or F < 10: continue
        arr = {n: [[math.nan] * F for _ in ids] for n in ('x', 'y', 's', 'o', 'd')}
        for i, nid in enumerate(ids):
            for f, (x, y, s, o, d, club) in pl[nid].items():
                if f0 <= f <= f1:
                    j = f - f0; arr['x'][i][j] = x; arr['y'][i][j] = y; arr['s'][i][j] = s; arr['o'][i][j] = o; arr['d'][i][j] = d
        club = {nid: next(iter(pl[nid].values()))[5] for nid in ids}
        plays[k] = dict(ids=ids, side=['O' if club[n] == play[k][0] else 'D' for n in ids], pos=[pos.get(n) for n in ids], fam=play[k][1], throw=e['pass_forward'] - f0, snap=0, **arr)
    print('week', w, len(plays), 'plays', flush=True)
pickle.dump(plays, open(out, 'wb'))
