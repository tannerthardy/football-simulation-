"""The break toward the catch point, one operator for NFL tracking and sim
common plays: the zone defender nearest the target at the throw, his
velocity toward the point where the target is when the ball arrives
(+ = toward it) and across that line, at the throw and every 0.2 s after;
split by how far he is from that point at the throw.
usage: breakpoint.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
LAGS = (0, .2, .4, .6)
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or raw.get('target') is None: continue
        ev = raw.get('events') or {}; t0, t1 = ev.get('pass_forward'), ev.get('pass_arrived')
        if t0 is None or t1 is None or t1 - t0 < .6: continue
        if coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
        p = Play(raw); r = raw['target']; k0, k1 = p.k(t0), p.k(t1)
        cp = p.pos(r, k1)
        if cp[0] is None or p.pos(r, k0)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
        d = min(ds, key=lambda d: p.dist(d, r, k0))
        dist0 = math.hypot(cp[0] - p.pos(d, k0)[0], cp[1] - p.pos(d, k0)[1])
        band = 'point<4' if dist0 < 4 else 'point4-8' if dist0 < 8 else 'point8+'
        o = g.setdefault(band, {l: ([], [], []) for l in LAGS})
        for l in LAGS:
            k = p.k(t0 + l); x, y = p.pos(d, k)
            if x is None: continue
            gx, gy = cp[0] - x, cp[1] - y; n = math.hypot(gx, gy) or 1
            vx, vy = p.velocity(d, k)
            o[l][0].append((vx * gx + vy * gy) / n); o[l][1].append(abs(-vx * gy + vy * gx) / n); o[l][2].append(math.hypot(vx, vy))
    print(path.split('/')[-1][:26])
    for band in ('point<4', 'point4-8', 'point8+'):
        o = g.get(band)
        if not o: continue
        print(f'  {band:8s} n {len(o[0][0]):5d} | toward catch point / across (speed): ' + ' '.join(f'+{l}s {q(o[l][0])}/{q(o[l][1])} ({q(o[l][2])})' for l in LAGS))
