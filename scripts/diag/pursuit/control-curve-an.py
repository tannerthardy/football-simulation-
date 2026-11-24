"""Summary of control-curve-tap.mts files: python3 -I control-curve-an.py GLOB"""
import json, glob, sys
R = [r for f in sorted(glob.glob(sys.argv[1])) for r in json.load(open(f))]
print(f"samples {len(R)} (engaged run defenders within 2 yd of the carrier, every 0.1 s)")
bins = [(-9, -0.6), (-0.6, -0.4), (-0.4, -0.2), (-0.2, 0), (0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 9)]
for lo, hi in bins:
    X = [r for r in R if lo <= r['control'] < hi]
    if not X: continue
    solo = [r for r in X if r['helpers'] == 0]
    f = lambda Y, k: f"{100*sum(1 for r in Y if k(r))/max(1,len(Y)):.0f}%"
    print(f"  control [{lo:>4}, {hi:>4})  n {len(X):>5} (solo {len(solo):>5}) | rep ends within 0.5 s {f(X, lambda r: r['ended'])} (solo {f(solo, lambda r: r['ended'])})"
          f" | attempt on the carrier within 1.0 s {f(X, lambda r: r['attempt'])} (solo {f(solo, lambda r: r['attempt'])}), of which wraps {f(X, lambda r: r['attempt'] == 'wrap')}")
