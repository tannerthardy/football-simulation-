# Speed capacity by the angle between the torso and the direction of travel, for zone defenders (CB, FS, SS, S) with the ball still held. BDB 2025, 10 Hz, weeks given.
#   python3 -I scripts/diag/route-speed/nfl_dir_capacity.py OUT.json WEEK [WEEK ...]
# Angle  = |o - dir| (compass shoulders against the provider's direction of travel), folded to 0..180, 15-degree bins.
# Speed  = provider s divided by that player's own p98 speed over all his frames in the sample (so a fast and a slow man are one scale).
# Capacity per bin = the top decile (p90) of that ratio: what he CAN do at that angle, not the mean, which is choice. Frames: 0.5 s after the snap to the throw, s >= 1 yd/s.
import csv, sys, json, math, collections as C
D = 'data/raw/bdb2025/big-data-bowl-data'
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE', 'True') and r['pff_manZone'] == 'Zone': play[(r['gameId'], r['playId'])] = r['possessionTeam']
wrap = lambda a: (a + 180) % 360 - 180
frames = C.defaultdict(list)   # player -> [(s, ang)]
allp = C.defaultdict(list)
out = sys.argv[1]
for w in sys.argv[2:]:
    ev = {}; rows = []
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in play or r['displayName'] == 'football': continue
        if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], int(r['frameId']))
        if pos.get(r['nflId']) in ('CB', 'FS', 'SS', 'S', 'DB') and r['o'] not in ('', 'NA') and r['dir'] not in ('', 'NA') and r['s'] not in ('', 'NA') and r['club'] != play[k]:
            rows.append((k, r['nflId'], int(r['frameId']), float(r['s']), float(r['o']), float(r['dir'])))
    for k, i, f, s, o, d in rows:
        e = ev.get(k, {})
        if 'ball_snap' not in e: continue
        allp[i].append(s)
        if f < e['ball_snap'] + 5 or f >= e.get('pass_forward', 10 ** 9) or s < 1.0: continue
        frames[i].append((s, abs(wrap(o - d))))
p98 = {i: sorted(v)[int(0.98 * (len(v) - 1))] for i, v in allp.items() if len(v) > 200}
bins = C.defaultdict(list)
for i, F in frames.items():
    if i not in p98: continue
    for s, a in F: bins[min(11, int(a // 15))].append(s / p98[i])
res = {}
for b in range(12):
    v = sorted(bins[b])
    if len(v) >= 50: res[b] = dict(lo=b * 15, n=len(v), p50=v[len(v) // 2], p90=v[int(0.9 * (len(v) - 1))], p99=v[int(0.99 * (len(v) - 1))])
json.dump(res, open(out, 'w'))
print(f'{len(frames)} defenders, {sum(len(v) for v in frames.values())} frames')
for b, r in res.items(): print(f'  {r["lo"]:3d}-{r["lo"] + 15:3d} deg  n {r["n"]:6d}  speed/own p98: median {r["p50"]:.2f}  top-decile {r["p90"]:.2f}  p99 {r["p99"]:.2f}')
