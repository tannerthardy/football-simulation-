"""Open-field geometry on the common play format (NFL tracking or sim), one
operator for both. When the runner first reaches D yd past the line: how many
defenders are downfield of him, how deep is the deepest, and how many could
reach his actual later path under one shared, generous movement model. Plus
how often runs that reach D keep going. A place to look, not a target.

usage: geometry.py FILE.jsonl.gz [--sim-trace]   (--sim-trace: open-field traces with a 'common' field)
"""
import gzip, json, math, sys
from collections import Counter

VMAX, TAU, REACT, REACH = 9.5, 0.9, 0.2, 1.2   # same for every player and source


def plays(path, trace):
    for line in gzip.open(path, 'rt'):
        if not line.strip(): continue
        r = json.loads(line)
        if trace:
            if 'common' not in r: continue
            r = r['common']
        if r.get('kind') == 'run' and r.get('carrier') is not None:
            yield r


def reach_time(p0, v0, q):
    dx, dy = q[0] - p0[0], q[1] - p0[1]
    D = math.hypot(dx, dy) - REACH
    if D <= 0: return 0.0
    u0 = max(0.0, (v0[0] * dx + v0[1] * dy) / (D + REACH))
    # Distance covered: VMAX t - (VMAX-u0) TAU (1 - e^{-t/TAU}); bisection.
    lo, hi = 0.0, 20.0
    for _ in range(40):
        m = (lo + hi) / 2
        if VMAX * m - (VMAX - u0) * TAU * (1 - math.exp(-m / TAU)) >= D: hi = m
        else: lo = m
    return hi + REACT


def analyze(path, trace):
    out = {D: Counter() for D in (5, 10)}; rows = {D: [] for D in (5, 10)}
    gains = []
    for p in plays(path, trace):
        xy, c, dt = p['xy'], p['carrier'], p.get('dt', .1)
        gains.append(p['yards'])
        n = len(p['players'])
        D_ = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
        for D in (5, 10):
            k = next((k for k in range(len(xy)) if xy[k][2 * c] is not None and xy[k][2 * c] >= D), None)
            if k is None: continue
            cx, cy = xy[k][2 * c], xy[k][2 * c + 1]
            ahead, depth, able = 0, 0.0, 0
            k0 = max(0, k - 2)
            for d in D_:
                x, y = xy[k][2 * d], xy[k][2 * d + 1]
                if x is None: continue
                if x > cx: ahead += 1; depth = max(depth, x - cx)
                x0, y0 = xy[k0][2 * d], xy[k0][2 * d + 1]
                v = ((x - x0) / ((k - k0) * dt), (y - y0) / ((k - k0) * dt)) if x0 is not None and k > k0 else (0, 0)
                for kk in range(k + 1, len(xy)):
                    q = xy[kk][2 * c], xy[kk][2 * c + 1]
                    if q[0] is None: break
                    if reach_time((x, y), v, q) <= (kk - k) * dt: able += 1; break
            rows[D].append((ahead, depth, able, p['yards']))
    n = len(gains)
    print(f"{path}: runs {n}  mean {sum(gains)/n:.2f}  10+ {100*sum(g>=10 for g in gains)/n:.1f}%  20+ {100*sum(g>=20 for g in gains)/n:.1f}%  40+ {100*sum(g>=40 for g in gains)/n:.2f}%")
    for lo in (10, 15, 20, 30):
        k = [g for g in gains if g >= lo]
        if k: print(f"   P(40+ | {lo}+) = {sum(g>=40 for g in k)}/{len(k)} = {sum(g>=40 for g in k)/len(k):.2f}")
    for D in (5, 10):
        R = rows[D]
        if not R: continue
        med = lambda xs: sorted(xs)[len(xs) // 2]
        print(f"  reached {D} yd: {len(R)} ({100*len(R)/n:.1f}% of runs)")
        print(f"    defenders downfield of runner: median {med([r[0] for r in R])}  dist {dict(sorted(Counter(min(r[0], 6) for r in R).items()))}")
        print(f"    deepest defender ahead (yd): median {med([r[1] for r in R]):.1f}")
        print(f"    defenders able to reach his later path: median {med([r[2] for r in R])}  dist {dict(sorted(Counter(min(r[2], 6) for r in R).items()))}")
        print(f"    final gain >= {D+15}: {100*sum(r[3] >= D + 15 for r in R)/len(R):.1f}%   >= 40: {100*sum(r[3] >= 40 for r in R)/len(R):.1f}%")
        for a in range(0, 4):
            S = [r for r in R if r[2] == a] if a < 3 else [r for r in R if r[2] >= 3]
            if S: print(f"      able={'%d' % a if a < 3 else '3+'}: n {len(S)}  gain>= {D+15}: {100*sum(r[3] >= D + 15 for r in S)/len(S):.0f}%")


analyze(sys.argv[1], '--sim-trace' in sys.argv)
