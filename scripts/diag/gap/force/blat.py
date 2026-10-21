"""Where B is and where the outside-aligned DBs are at kd, relative to the
offense's snap surface (absolute geometry, not relative to B). Same
population/definitions as outfate.py. usage: blat.py NFL SIM"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
ns = {}; exec(compile(open('scripts/diag/gap/force/outfate.py').read().split('\nfor path in sys.argv')[0], 'of', 'exec'), ns)
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
FAM = ns['FAM']
def geo(raw):
    p = Play(raw); c = raw['carrier']; h = p.events['handoff']
    s = 1 if p.pos(c, p.k(h + 1.0))[1] - p.pos(c, p.k(h))[1] >= 0 else -1; by = raw['ball_y']
    L = lambda y: (y - by) * s
    line = [i for i in p.who('D') if p.pos(i, 0)[0] is not None and -.5 <= p.pos(i, 0)[0] <= 2 and abs(p.pos(i, 0)[1] - by) <= 7 and L(p.pos(i, 0)[1]) > 0]
    k12 = p.k(1.2)
    cand = [i for i in p.who('O') if i != c and p.players[i]['group'] in ('OL', 'TE', 'RB') and p.pos(i, 0)[0] is not None and p.pos(i, k12)[0] is not None]
    edge = max(line, key=lambda i: L(p.pos(i, 0)[1])); kicker = max(cand, key=lambda i: (p.pos(i, k12)[1] - p.pos(i, 0)[1]) * s)
    kd = next(k for k in range(p.k(h), p.k(p.end) + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= -2)
    ol = [L(p.pos(i, 0)[1]) for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None]; tack = max(ol)
    tes = [L(p.pos(i, 0)[1]) for i in p.who('O', 'TE') if p.pos(i, 0)[0] is not None and p.pos(i, 0)[0] >= -2.5 and 0 < L(p.pos(i, 0)[1]) - tack <= 2.6]
    surf = max(tes) if tes else tack
    o = [d for d in p.who('D', 'DB') if p.pos(d, 0)[0] is not None and p.pos(d, 0)[0] <= 8 and surf + .5 <= L(p.pos(d, 0)[1]) <= surf + 9]
    return {'edge': L(p.pos(edge, kd)[1]) - surf, 'kick': L(p.pos(kicker, kd)[1]) - surf, 'B': max(L(p.pos(edge, kd)[1]), L(p.pos(kicker, kd)[1])) + 2 - surf,
            'run': L(p.pos(c, kd)[1]) - surf, 'db0': [L(p.pos(d, 0)[1]) - surf for d in o], 'dbk': [L(p.pos(d, kd)[1]) - surf for d in o], 'dbx0': [p.pos(d, 0)[0] for d in o], 'dbxk': [p.pos(d, kd)[0] for d in o]}
for path in sys.argv[1:]:
    tag = 'NFL' if 'nfl' in path else 'sim'
    R = []
    for l in gzip.open(path, 'rt'):
        raw = json.loads(l)
        if ns['one'](raw): R.append(geo(raw))
    f = lambda k: f"{q([r[k] for r in R],.25)}/{q([r[k] for r in R])}/{q([r[k] for r in R],.75)}"
    print(f"{tag} n={len(R)} at kd, lateral minus snap surface: edge {f('edge')} kicker {f('kick')} B {f('B')} runner {f('run')}")
    d0 = [v for r in R for v in r['db0']]; dk = [v for r in R for v in r['dbk']]; x0 = [v for r in R for v in r['dbx0']]; xk = [v for r in R for v in r['dbxk']]
    print(f"     outside-aligned DBs n={len(d0)}: snap lateral {q(d0,.25)}/{q(d0)}/{q(d0,.75)} depth {q(x0)} -> at kd lateral {q(dk,.25)}/{q(dk)}/{q(dk,.75)} depth {q(xk,.25)}/{q(xk)}/{q(xk,.75)} | lateral change p50 {q([b-a for a,b in zip(d0,dk)])}")
