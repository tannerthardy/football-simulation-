"""Zone catches under 10 air yards: the nearest underneath defender (within 10 yd of the LOS at the release), NFL vs sim.
At the catch: distance to the catcher, in front / level / behind, closing speed; time from the catch to the first
defender within 1 yd and whether he was underneath or deep at the release. And where the nearest underneath man
differs first: distance to the catch point at the release, ground closed during the flight, closing after the catch.
usage: und-ana.py --sim DIR [--sim0 DIR] --nfl NFL"""
import sys, json, glob, math, gzip
from collections import Counter
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
mean = lambda v: sum(v) / len(v) if v else float('nan')
FAM = {'Cover-2': 1, 'Cover-3': 1, 'Cover-3 Seam': 1, 'Quarters': 1, 'Cover-6 Right': 1, 'Cover 6-Left': 1}
def one(Dpos, C, kr, kc, dt, cp):
    """Dpos: {i: [(x,y)...]}, C: carrier positions from kc on (list index = frame)."""
    und = [i for i, P in Dpos.items() if P[kr][0] is not None and P[kr][0] < 10]
    if not und: return None
    dist = lambda i, k: math.hypot(Dpos[i][k][0] - C[k][0], Dpos[i][k][1] - C[k][1])
    n = min(und, key=lambda i: dist(i, kc)); P = Dpos[n]
    d = dist(n, kc); rel = P[kc][0] - C[kc][0]; pos = 'in front' if rel > 1 else 'behind' if rel < -1 else 'level'
    k2 = min(kc + 2, len(C) - 1)
    clos = (dist(n, kc) - dist(n, k2)) / ((k2 - kc) * dt) if k2 > kc and C[k2] and C[k2][0] is not None else float('nan')
    first = None
    for k in range(kc, len(C)):
        if C[k] is None or C[k][0] is None: break
        hit = [i for i, Q in Dpos.items() if len(Q) > k and Q[k][0] is not None and math.hypot(Q[k][0] - C[k][0], Q[k][1] - C[k][1]) <= 1]
        if hit: first = ((k - kc) * dt, 'underneath' if hit[0] in und else 'deep'); break
    # where the nearest underneath man (to the catch point at the release) differs
    m = min(und, key=lambda i: math.hypot(Dpos[i][kr][0] - cp[0], Dpos[i][kr][1] - cp[1])); Q = Dpos[m]
    dr = math.hypot(Q[kr][0] - cp[0], Q[kr][1] - cp[1]); dc = math.hypot(Q[kc][0] - cp[0], Q[kc][1] - cp[1])
    return dict(d=d, pos=pos, clos=clos, first=first, dr=dr, close=dr - dc, fl=(kc - kr) * dt)
def show(name, R):
    R = [r for r in R if r]
    fp = [r['first'] for r in R]
    print(f"{name}: n {len(R)} | nearest underneath at the catch: dist p50 {q([r['d'] for r in R]):.1f} | " + ', '.join(f"{k} {v / len(R):.0%}" for k, v in Counter(r['pos'] for r in R).most_common()) + f" | closing {q([r['clos'] for r in R if r['clos'] == r['clos']]):.1f} yd/s")
    got = [f for f in fp if f]
    print(f"    first within 1 yd: time p50 {q([f[0] for f in got]):.2f} s (none {mean([f is None for f in fp]):.0%}) | " + ', '.join(f"{k} {v / len(R):.0%}" for k, v in Counter(f[1] for f in got).most_common()))
    print(f"    nearest underneath to the catch point at the release: {q([r['dr'] for r in R]):.1f} yd; closed during the flight {q([r['close'] for r in R]):.1f} yd in {q([r['fl'] for r in R]):.2f} s ({q([r['close'] / max(.1, r['fl']) for r in R]):.1f} yd/s)")
def sim(d):
    R = []
    for p in sorted(glob.glob(d + '/cover*.json')):
        for r in json.load(open(p)):
            if r['cp']['x'] >= 10: continue
            fr = r['fr']; dt = (fr[-1]['t'] - fr[0]['t']) / max(1, len(fr) - 1)
            kr = min(range(len(fr)), key=lambda k: abs(fr[k]['t'] - r['throwAt'])); kc = min(range(len(fr)), key=lambda k: abs(fr[k]['t'] - r['catchAt']))
            if kc <= kr: continue
            D = {}
            for f in fr:
                for x in f['d']: D.setdefault(x['i'], []).append((x['x'], x['y']))
            C = [(f['c']['x'], f['c']['y']) if f.get('c') else None for f in fr]
            if C[kc] is None: C[kc] = (r['cp']['x'], r['cp']['y'])
            R.append(one(D, C, kr, kc, dt, (r['cp']['x'], r['cp']['y'])))
    return R
for flag in ('--sim0', '--sim'):
    if flag in sys.argv: show('sim ' + ('develop' if flag == '--sim0' else 'DEEP_BREAK'), sim(sys.argv[sys.argv.index(flag) + 1]))
if '--nfl' in sys.argv:
    R = []
    for line in gzip.open(sys.argv[sys.argv.index('--nfl') + 1], 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or (raw.get('cell') or {}).get('coverage') not in FAM: continue
        ev = raw.get('events') or {}
        if 'catch' not in ev or 'pass_forward' not in ev or raw.get('target') is None: continue
        p = Play(raw); kr, kc = p.k(ev['pass_forward']), p.k(ev['catch']); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
        if kc <= kr: continue
        cp = p.pos(raw['target'], kc)
        if cp[0] is None or cp[0] >= 10: continue
        D = {i: [p.pos(i, k) for k in range(end + 1)] for i in p.who('D')}
        C = [p.pos(raw['target'], k) for k in range(end + 1)]
        R.append(one(D, C, kr, kc, p.dt, cp))
    show('NFL', R)
