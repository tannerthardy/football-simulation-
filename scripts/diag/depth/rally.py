"""Rally to the catch, one operator for NFL tracking and sim common plays (sim
from scripts/mechanics/sim-export.ts). For completed passes, by coverage
family (man / zone): the nearest and second-nearest defenders' distance to
the receiver at the catch, their closing speed toward him then (yd/s, + is
closing), their speed, the time until any defender is within 1.5 yd, and
yards after the catch by that time band.
usage: rally.py FILE [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass' or raw.get('target') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    ev = raw.get('events') or {}
    t = ev.get('catch')
    if t is None: continue
    fam = coverage_family((raw.get('cell') or {}).get('coverage'))
    if fam not in ('man', 'zone'): continue
    p = Play(raw); r = raw['target']; k = p.k(t); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if k >= end: continue
    D = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
    if len(D) < 2: continue
    def closing(d):
        a, b = max(0, k - 2), min(end, k + 2)
        return (p.dist(d, r, a) - p.dist(d, r, b)) / ((b - a) * p.dt) if b > a else 0
    near = sorted(D, key=lambda d: p.dist(d, r, k))[:2]
    rx0 = p.pos(r, k)[0]
    hit = next((kk for kk in range(k, end + 1) if any(p.dist(d, r, kk) <= 1.5 for d in D)), None)
    yac = (p.pos(r, end)[0] or rx0) - rx0
    g = o.setdefault(fam, {})
    for i, d in enumerate(near):
        g.setdefault(f'dist{i}', []).append(p.dist(d, r, k)); g.setdefault(f'close{i}', []).append(closing(d))
        g.setdefault(f'speed{i}', []).append(p.speed(d, k))
    g.setdefault('t15', []).append(None if hit is None else (hit - k) * p.dt)
    g.setdefault('yac', []).append(yac)
print(path.split('/')[-1][:26])
for fam, g in o.items():
    n = len(g['yac']); t15 = [x for x in g['t15'] if x is not None]
    print(f"  {fam:4s} catches {n}: nearest dist p50 {q(g['dist0'])} (p75 {q(g['dist0'], .75)}), closing {q(g['close0'])} yd/s, speed {q(g['speed0'])} | "
          f"second dist {q(g['dist1'])}, closing {q(g['close1'])}, speed {q(g['speed1'])} | defender within 1.5 yd after p50 {q(t15)} s (never {100 * (n - len(t15)) / n:.0f}%) | YAC p50/p90 {q(g['yac'])}/{q(g['yac'], .9)}")
