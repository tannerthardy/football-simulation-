"""Sideline tackle attempts (2026-11-24), for sideline-tap.mts output. Measurement only.
By the carrier's distance to the near sideline: miss rate; within 3 yd, by whether the tackler is inside him, by the
carrier's velocity toward the sideline, the tackler's approach (relative position and velocity 0.5 s before), and the
attempt kind. Usage: python3 -I sideline-an.py SIDE.json [--list]"""
import json, sys, collections, math
E = [e for e in json.load(open(sys.argv[1]))['events']]
def rate(X): m = sum(e['type'] == 'missed_tackle' for e in X); return f"{m}/{len(X)} = {m / max(1, len(X)):.2f}"
def q(v, p=.5): v = sorted(x for x in v if x is not None); return round(v[int(p * (len(v) - 1))], 2) if v else None
op = lambda e: e['near5'] <= 1
print('attempts', len(E))
for lab, lo, hi in [('<=3 yd', 0, 3), ('3-6', 3, 6), ('6-10', 6, 10), ('>10', 10, 99)]:
    X = [e for e in E if lo <= e['sideDist'] < hi]
    print(f"  carrier {lab:<7} all {rate(X):<16} open field (<=1 other defender within 5) {rate([e for e in X if op(e)])}")
S = [e for e in E if e['sideDist'] < 3]
print('\nwithin 3 yd of the sideline')
for lab, keep in [('tackler inside him', lambda e: e['inside']), ('tackler outside (sideline side)', lambda e: not e['inside'])]:
    X = [e for e in S if keep(e)]; print(f"  {lab:<32} {rate(X)}")
for lab, keep in [('carrier heading to the sideline (vOut > 1)', lambda e: e['car']['vOut'] > 1), ('carrier straight upfield (|vOut| <= 1)', lambda e: abs(e['car']['vOut']) <= 1), ('carrier cutting back inside (vOut < -1)', lambda e: e['car']['vOut'] < -1)]:
    X = [e for e in S if keep(e)]; print(f"  {lab:<44} {rate(X)}")
for k in ('missed_tackle', 'tackle_wrap'):
    X = [e for e in S if e['type'] == k]
    if not X: continue
    h5 = [next((h for h in e['hist'] if abs(h['t'] + 0.5) < 0.051), None) for e in X]
    print(f"  {k:<14} n {len(X):>3} | detail {dict(collections.Counter(e['detail'] for e in X).most_common(4))} | tackler pos {dict(collections.Counter(e['defPos'] for e in X).most_common(5))}")
    print(f"      at the attempt: tackler ahead {q([e['def']['up'] for e in X])} yd, outside {q([e['def']['out'] for e in X])} yd; tackler v up/out {q([e['def']['vUp'] for e in X])} / {q([e['def']['vOut'] for e in X])}; carrier v up/out {q([e['car']['vUp'] for e in X])} / {q([e['car']['vOut'] for e in X])}")
    print(f"      0.5 s before: tackler ahead {q([h['d'][0] for h in h5 if h])} yd, outside {q([h['d'][1] for h in h5 if h])} yd, v up/out {q([h['d'][2] for h in h5 if h])} / {q([h['d'][3] for h in h5 if h])}")
    print(f"      yards after p50 {q([e['yardsAfter'] for e in X])}; play ends within 1 yd of the sideline {sum(1 for e in X if e['endSideDist'] is not None and e['endSideDist'] < 1)}/{len(X)}; open field {sum(op(e) for e in X)}")
if '--list' in sys.argv:
    for e in S:
        if e['type'] == 'missed_tackle': print(f"  game {e['game']} play {e['play']} t {e['t']} {e['ptype']} {e['carrierPos']} vs {e['defPos']} {e['detail']} side {e['sideDist']} inside {e['inside']} def up/out {e['def']['up']}/{e['def']['out']} v {e['def']['vUp']}/{e['def']['vOut']} car v {e['car']['vUp']}/{e['car']['vOut']} after {e['yardsAfter']}")
