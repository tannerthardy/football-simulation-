"""Zone defenders breaking on the throw, one operator for NFL tracking and sim
common plays. For completed passes against zone: the three defenders nearest
the catch point at the catch; their speed and their velocity toward the catch
point (yd/s) at the throw and 0.3 / 0.6 s after it, and at the catch.
usage: zonebreak.py FILE [--ytg60]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o, air = {}, []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'pass' or raw.get('target') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    ev = raw.get('events') or {}
    tc, tt = ev.get('catch'), ev.get('pass_forward')
    if tc is None or tt is None or tc <= tt: continue
    if coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
    p = Play(raw); r = raw['target']; kc = p.k(tc); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if kc > end: continue
    cx, cy = p.pos(r, kc)
    if cx is None: continue
    D = [d for d in p.who('D') if p.pos(d, kc)[0] is not None]
    near = sorted(D, key=lambda d: math.hypot(p.pos(d, kc)[0] - cx, p.pos(d, kc)[1] - cy))[:3]
    air.append(tc - tt)
    for tag, t in (('throw', tt), ('+0.3', tt + .3), ('+0.6', tt + .6), ('catch', tc)):
        if t > tc + 1e-9: continue
        k = p.k(t); a, b = max(0, k - 2), min(end, k + 2)
        for d in near:
            (xa, ya), (xb, yb) = p.pos(d, a), p.pos(d, b)
            if None in (xa, xb) or b == a: continue
            vx, vy = (xb - xa) / ((b - a) * p.dt), (yb - ya) / ((b - a) * p.dt)
            x, y = p.pos(d, k); L = math.hypot(cx - x, cy - y) or 1
            o.setdefault(tag, {'v': [], 'to': []})
            o[tag]['v'].append(math.hypot(vx, vy)); o[tag]['to'].append((vx * (cx - x) + vy * (cy - y)) / L)
print(f"{path.split('/')[-1][:24]:24s} zone catches {len(air)}, air time p50 {q(air)} s | three defenders nearest the catch point:")
for tag in ('throw', '+0.3', '+0.6', 'catch'):
    if tag in o: print(f"  {tag:6s} speed p50 {q(o[tag]['v'])} | toward the catch point p25/50/75 {q(o[tag]['to'], .25)}/{q(o[tag]['to'])}/{q(o[tag]['to'], .75)} yd/s")
