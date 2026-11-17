"""Deep defenders relative to the eventual catch point at the snap, the release and the catch, NFL vs sim, by family.
Deep defender: 10+ yd beyond the LOS at the release. Nearest / second nearest to the catch point at the release.
usage: deep-flight.py --sim DIR --nfl NFL"""
import sys, json, glob, math, gzip
from collections import Counter, defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
mean = lambda v: sum(v) / len(v) if v else float('nan')
FAM = {'Cover-2': 'cover2', 'Cover-3': 'cover3', 'Cover-3 Seam': 'cover3', 'Quarters': 'cover4', 'Cover-6 Right': 'cover6', 'Cover 6-Left': 'cover6'}
def measure(P, cp, k0, kr, kc, dt):
    """P: list of (x,y) per frame; returns snap/release/catch lat & depth to cp, flight closing, start lag, speed."""
    g = lambda k: (abs(P[k][1] - cp[1]), P[k][0] - cp[0])
    lat_r = abs(P[kr][1] - cp[1]); start = None; sp = []
    for k in range(kr, kc):
        vy = (P[k + 1][1] - P[k][1]) / dt; vx = (P[k + 1][0] - P[k][0]) / dt
        sp.append(math.hypot(vx, vy))
        toward = -vy * math.copysign(1, P[k][1] - cp[1])
        if start is None and toward > 1: start = (k - kr) * dt
    return dict(snap=g(k0), rel=g(kr), cat=g(kc), close=lat_r - abs(P[kc][1] - cp[1]), lag=start, spd=mean(sp))
def summarise(name, R):
    by = defaultdict(list)
    for r in R: by[r['fam']].append(r)
    for fam in ('cover2', 'cover3', 'cover4', 'cover6'):
        S = by.get(fam, [])
        if not S: continue
        out = [f"{name} {fam} n {len(S)}"]
        for w in ('n1', 'n2'):
            M = [r[w] for r in S if r.get(w)]
            if not M: continue
            f = lambda key, j: q([m[key][j] for m in M])
            out.append(f"{w}: lat snap/rel/catch {f('snap', 0):.1f}/{f('rel', 0):.1f}/{f('cat', 0):.1f} depth {f('snap', 1):+.1f}/{f('rel', 1):+.1f}/{f('cat', 1):+.1f} | flight close {q([m['close'] for m in M]):.1f} lag {q([m['lag'] for m in M if m['lag'] is not None]):.2f} (none {mean([m['lag'] is None for m in M]):.0%}) spd {q([m['spd'] for m in M]):.1f}")
        print(' | '.join(out[:1]) + '\n    ' + '\n    '.join(out[1:]))
        if S and 'mode' in S[0]:
            md = Counter(r['mode'] for r in S); sn = mean([r['seen'] for r in S]); lm = [r['lmlat'] for r in S if r['lmlat'] is not None]
            print(f"    sim n1 mode at release: " + ', '.join(f'{k} {v / len(S):.0%}' for k, v in md.most_common(4)) + f" | seen the flight by the catch {sn:.0%} | landmark lat to catch point p50 {q(lm):.1f} (rel lat minus landmark lat p50 {q([r['n1']['rel'][0] - r['lmlat'] for r in S if r['lmlat'] is not None]):+.1f})")
R = []
if '--sim' in sys.argv:
    for p in sorted(glob.glob(sys.argv[sys.argv.index('--sim') + 1] + '/cover*.json')):
        for r in json.load(open(p)):
            fr = r['fr']; dt = (fr[-1]['t'] - fr[0]['t']) / max(1, len(fr) - 1)
            kr = min(range(len(fr)), key=lambda k: abs(fr[k]['t'] - r['throwAt'])); kc = min(range(len(fr)), key=lambda k: abs(fr[k]['t'] - r['catchAt']))
            if kc - kr < 2: continue
            cp = (r['cp']['x'], r['cp']['y'])
            deep = [d for d in fr[kr]['d'] if d['x'] >= 10]
            deep.sort(key=lambda d: math.hypot(d['x'] - cp[0], d['y'] - cp[1]))
            row = dict(fam=r['coverage'])
            for w, d in zip(('n1', 'n2'), deep[:2]):
                P = [next(x for x in f['d'] if x['i'] == d['i']) for f in fr]; P = [(x['x'], x['y']) for x in P]
                row[w] = measure(P, cp, 0, kr, kc, dt)
            if deep:
                d = deep[0]; row['mode'] = f"{d['cls']}{'/deep' if d['deep'] else ''}{'/match ' + d['match'] if d['match'] else ''}"
                row['seen'] = next(x for x in fr[kc]['d'] if x['i'] == d['i'])['seen']
                row['lmlat'] = abs(d['lm']['y'] - cp[1]) if d['lm'] else None
            R.append(row)
    summarise('sim', R)
if '--nfl' in sys.argv:
    R = []
    for line in gzip.open(sys.argv[sys.argv.index('--nfl') + 1], 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        fam = FAM.get((raw.get('cell') or {}).get('coverage'))
        ev = raw.get('events') or {}
        if fam is None or 'catch' not in ev or 'pass_forward' not in ev or raw.get('target') is None: continue
        p = Play(raw); kr, kc = p.k(ev['pass_forward']), p.k(ev['catch'])
        if kc - kr < 2: continue
        cpos = p.pos(raw['target'], kc)
        if cpos[0] is None: continue
        cp = (cpos[0], cpos[1]); dt = p.dt
        deep = [i for i in p.who('D') if p.pos(i, kr)[0] is not None and p.pos(i, kr)[0] >= 10]
        deep.sort(key=lambda i: math.hypot(p.pos(i, kr)[0] - cp[0], p.pos(i, kr)[1] - cp[1]))
        row = dict(fam=fam)
        for w, i in zip(('n1', 'n2'), deep[:2]):
            P = [p.pos(i, k) for k in range(kc + 1)]
            if any(x[0] is None for x in P): continue
            row[w] = measure(P, cp, 0, kr, kc, dt)
        R.append(row)
    summarise('NFL', R)
