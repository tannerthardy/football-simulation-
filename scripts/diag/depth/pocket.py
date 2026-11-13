"""The quarterback in the pocket, one operator for NFL tracking and sim common
plays (dropbacks without play action): his depth behind the line at 1.0 s,
at the throw and its change over the last 0.6 s before it (+ = stepped up),
and the same split by whether an edge rusher is level with or deeper than
him at the throw (within 4 yd laterally).
usage: pocket.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    o = {'all': {'d1': [], 'dt': [], 'up': []}, 'edge at QB depth': {'d1': [], 'dt': [], 'up': []}}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events') or {}; tt = ev.get('pass_forward')
        if tt is None or tt < 1.2 or ev.get('play_action') is not None: continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if len(qbs) != 1: continue
        qb = qbs[0]; kt = p.k(tt); k1 = p.k(1.0); k6 = p.k(tt - .6)
        if p.pos(qb, kt)[0] is None or p.pos(qb, k6)[0] is None: continue
        dt, d6 = -p.pos(qb, kt)[0], -p.pos(qb, k6)[0]
        rows = [o['all']]
        qy = p.pos(qb, kt)[1]
        if any(p.pos(d, kt)[0] is not None and -p.pos(d, kt)[0] >= dt - .5 and abs(p.pos(d, kt)[1] - qy) <= 4
               for d in p.who('D')): rows.append(o['edge at QB depth'])
        for r in rows:
            r['d1'].append(-p.pos(qb, k1)[0]); r['dt'].append(dt); r['up'].append(d6 - dt)
    print(path.split('/')[-1][:26])
    for k, r in o.items():
        print(f"  {k:17s} n {len(r['dt']):5d} | depth at 1.0 s {q(r['d1'])} | at the throw {q(r['dt'])} | stepped up over the last 0.6 s p50 {q(r['up'])} p75 {q(r['up'], .75)}")
