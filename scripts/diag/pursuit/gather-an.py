"""Summary of gather-tap.mts files: python3 -I gather-an.py GLOB"""
import json, glob, sys, collections
def q(v, p=.5): v = sorted(x for x in v if x is not None); return round(v[int(p * (len(v) - 1))], 2) if v else None
R = [r for f in sorted(glob.glob(sys.argv[1])) for r in json.load(open(f))]
for pt in ('catch', 'run'):
    for w in ('ahead', 'beside', 'behind', 'carrier slow'):
        X = [r for r in R if r['ptype'] == pt and r['where'] == w]
        if not X: continue
        fast = [r for r in X if r['ds'] >= 6]
        nx = collections.Counter(r['next'] or 'none' for r in X)
        print(f"{pt:<5} {w:<12} n {len(X):>4} | entry distance p50 {q([r['dist'] for r in X])} (fast >= 6 yd/s: n {len(fast)}, p50 {q([r['dist'] for r in fast])})"
              f" | his speed at entry {q([r['ds'] for r in X])} -> +0.3 {q([r.get('sp03') for r in X])} -> +0.5 {q([r.get('sp05') for r in X])} | approach p50 {q([r['appr'] for r in X])}"
              f" | next attempt made {100*nx['made']/len(X):.0f}% missed {100*nx['missed']/len(X):.0f}%")
