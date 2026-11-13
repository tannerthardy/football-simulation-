"""Who is in front of the receiver at the catch, one operator for NFL tracking
and sim common plays. For completed passes by coverage family: defenders
downfield of the receiver (x ahead of him) within a 10-yd-wide lane either
side, how far the nearest such defender is, and YAC by that count. A catch
with nobody in front is where long gains come from.
usage: infront.py FILE [--ytg60]"""
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
    tc = (raw.get('events') or {}).get('catch')
    if tc is None: continue
    fam = coverage_family((raw.get('cell') or {}).get('coverage'))
    if fam not in ('man', 'zone'): continue
    p = Play(raw); r = raw['target']; k = p.k(tc); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if k >= end: continue
    rx, ry = p.pos(r, k)
    if rx is None: continue
    front = [math.hypot(p.pos(d, k)[0] - rx, p.pos(d, k)[1] - ry) for d in p.who('D')
             if p.pos(d, k)[0] is not None and p.pos(d, k)[0] > rx + .5 and abs(p.pos(d, k)[1] - ry) <= 10]
    yac = (p.pos(r, end)[0] or rx) - rx
    g = o.setdefault(fam, {'n': [], 'near': [], 'yac': {}})
    g['n'].append(len(front)); g['near'].append(min(front) if front else 99)
    g['yac'].setdefault(min(len(front), 3), []).append(yac)
print(path.split('/')[-1][:26])
for fam, g in o.items():
    n = len(g['n'])
    by = ' | '.join(f"{c}{'+' if c == 3 else ''} in front {100 * len(v) / n:.0f}% YAC p50/p90 {q(v)}/{q(v, .9)}" for c, v in sorted(g['yac'].items()))
    print(f"  {fam:4s} catches {n}: defenders in front p50 {q(g['n'])}, nearest in front p50 {q([x for x in g['near'] if x < 99])} yd | {by}")
