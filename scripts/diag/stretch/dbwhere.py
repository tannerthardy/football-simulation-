"""Where each DB is when the carrier first reaches REF yd, by snap alignment,
one operator for NFL tracking and sim common plays (per DB, so personnel
counts do not bias it). Snap groups: deep (10+ yd), off-wide (5-10 yd, more
than 8 yd from the ball laterally), mid-inside (5-10 yd, inside), up (<5 yd).
Bins at REF: near (within 3 yd), ahead (beyond 3 yd, still downfield of the
carrier), behind (3-6 yd, not ahead), far. Also whether a WR/TE is within
1 yd of him then (stalked proxy).
usage: dbwhere.py FILE [REF=8] [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--')]
path, REF = args[0], float(args[1]) if len(args) > 1 else 8.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
o = {}; runs = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= REF), None)
    if k is None: continue
    runs += 1; cx = p.pos(c, k)[0]; by = raw['ball_y']
    rec = [i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] in ('WR', 'TE') and i != c]
    for d in p.who('D'):
        if p.players[d]['group'] != 'DB': continue
        x0, y0 = p.pos(d, 0); x, y = p.pos(d, k)
        if x0 is None or x is None: continue
        g = 'deep' if x0 >= 10 else 'off-wide' if x0 >= 5 and abs(y0 - by) > 8 else 'mid-in' if x0 >= 5 else 'up'
        dist = p.dist(c, d, k)
        b = 'near' if dist <= 3 else 'ahead' if x - cx > 0 else 'behind' if dist <= 6 else 'far'
        r = o.setdefault(g, {'n': 0, 'st': 0}); r['n'] += 1; r[b] = r.get(b, 0) + 1
        r['st'] += any(p.dist(d, w, k) <= 1.0 for w in rec)
print(f"{path.split('/')[-1][:24]:24s} runs reaching {REF:.0f}: {runs}")
for g in ('deep', 'off-wide', 'mid-in', 'up'):
    r = o.get(g)
    if r: print(f"  {g:9s} {r['n']/runs:.2f}/run | " + '  '.join(f"{b} {100*r.get(b, 0)/r['n']:.0f}%" for b in ('near', 'ahead', 'behind', 'far')) + f" | WR/TE within 1 yd {100*r['st']/r['n']:.0f}%")
