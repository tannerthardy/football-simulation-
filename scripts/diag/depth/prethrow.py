"""Pre-throw state of the defender who arrives first, one operator for NFL tracking and sim common plays (sim from
scripts/mechanics/sim-export.ts). Population as rally.py: completed passes (events.catch) with a known man/zone family,
here caught 0-12 yd past the line. The first to arrive is the defender nearest the target at the catch. For him, at
-0.5, -0.25 and 0 s relative to events.pass_forward: distance to the eventual target (the target's position at that
frame), his speed, and his velocity along the line to the target (+ is toward; unlike rally.py's closing, the target's
own motion is not in it). Also split by whether he was the target's nearest defender at the snap (frame 0), the rough
stand-in for "his man". usage: prethrow.py FILE [--min 0 --max 12]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
path = sys.argv[1]
arg = lambda n, d: float(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d
lo, hi = arg('--min', 0), arg('--max', 12)
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
OFF = (-0.5, -0.25, 0.0)
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass' or raw.get('target') is None: continue
    ev = raw.get('events') or {}
    tc, tt = ev.get('catch'), ev.get('pass_forward')
    if tc is None or tt is None: continue
    fam = coverage_family((raw.get('cell') or {}).get('coverage'))
    if fam not in ('man', 'zone'): continue
    p = Play(raw); r = raw['target']; kc = p.k(tc)
    x = p.pos(r, kc)[0]
    if x is None or not (lo <= x <= hi) or tt <= 0.5: continue
    D = [d for d in p.who('D') if p.pos(d, kc)[0] is not None and p.pos(d, 0)[0] is not None]
    if len(D) < 2: continue
    first = min(D, key=lambda d: p.dist(d, r, kc))
    snap = min(D, key=lambda d: p.dist(d, r, 0))
    rows = []
    for off in OFF:
        k = p.k(tt + off)
        (dx, dy), (rx, ry) = p.pos(first, k), p.pos(r, k)
        if dx is None or rx is None: rows = None; break
        d = math.hypot(rx - dx, ry - dy)
        vx, vy = p.velocity(first, k)
        rows.append((d, p.speed(first, k), (vx * (rx - dx) + vy * (ry - dy)) / d if d > 1e-6 else 0.0))
    if rows is None: continue
    for key in ('all', fam, f'{fam}/his-man' if first == snap else f'{fam}/not-nearest-at-snap'):
        g = o.setdefault(key, {'n': 0})
        g['n'] += 1
        for i, off in enumerate(OFF):
            for j, nm in enumerate(('dist', 'speed', 'close')):
                g.setdefault((nm, off), []).append(rows[i][j])
print(path.split('/')[-1][:30], f'catches {lo:g}-{hi:g} yd')
print(f"{'':30s}{'n':>5s} | " + ' | '.join(f"{'%+.2f s' % off:^20s}" for off in OFF) + '   (dist p50, speed p50, closing p50)')
for key in sorted(o):
    g = o[key]
    print(f"{key:30s}{g['n']:5d} | " + ' | '.join(f"{q(g[('dist', off)]):5.1f} {q(g[('speed', off)]):5.1f} {q(g[('close', off)]):+5.1f}  " for off in OFF))
