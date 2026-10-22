"""Who makes first contact on a run, one operator for NFL tracking and sim
common plays. At the run's first contact, the nearest defender's group (DL /
LB / DB), the carrier's yards past the line there, and time from the snap;
by run family. For DB first contacts: how deep that DB was at the snap and at
0.5 s / 1.0 s, and how many box defenders (DL/LB) were within 3 yd of the
carrier at contact (box beaten vs the DB arriving first).
usage: firstgroup.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
mean = lambda v: round(sum(v) / len(v), 2) if v else None
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'))
        if fam not in ('inside_zone', 'outside_zone', 'gap_pull', 'man_duo'): continue
        t = (raw.get('events') or {}).get('first_contact')
        p = Play(raw); c = raw['carrier']
        if t is None or not p.live(t): continue
        k = p.k(t)
        if p.pos(c, k)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        d = min(ds, key=lambda d: p.dist(d, c, k))
        grp = p.players[d]['group']
        if grp not in ('DL', 'LB', 'DB'): continue
        o = g.setdefault(fam, {'grp': [], 'x': {}, 't': [], 'db0': [], 'db5': [], 'db10': [], 'box3': []})
        o['grp'].append(grp); o['x'].setdefault(grp, []).append(p.pos(c, k)[0]); o['t'].append(t)
        if grp == 'DB':
            o['db0'].append(p.pos(d, 0)[0])
            if p.live(.5): o['db5'].append(p.pos(d, p.k(.5))[0])
            if p.live(1.0): o['db10'].append(p.pos(d, p.k(1.0))[0])
            o['box3'].append(sum(1 for e in ds if p.players[e]['group'] in ('DL', 'LB') and p.dist(e, c, k) <= 3))
    print(path.split('/')[-1][:26])
    for fam, o in g.items():
        n = len(o['grp'])
        share = ' '.join(f"{x} {100 * o['grp'].count(x) / n:.0f}% at +{q(o['x'].get(x, []))}" for x in ('DL', 'LB', 'DB'))
        print(f"  {fam:12s} n {n:4d} | {share} yd | DB first: depth at snap {q(o['db0'])} 0.5s {q(o['db5'])} 1.0s {q(o['db10'])}, box men within 3 yd {mean(o['box3'])}")
