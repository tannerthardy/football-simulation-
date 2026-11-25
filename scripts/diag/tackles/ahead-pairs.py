"""Pairs and gates for uncontacted catches (ahead-man.mts outputs with the gate log). Usage:
python3 -I ahead-pairs.py OFF.json ON.json
(1) Every man who came inside 1.35 yd of an uncontacted catcher (on): his gate sequence from the tackle gates (compressed
runs) and his tackle events. (3) Pairs: catches with the same seed, play number, call, carrier and catch time and spot
in both arms (the same play up to the catch); those contacted off and uncontacted on, with the off first contact's
distance past the honest arm. (4) Trailers: the nearest unengaged defender behind the catcher at the catch, by position,
his top speed (vmax x speedScale) against the carrier's."""
import json, math, sys, statistics as st
from collections import Counter
OFF, ON = (json.load(open(p)) for p in sys.argv[1:3])
def key(a): return (a['seed'], a['play'], a['offLabel'], a['carSlot'], a['catchT'], a['x0'])
print('## (1) inside 1.35 yd with no wrap (on):')
inside = 0
for r in ON['rows']:
    F = r['frames']
    for i, d in enumerate(r['def']):
        m = min(math.hypot(f[1] - f[5][i][0], f[2] - f[5][i][1]) for f in F)
        if m > 1.35: continue
        inside += 1
        g = [x for x in r['gates'] if x[1] == d['slot']]
        seq = []
        for t, s, dd, why in g:
            if seq and seq[-1][0] == why: seq[-1][2] = t; seq[-1][3] = min(seq[-1][3], dd)
            else: seq.append([why, t, t, dd])
        ev = [e for e in r['devents'] if e[1] == d['slot']]
        print(f"  {r['seed']}/{r['play']} {d['slot']:5} ({d['pos']}) closest {m:.2f} yac {r['yac']}: " + ' > '.join(f"{w} {a:.2f}-{b:.2f}s min {dd:.2f}" for w, a, b, dd in seq) + (f" | events {ev}" if ev else ' | no tackle event'))
print(f"  men inside 1.35: {inside}")
print('## (3) pairs:')
A = {key(a): a for a in OFF['all']}; B = {key(a): a for a in ON['all']}
both = [k for k in A if k in B]
ch = [k for k in both if A[k]['wrapped'] and not B[k]['wrapped']]
rev = [k for k in both if not A[k]['wrapped'] and B[k]['wrapped']]
print(f"  catches off {len(A)}, on {len(B)}, same pre-catch play in both {len(both)}; contacted off / uncontacted on {len(ch)}; the reverse {len(rev)}; uncontacted in both {sum(1 for k in both if not A[k]['wrapped'] and not B[k]['wrapped'])}")
ov = [A[k]['first']['over'] for k in ch if A[k]['first']]
print(f"  off first contact on those: past the honest arm {sum(o > 0 for o in ov)} of {len(ov)} (p50 over {st.median(ov) if ov else None}); first contact t p50 {st.median([A[k]['first']['t'] for k in ch if A[k]['first']]) if ch else None}; YAC off p50 {st.median([A[k]['yac'] for k in ch]) if ch else None} -> on p50 {st.median([B[k]['yac'] for k in ch]) if ch else None}, mean {st.mean([A[k]['yac'] for k in ch]) if ch else 0:.1f} -> {st.mean([B[k]['yac'] for k in ch]) if ch else 0:.1f}")
for k in ch: print('   ', k[0], k[1], k[3], 'off first', A[k]['first'], 'yac', A[k]['yac'], '->', B[k]['yac'])
print('## (4) trailers (on, uncontacted):')
rs = []
for r in ON['rows']:
    f0 = r['frames'][0]
    beh = [(math.hypot(p[0] - f0[1], p[1] - f0[2]), i) for i, p in enumerate(f0[5]) if not p[7] and not p[8] and (p[0] - f0[1]) * r['dir'] <= 0]
    if beh: _, j = min(beh); rs.append((r['def'][j]['pos'], r['def'][j]['vmax'], r['carVmax'], r['car']))
for p, n in Counter(x[0] for x in rs).most_common():
    X = [x for x in rs if x[0] == p]
    print(f"  {p:5} n {n}: top p50 {st.median([x[1] for x in X]):.2f} vs carrier {st.median([x[2] for x in X]):.2f}; slower {sum(x[1] < x[2] for x in X)}")
