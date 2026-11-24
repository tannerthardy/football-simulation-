"""Summary of shed-facing-tap.mts files: python3 -I shed-facing-an.py GLOB"""
import json, glob, sys, collections
def q(v, p=.5): v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else None
R = [r for f in sorted(glob.glob(sys.argv[1])) for r in json.load(open(f))['rows']]
T = [t for r in R for t in r['ticks'] if not t['engaged']]
print(f"releases {len(R)}, free ticks {len(T)} | jobs {dict(collections.Counter(r['job'] for r in R).most_common())}")
for lab, X in [('+0.00-0.10 s', [t for t in T if t['el'] <= 0.1]), ('+0.15-0.50 s', [t for t in T if t['el'] > 0.1])]:
    if not X: continue
    print(f"  {lab}: n {len(X)} | velocity off his request p50 {q([t['vOff'] for t in X])} (>=60 deg {100*sum(1 for t in X if (t['vOff'] or 0) >= 60)/len(X):.0f}%) | speed {q([t['speed'] for t in X])} of requested {q([t['req'] for t in X])}"
          f" | facing asked off travel: decision {q([t['decOff'] for t in X])}, final {q([t['finOff'] for t in X])} | body off travel {q([t['bodyOffTravel'] for t in X])}, off the asked facing {q([t['bodyOffReq'] for t in X])}")
F = [t for t in T if (t['finOff'] or 0) > 30]
print(f"  ticks whose final facing is > 30 deg off the requested travel: {len(F)} of {len(T)}")
print(f"    set by stage: {dict(collections.Counter(t['setter'] for t in F).most_common())}")
print(f"    behaviour/kind: {dict(collections.Counter((t['beh'], t['kind']) for t in F).most_common(5))}")
print(f"    decision's facing technique: {dict(collections.Counter(t['tech'] for t in F).most_common(6))}")
