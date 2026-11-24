"""Summary of dl-shed-tap.mts (2026-11-24). Per release, his 0.5 s after the shed: share of ticks by request source
(pursuit / fit) and tag, commanded speed fraction, commanded facing off commanded travel, command vs bearing to the
carrier, and how often the carrier is past the LOS / in his gap. Usage: python3 -I dl-shed-an.py OUT.json"""
import json, sys, collections
R = json.load(open(sys.argv[1]))['rows']
def q(v, p=.5): v = sorted(x for x in v if x is not None); return v[int(p * (len(v) - 1))] if v else None
T = [t for r in R for t in r['ticks'] if not t['engaged']]
print('releases', len(R), 'ticks (free of a block)', len(T), '| jobs', dict(collections.Counter((r['job'] or {}).get('kind') for r in R).most_common()))
src = collections.Counter(t['src'] for t in T); print('request source', {k: f'{100*v/len(T):.0f}%' for k, v in src.items()})
print('behaviour', dict(collections.Counter(t['beh'] for t in T).most_common(4)))
print('fit/shed tags (any, * = new this tick)', dict(collections.Counter(g.rstrip('*') for t in T for g in t['tags']).most_common(6)))
for lab, X in [('fit', [t for t in T if t['src'] == 'fit']), ('pursuit', [t for t in T if t['src'] == 'pursuit'])]:
    if not X: continue
    print(f"  {lab:<8} n {len(X):>5} | commanded speed / vmax p50 {q([t['cmdFrac'] for t in X])} | his speed p50 {q([t['speed'] for t in X])}"
          f" | commanded facing off commanded travel p50 {q([t['faceOff'] for t in X])} | body off travel p50 {q([t['bodyOff'] for t in X])}"
          f" | command off the bearing to the carrier p50 {q([t['cmdToCarrier'] for t in X])}"
          f" | carrier past the LOS {100*sum(1 for t in X if t['carrierPast'])/len(X):.0f}% | carrier within 2.5 yd of his gap {100*sum(1 for t in X if t['carrierInGap'])/len(X):.0f}% | carrier dist p50 {q([t['carrierDist'] for t in X])}")
for el in (0.0, 0.25, 0.5):
    X = [t for t in T if abs(t['el'] - el) < 0.026]
    if X: print(f"  +{el:.2f} s n {len(X)}: pursuit {100*sum(t['src']=='pursuit' for t in X)/len(X):.0f}%, cmd/vmax {q([t['cmdFrac'] for t in X])}, speed {q([t['speed'] for t in X])}, carrier past LOS {100*sum(1 for t in X if t['carrierPast'])/len(X):.0f}%")
