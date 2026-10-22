"""Throw timing against the route, one operator for NFL tracking and sim
common plays: completed passes split by the target's downfield speed at the
throw (still stemming vs broken off), the share of throws in each band by the
target's depth, and yards after the catch (median / p90) per band.
usage: throwstem.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
BANDS = ((-99, 1.5, 'broken off (<1.5 yd/s)'), (1.5, 4, 'easing (1.5-4)'), (4, 99, 'stemming (4+)'))
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or raw.get('target') is None: continue
        ev = raw.get('events') or {}; tt, tc = ev.get('pass_forward'), ev.get('catch')
        if tt is None: continue
        p = Play(raw); r = raw['target']; kt = p.k(tt)
        x = p.pos(r, kt)[0]
        if x is None: continue
        depth = 'target 5-15 yd' if 5 <= x < 15 else 'target <5' if x < 5 else 'target 15+'
        vx = p.velocity(r, kt)[0]
        band = next(b[2] for b in BANDS if b[0] <= vx < b[1])
        o = g.setdefault(depth, {}).setdefault(band, {'n': 0, 'yac': []})
        o['n'] += 1
        if tc is not None and p.pos(r, p.k(tc))[0] is not None: o['yac'].append(raw['yards'] - p.pos(r, p.k(tc))[0])
    print(path.split('/')[-1][:26])
    for depth in ('target <5', 'target 5-15 yd', 'target 15+'):
        D = g.get(depth, {}); n = sum(o['n'] for o in D.values())
        print(f'  {depth} (throws {n}): ' + ' | '.join(f"{b[2]} {100 * D[b[2]]['n'] / max(1, n):.0f}%, YAC {q(D[b[2]]['yac'])}/{q(D[b[2]]['yac'], .9)}" for b in BANDS if b[2] in D))
