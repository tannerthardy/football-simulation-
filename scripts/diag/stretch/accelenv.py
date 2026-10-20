"""Achieved acceleration envelope, one operator for NFL tracking and sim
common plays: for every player frame (snap to the end of the run), speed v
from the shared smoothed estimator and the change in speed over the next
0.3 s; the 90th/97th percentile of that gain (yd/s per s) in speed bands, by
position group. A body's demonstrated speed-up capability, not a request.
usage: accelenv.py FILE [--ytg60] [--runs]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
H = 3  # frames (0.3 s)
bands = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8)]
o = {}
n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    n += 1
    if n > 1500: break
    p = Play(raw); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    for i, pl in enumerate(p.players):
        g = 'RB' if i == raw['carrier'] else pl['group']
        if g not in ('DL', 'LB', 'DB', 'OL', 'RB'): continue
        sp = [p.speed(i, k) for k in range(end + 1)]
        for k in range(0, end + 1 - H):
            v = sp[k]
            for lo, hi in bands:
                if lo <= v < hi:
                    o.setdefault((g, lo), []).append((sp[k + H] - v) / (H * p.dt)); break
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
print(f"{path.split('/')[-1][:24]:24s} runs {n}: speed gain over 0.3 s, p90/p97 (yd/s per s) by speed band")
for g in ('DL', 'LB', 'DB', 'OL', 'RB'):
    print(f"  {g}: " + '  '.join(f"{lo}-{hi} {q(o.get((g, lo), []), .9):4.1f}/{q(o.get((g, lo), []), .97):4.1f}" for lo, hi in bands if len(o.get((g, lo), [])) > 50))
