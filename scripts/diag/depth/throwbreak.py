"""The break on the throw in stages, one operator for NFL tracking and sim
common plays. Take the defender (not a lineman) nearest the target at the
throw and the catch point (the target's spot when the ball arrives):
  - his velocity toward the catch point (yd/s) from 0.4 s before the release
    to 0.8 s after it, and his speed;
  - his plant: the moment that velocity is lowest between 0.5 s before the
    release and 0.6 s after it, before it rises 1 yd/s (the break starts);
  - closing in flight: his distance to the target at the throw minus at the
    arrival;
  - separation at the catch: the nearest defender at the arrival.
Split by coverage family (man / zone) and his depth at the throw (under /
deep, 8 yd off the ball).
usage: throwbreak.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
mean = lambda v: round(sum(v) / len(v), 2) if v else None
LAGS = (-.4, -.2, 0, .2, .4, .6, .8)
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or raw.get('target') is None: continue
        ev = raw.get('events') or {}; t0, t1 = ev.get('pass_forward'), ev.get('pass_arrived')
        if t0 is None or t1 is None or t1 <= t0: continue
        fam = coverage_family((raw.get('cell') or {}).get('coverage'))
        if fam not in ('man', 'zone'): continue
        p = Play(raw); r = raw['target']; k0, k1 = p.k(t0), p.k(t1)
        cp = p.pos(r, k1)
        if cp[0] is None or p.pos(r, k0)[0] is None: continue
        ds = [d for d in p.who('D') if p.players[d]['group'] != 'DL' and p.pos(d, k0)[0] is not None]
        if not ds: continue
        d = min(ds, key=lambda d: p.dist(d, r, k0))
        band = f"{fam} {'under' if p.pos(d, k0)[0] < 8 else 'deep'}"
        o = g.setdefault(band, {'v': {l: [] for l in LAGS}, 's': {l: [] for l in LAGS}, 'plant': [], 'close': [], 'sep': [], 'air': []})
        def toward(t):
            if t < 0 or not p.live(t): return None
            k = p.k(t); x, y = p.pos(d, k)
            if x is None: return None
            gx, gy = cp[0] - x, cp[1] - y; n = math.hypot(gx, gy) or 1
            vx, vy = p.velocity(d, k)
            return (vx * gx + vy * gy) / n, math.hypot(vx, vy)
        for l in LAGS:
            if t0 + l > t1 + 1e-9: continue
            v = toward(t0 + l)
            if v: o['v'][l].append(v[0]); o['s'][l].append(v[1])
        # Plant: the lowest velocity toward the point before it rises 1 yd/s.
        series = [(t0 + i * p.dt, toward(t0 + i * p.dt)) for i in range(-5, 7)]
        series = [(t, v[0]) for t, v in series if v and t <= t1 + 1e-9]
        if len(series) >= 4:
            lo_t, lo_v = series[0]
            for t, v in series:
                if v < lo_v: lo_t, lo_v = t, v
                elif v >= lo_v + 1.0: o['plant'].append(round(lo_t - t0, 2)); break
        dt0, dt1 = p.dist(d, r, k0), p.dist(d, r, k1)
        if dt0 is not None and dt1 is not None: o['close'].append(dt0 - dt1)
        near = [p.dist(x, r, k1) for x in p.who('D') if p.dist(x, r, k1) is not None]
        if near: o['sep'].append(min(near))
        o['air'].append(t1 - t0)
    print(path.split('/')[-1][:30])
    for band in sorted(g):
        o = g[band]
        print(f"  {band:10s} n {len(o['close']):5d} | air {q(o['air'])} s | closing mean {mean(o['close'])} med {q(o['close'])} yd | sep at catch {q(o['sep'])} yd"
              f" | plant at {q(o['plant'])} s (p25 {q(o['plant'], .25)}, p75 {q(o['plant'], .75)}; {len(o['plant'])} found)")
        print('    toward the catch point (speed): ' + '  '.join(f"{l:+.1f}s {q(o['v'][l])} ({q(o['s'][l])})" for l in LAGS))
