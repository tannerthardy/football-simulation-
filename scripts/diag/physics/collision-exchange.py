"""Velocity exchange in the first moments of a run's first contact, NFL vs
sim, same operator. Along the carrier's direction of travel at contact:
the carrier's speed change and the nearest defender's velocity change over
0.2 / 0.4 s, by approach angle. In a whole-body inelastic merge, the
defender is thrown forward about as much as the carrier slows (masses are
similar). python3 -I scripts/diag/physics/collision-exchange.py NFL.jsonl.gz SIM.jsonl.gz [...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play


def measure(paths):
    rows = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line)
            if raw['kind'] != 'run' or raw.get('carrier') is None:
                continue
            p = Play(raw)
            t0 = p.events.get('first_contact')
            if t0 is None or not p.live(t0 + .4):
                continue
            c, k0 = raw['carrier'], p.k(t0)
            vx, vy = p.velocity(c, k0)
            sp = math.hypot(vx, vy)
            if sp < 2 or p.pos(c, k0)[0] is None:
                continue
            ux, uy = vx / sp, vy / sp
            d = min((d for d in p.who('D') if p.pos(d, k0)[0] is not None), key=lambda d: p.dist(c, d, k0), default=None)
            if d is None or p.dist(c, d, k0) > 1.5:
                continue
            dx, dy = p.pos(d, k0)[0] - p.pos(c, k0)[0], p.pos(d, k0)[1] - p.pos(c, k0)[1]
            L = math.hypot(dx, dy) or 1
            ang = math.degrees(math.acos(max(-1, min(1, (ux * dx + uy * dy) / L))))
            along = lambda v: v[0] * ux + v[1] * uy
            row = {'ang': ang, 'cv0': sp, 'dv0': along(p.velocity(d, k0))}
            for dt in (.2, .4):
                k = p.k(t0 + dt)
                row[f'c{dt}'] = along(p.velocity(c, k)) - sp
                row[f'd{dt}'] = along(p.velocity(d, k)) - row['dv0']
            rows.append(row)
    return rows


def med(v):
    v = sorted(v)
    return v[len(v) // 2] if v else float('nan')


nfl, sim = measure([sys.argv[1]]), measure(sys.argv[2:])
print('along the carrier\'s travel; defender within 1.5 yd at first contact')
print('                      n NFL/sim   carrier v0      defender v0     carrier change +0.2/+0.4      defender change +0.2/+0.4')
for label, lo, hi in (('head-on (<45)', 0, 45), ('side (45-135)', 45, 135), ('behind (>135)', 135, 181)):
    a = [r for r in nfl if lo <= r['ang'] < hi]; b = [r for r in sim if lo <= r['ang'] < hi]
    if not a or not b:
        continue
    g = lambda rs, k: med([r[k] for r in rs])
    print(f'  {label:16s} {len(a):5d}/{len(b):4d}   {g(a,"cv0"):.2f}/{g(b,"cv0"):.2f}      {g(a,"dv0"):+.2f}/{g(b,"dv0"):+.2f}     '
          f'NFL {g(a,"c0.2"):+.2f}/{g(a,"c0.4"):+.2f} sim {g(b,"c0.2"):+.2f}/{g(b,"c0.4"):+.2f}   NFL {g(a,"d0.2"):+.2f}/{g(a,"d0.4"):+.2f} sim {g(b,"d0.2"):+.2f}/{g(b,"d0.4"):+.2f}')

print('\nby relative closing speed (carrier minus defender, along travel), all angles')
for lo, hi in ((0, 2), (2, 3.5), (3.5, 5), (5, 9)):
    a = [r for r in nfl if lo <= r['cv0'] - r['dv0'] < hi]; b = [r for r in sim if lo <= r['cv0'] - r['dv0'] < hi]
    if len(a) < 20 or len(b) < 10:
        continue
    g = lambda rs, k: med([r[k] for r in rs])
    print(f'  closing {lo:.1f}-{hi:.1f}: n {len(a):5d}/{len(b):4d}  carrier change +0.2 NFL {g(a,"c0.2"):+.2f} sim {g(b,"c0.2"):+.2f} | +0.4 NFL {g(a,"c0.4"):+.2f} sim {g(b,"c0.4"):+.2f}'
          f' | defender +0.2 NFL {g(a,"d0.2"):+.2f} sim {g(b,"d0.2"):+.2f}')
