"""The nearest defender in front of the receiver at the catch (downfield,
within 10 yd laterally), one operator for NFL tracking and sim common plays.
Completed passes against zone/man: his distance at the catch, his velocity
toward the receiver (yd/s, + closing) and his downfield velocity (yd/s, +
retreating toward his own goal) at the catch and 0.3 / 0.6 / 1.0 s after,
and the receiver's YAC. Split by how many defenders are in front.
usage: frontman.py FILE [--ytg60]"""
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
    tc = (raw.get('events') or {}).get('catch'); tt = (raw.get('events') or {}).get('pass_forward')
    if tc is None or tt is None or tc <= tt: continue
    fam = coverage_family((raw.get('cell') or {}).get('coverage'))
    if fam != 'zone': continue
    p = Play(raw); r = raw['target']; k = p.k(tc); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if k >= end: continue
    rx, ry = p.pos(r, k)
    if rx is None: continue
    front = [d for d in p.who('D') if p.pos(d, k)[0] is not None and p.pos(d, k)[0] > rx + .5 and abs(p.pos(d, k)[1] - ry) <= 10]
    if not front: continue
    d = min(front, key=lambda d: p.dist(d, r, k))
    yac = (p.pos(r, end)[0] or rx) - rx
    g = o.setdefault('1 in front' if len(front) == 1 else '2+ in front', {'dist': [], 'yac': [], 'rows': {}})
    g['dist'].append(p.dist(d, r, k)); g['yac'].append(yac)
    for tag, at in (('throw', tt), ('throw+0.3', tt + .3), ('catch', tc), ('+0.3', tc + .3), ('+0.6', tc + .6), ('+1.0', tc + 1.0)):
        if tag == 'throw+0.3' and at >= tc: continue
        kk = p.k(at)
        if kk > end - 1: continue
        a, b = max(0, kk - 2), min(end, kk + 2)
        (xa, ya), (xb, yb) = p.pos(d, a), p.pos(d, b)
        if None in (xa, xb): continue
        vx, vy = (xb - xa) / ((b - a) * p.dt), (yb - ya) / ((b - a) * p.dt)
        cx, cy = p.pos(r, max(kk, k)) if tag.startswith('throw') else p.pos(r, kk); x, y = p.pos(d, kk)
        if cx is None: continue
        L = math.hypot(cx - x, cy - y) or 1
        row = g['rows'].setdefault(tag, {'to': [], 'down': [], 'gap': []})
        row['to'].append((vx * (cx - x) + vy * (cy - y)) / L); row['down'].append(vx); row['gap'].append(L)
print(path.split('/')[-1][:26], '(zone catches; nearest defender in front of the receiver)')
for key in sorted(o):
    g = o[key]
    print(f"  {key}: {len(g['yac'])} catches, distance at catch p50 {q(g['dist'])}, YAC p50/p90 {q(g['yac'])}/{q(g['yac'], .9)}")
    for tag in ('throw', 'throw+0.3', 'catch', '+0.3', '+0.6', '+1.0'):
        if tag in g['rows']:
            r = g['rows'][tag]
            print(f"    {tag:9s} toward the receiver p25/50/75 {q(r['to'], .25)}/{q(r['to'])}/{q(r['to'], .75)} yd/s | downfield (retreating) p50 {q(r['down'])} | gap p50 {q(r['gap'])}")
