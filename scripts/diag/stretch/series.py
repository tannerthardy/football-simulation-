"""Speed series (0.2 s central difference, 10 Hz) of one player of a group in N random run
plays (NFL60 when the file is the NFL common file), snap to 3.5 s.
usage: series.py FILE "D DL" N"""
import gzip, json, math, random, sys
path, group, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if 'nfl' in path else None
rows = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and ytg.get(raw['id'], 0) < 60: continue
    rows.append(raw)
random.seed(5); random.shuffle(rows)
shown = 0
for raw in rows:
    xy, dt = raw['xy'], raw['dt']
    for i, pl in enumerate(raw['players']):
        if f"{pl['side']} {pl['group']}" != group or i == raw['carrier']: continue
        k1 = min(len(xy) - 1, int(3.5 / dt))
        s = []
        for k in range(1, k1):
            a, b = xy[k - 1], xy[k + 1]
            if a[2*i] is None or b[2*i] is None: break
            s.append(math.hypot(b[2*i] - a[2*i], b[2*i+1] - a[2*i+1]) / (2 * dt))
        print(f"{str(raw['id'])[:34]:34s} " + ' '.join(f"{v:3.1f}" for v in s[:34]))
        shown += 1
        break
    if shown >= n: break
