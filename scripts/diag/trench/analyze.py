import json, statistics as st, sys
reps = json.load(open(sys.argv[1]))
def at(r, t):
    s = [x for x in r['samples'] if x['t'] <= t + 1e-6]
    return s[-1] if s else None
rows = []
for r in reps:
    if len(r['samples']) < 10: continue
    dmax = max(x['disp'] for x in r['samples'])
    dur = r['samples'][-1]['t']
    rows.append((r, dmax, dur))
print('reps with >=0.5 s:', len(rows))
driven = [x for x in rows if x[1] >= 2.5]
held = [x for x in rows if x[1] < 1.0 and x[2] >= 1.5]
print('driven >= 2.5 yd:', len(driven), ' held < 1 yd over >= 1.5 s:', len(held))
def m(rs, f): 
    v = [f(r) for r in rs]; v = [x for x in v if x is not None]
    return f"{st.mean(v):7.2f} (med {st.median(v):6.2f})" if v else '-'
def smean(r, key, lo=0.0, hi=99):
    v = [x[key] for x in r['samples'] if lo <= x['t'] <= hi and x[key] is not None]
    return st.mean(v) if v else None
feats = {
 'duration s': lambda r: r['samples'][-1]['t'],
 'massB - massD (kg)': lambda r: r['massB'] - r['massD'],
 'pushB / pushD': lambda r: r['pushB'] / r['pushD'],
 'pushB+helpers/pushD (mass-scaled)': lambda r: (r['pushB'] + r['helperMass'] * r['pushB'] / r['massB']) / r['pushD'],
 'any helper': lambda r: 1.0 if max(x['helpers'] for x in r['samples']) > 0 else 0.0,
 'strength B rating': lambda r: r['strB'], 'strength D rating': lambda r: r['strD'],
 'mean control': lambda r: smean(r, 'control'),
 'mean availD': lambda r: smean(r, 'availD'), 'min availD': lambda r: min(x['availD'] for x in r['samples']),
 'mean availB': lambda r: smean(r, 'availB'),
 'mean leanD (along drive)': lambda r: smean(r, 'leanD'), 'mean leanB': lambda r: smean(r, 'leanB'),
 'mean feltD': lambda r: smean(r, 'feltD'),
 'mean postureD': lambda r: smean(r, 'postureD'), 'mean postureB': lambda r: smean(r, 'postureB'),
 'mean xiD': lambda r: smean(r, 'xiD'),
 'mean hand normal': lambda r: smean(r, 'normal'),
 'share hands actor=B': lambda r: smean(r, 'actorB'),
 'mean intentD along drive': lambda r: smean(r, 'intentD'), 'mean intentB': lambda r: smean(r, 'intentB'),
 'mean pushD intent': lambda r: smean(r, 'pushD'),
 'mean facingD (1=square to drive)': lambda r: smean(r, 'facingD'),
 'mean vD after 0.5s': lambda r: smean(r, 'vD', 0.5),
 'D falls during rep': lambda r: 1.0 if any(x['stateD'] != 'up' for x in r['samples']) else 0.0,
 'mean |phi|': lambda r: st.mean(abs(x['phi']) for x in r['samples']),
}
print(f"{'feature':38} {'driven':>22} {'held':>22}")
for k, f in feats.items():
    print(f"{k:38} {m([x[0] for x in driven], f):>22} {m([x[0] for x in held], f):>22}")
from collections import Counter
print('defender positions driven', Counter(x[0]['dPos'] for x in driven).most_common(), ' held', Counter(x[0]['dPos'] for x in held).most_common())
print('rep end driven', Counter(x[0]['why'] for x in driven).most_common(5))
print('concepts driven', Counter(x[0]['concept'] for x in driven).most_common(), ' all', Counter(x[0]['concept'] for x in rows).most_common())

print()
print('helper share of rep time (driven / held):', m([x[0] for x in driven], lambda r: st.mean(1.0 if s['helpers'] else 0.0 for s in r['samples'])), m([x[0] for x in held], lambda r: st.mean(1.0 if s['helpers'] else 0.0 for s in r['samples'])))
bins = {}
for r, _, _ in rows:
    for s_ in r['samples']:
        if s_['t'] < 0.5: continue
        ratio = (r['pushB'] + (r['helperMass'] * r['pushB'] / r['massB'] if s_['helpers'] else 0)) / r['pushD']
        k = min(int(ratio * 4) / 4, 2.5)
        bins.setdefault(k, []).append(s_['vD'])
print('defender velocity along drive (yd/s, + = driven back) by force ratio (blocker+helper / defender):')
for k in sorted(bins):
    v = sorted(bins[k]); print(f"  ratio {k:4.2f}+  n={len(v):6}  median {v[len(v)//2]:5.2f}  p90 {v[int(.9*len(v))]:5.2f}  share>1yd/s {sum(x>1 for x in v)/len(v):.2f}")
