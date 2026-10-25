"""Where the yards after the catch come from, one operator for NFL tracking and
sim common plays. For completed passes by coverage family: yards from the
catch to first contact (free running) and from first contact to the whistle
(after contact), their medians and 90th percentiles, and the share of 10+
yard YAC plays whose yards came mostly before contact. Plays without a
first-contact event count all yards as free running.
usage: yacsplit.py FILE [--ytg60]"""
import gzip, json, sys
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
    tc = ev.get('catch')
    if tc is None: continue
    fam = coverage_family((raw.get('cell') or {}).get('coverage'))
    if fam not in ('man', 'zone'): continue
    p = Play(raw); r = raw['target']; kc = p.k(tc); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if kc >= end: continue
    x0 = p.pos(r, kc)[0]; xe = p.pos(r, end)[0]
    if x0 is None or xe is None: continue
    tf = ev.get('first_contact')
    kf = p.k(tf) if tf is not None and tf >= tc else end
    xf = p.pos(r, min(kf, end))[0] or xe
    g = o.setdefault(fam, {'free': [], 'after': [], 'yac': [], 'contact': 0})
    g['free'].append(xf - x0); g['after'].append(xe - xf); g['yac'].append(xe - x0); g['contact'] += tf is not None and tf >= tc
print(path.split('/')[-1][:26])
for fam, g in o.items():
    n = len(g['yac']); big = [i for i in range(n) if g['yac'][i] >= 10]
    mostly_free = sum(1 for i in big if g['free'][i] >= g['after'][i])
    print(f"  {fam:4s} catches {n} (contact after the catch {100 * g['contact'] / n:.0f}%): YAC p50/p90 {q(g['yac'])}/{q(g['yac'], .9)} | "
          f"catch to contact p50/p90 {q(g['free'])}/{q(g['free'], .9)} | after contact p50/p90 {q(g['after'])}/{q(g['after'], .9)} | "
          f"YAC 10+ {100 * len(big) / n:.1f}%, mostly before contact {100 * mostly_free / max(1, len(big)):.0f}%")
