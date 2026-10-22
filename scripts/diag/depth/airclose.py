"""The ball in the air, by coverage family: separation of the nearest
defender at the throw and at arrival, and how much he closes (metrics'
air.defender_closing), plus the nearest defender's speed toward the target at
arrival. One operator for NFL tracking and sim common plays.
usage: airclose.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
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
        s0, s1 = p.nearest(r, k0), p.nearest(r, k1)
        if s0 is None or s1 is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k1)[0] is not None]
        d = min(ds, key=lambda d: p.dist(d, r, k1))
        (rx, ry), (dx, dy) = p.pos(r, k1), p.pos(d, k1); gx, gy = rx - dx, ry - dy; n = math.hypot(gx, gy) or 1
        vx, vy = p.velocity(d, k1); rvx, rvy = p.velocity(r, k1)
        o = g.setdefault(fam, {'s0': [], 's1': [], 'close': [], 'toward': [], 'air': []})
        o['s0'].append(s0); o['s1'].append(s1); o['close'].append(s0 - s1); o['air'].append(t1 - t0)
        o['toward'].append(((vx - rvx) * gx + (vy - rvy) * gy) / n)
    print(path.split('/')[-1][:26])
    for fam, o in g.items():
        print(f"  {fam:4s} n {len(o['s0']):5d} air {q(o['air'])} s | separation throw {q(o['s0'])} -> arrival {q(o['s1'])} | closing p25/p50/p75 {q(o['close'], .25)}/{q(o['close'])}/{q(o['close'], .75)} | nearest closing speed at arrival {q(o['toward'])}")
