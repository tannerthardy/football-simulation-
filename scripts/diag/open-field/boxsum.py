"""Classify how each box/second-level defender was passed, by eventual gain.
usage: boxsum.py 'out/open-field/box/X-*.jsonl.gz'"""
import glob, gzip, json, sys
from collections import Counter, defaultdict
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt') if l.strip()]
rows = [r for r in rows if 'error' not in r]
role = lambda s: 'DB' if s in ('CB_S', 'CB_W', 'FS', 'SS', 'NB') else 'LB' if s.startswith('LB') else 'DL'
def cls(p):
    if p['touched']: return 'touched'
    if p['down']: return 'down'
    if p['blocked']: return 'blocked'
    if p['dist'] > 4: return 'far(>4)'
    # Free, within 4 yd, never got a hand on him.
    return 'free-near:' + ('overrun-ps' if p['lat'] > 0 else 'beat-back')
for band, sel in (('10+', lambda g: g >= 10), ('3-10', lambda g: 3 <= g < 10)):
    R = [r for r in rows if sel(r['gain'])]
    for rl in ('LB', 'DL', 'DB'):
        c = Counter(cls(p) for r in R for p in r['passes'] if role(p['d']) == rl)
        n = sum(c.values())
        if n: print(f"{band:5s} {rl} n={n:4d} per play {n/len(R):.2f}: " + ', '.join(f"{k} {100*v/n:.0f}%" for k, v in c.most_common()))
R = [r for r in rows if r['gain'] >= 10]
# Free-near LBs: geometry
fn = [p for r in R for p in r['passes'] if role(p['d']) == 'LB' and cls(p).startswith('free')]
med = lambda xs: sorted(xs)[len(xs)//2] if xs else None
if fn: print('free-near LB: lat', med([p['lat'] for p in fn]), 'dist', med([p['dist'] for p in fn]), 'ds', med([p['ds'] for p in fn]), 'dvy', med([p['dvy'] for p in fn]), 'cvy', med([p['cvy'] for p in fn]), 'fits', Counter(p['fit'] for p in fn).most_common(6))
bl = [p for r in R for p in r['passes'] if role(p['d']) == 'LB' and cls(p) == 'blocked']
if bl: print('blocked LB by', Counter(p['blocked'] for p in bl).most_common(8), 'lat med', med([p['lat'] for p in bl]))
print('plays', len(rows), '10+', len(R), 'first hold depth med (10+)', med([r['firstHold'] for r in R if r['firstHold'] is not None]))
