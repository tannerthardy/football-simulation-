"""The break on the throw, one operator for NFL tracking and sim common plays:
the defender nearest the target at the throw, his closing speed on the target
(relative velocity along the line between them, + closing) and his own speed
at the throw and every 0.2 s after it while the ball is in the air; by
coverage family and by separation at the throw.
usage: breakcurve.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
LAGS = (0, .2, .4, .6, .8)
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or raw.get('target') is None: continue
        ev = raw.get('events') or {}; t0, t1 = ev.get('pass_forward'), ev.get('pass_arrived')
        if t0 is None or t1 is None: continue
        fam = coverage_family((raw.get('cell') or {}).get('coverage'))
        if fam not in ('man', 'zone'): continue
        p = Play(raw); r = raw['target']; k0 = p.k(t0)
        if p.pos(r, k0)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
        if not ds: continue
        d = min(ds, key=lambda d: p.dist(d, r, k0)); sep = p.dist(d, r, k0)
        band = f'{fam} sep<2' if sep < 2 else f'{fam} sep2-5' if sep < 5 else f'{fam} sep5+'
        o = g.setdefault(band, {l: ([], []) for l in LAGS})
        for l in LAGS:
            if t0 + l > t1 + 1e-9 or not p.live(t0 + l): continue
            k = p.k(t0 + l)
            (rx, ry), (dx, dy) = p.pos(r, k), p.pos(d, k)
            if rx is None or dx is None: continue
            gx, gy = rx - dx, ry - dy; n = math.hypot(gx, gy) or 1
            (vx, vy), (wx, wy) = p.velocity(d, k), p.velocity(r, k)
            o[l][0].append(((vx - wx) * gx + (vy - wy) * gy) / n); o[l][1].append(math.hypot(vx, vy))
    print(path.split('/')[-1][:26])
    for band in sorted(g):
        o = g[band]
        print(f'  {band:12s} n {len(o[0][0]):5d} | closing (own speed) at +' + ' '.join(f'{l}s {q(o[l][0])} ({q(o[l][1])})' for l in LAGS))
