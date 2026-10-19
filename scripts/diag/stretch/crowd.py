"""Who is around the carrier when he first reaches +8 yd, one operator for NFL
tracking and sim common plays. Per run, by group (DL, LB, DB): within 3 yd of
him, ahead of him (beyond 3 yd), 3-6 yd away and not ahead, or farther.
usage: crowd.py FILE [--ytg60]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]; ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
o = {}; n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 8), None)
    if k is None: continue
    n += 1; cx = p.pos(c, k)[0]
    for d in p.who('D'):
        x = p.pos(d, k)[0]
        if x is None: continue
        g = raw['players'][d]['group']; dist = p.dist(c, d, k); rel = x - cx
        b = 'near<3' if dist <= 3 else 'ahead' if rel > 0 else 'behind3-6' if dist <= 6 else 'far'
        o[(g, b)] = o.get((g, b), 0) + 1
print(path.split('/')[-1], 'runs reaching 8:', n, ' per run by group: near<3 / ahead (beyond 3) / behind 3-6 / far')
for g in ('DL', 'LB', 'DB'):
    print(f"  {g}: " + '  '.join(f"{b} {o.get((g, b), 0)/n:.2f}" for b in ('near<3', 'ahead', 'behind3-6', 'far')))
