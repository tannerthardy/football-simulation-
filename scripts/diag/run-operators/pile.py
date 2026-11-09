"""Zone runs, first contact (defender centre within 1.0 yd of the carrier after the handoff) at -1..+3 yd. From contact to the
end (NFL: events.end; sim: last frame), per frame: number of defenders within 1.0 yd; carrier forward speed (0.2 s central
difference) binned by that count; time from first contact until a 2nd / 3rd defender is within 1.0 yd. Same code NFL vs sim."""
import sys, json, gzip, math, statistics as st, collections
def plays(path):
    if path.endswith('.gz'):
        for l in gzip.open(path, 'rt'):
            p = json.loads(l)
            if p['kind'] != 'run' or p['carrier'] is None or p['cell'].get('concept') not in ('OUTSIDE ZONE', 'INSIDE ZONE'): continue
            end = p['events'].get('end')
            if not end: continue
            c = p['carrier']; X = p['xy']; D = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
            yield [(r[2*c], r[2*c+1]) for r in X], [[(r[2*i], r[2*i+1]) for i in D] for r in X], p['events'].get('handoff') or 0, min(int(round(end*10)), len(X)-1)
    else:
        for l in open(path):
            r = json.loads(l); yield [tuple(x) for x in r['car']], r['def'], r['handoff'], len(r['car'])-1
for path in sys.argv[1:]:
    V = collections.defaultdict(list); T2 = []; T3 = []; n = 0; no2 = 0
    for C, D, ho, e in plays(path):
        h = max(1, int(round(ho*10)))
        hit = next((f for f in range(h, e) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or not (-1 <= C[hit][0] < 3) or e - hit < 2: continue
        n += 1; t2 = t3 = None
        for f in range(hit, e):
            k = sum(math.dist(d, C[f]) <= 1.0 for d in D[f])
            if f + 1 <= e and f - 1 >= 0: V[min(k, 3)].append((C[min(f+1, e)][0] - C[f-1][0]) * 5)
            if k >= 2 and t2 is None: t2 = (f - hit) / 10
            if k >= 3 and t3 is None: t3 = (f - hit) / 10
        if t2 is None: no2 += 1
        else: T2.append(t2)
        if t3 is not None: T3.append(t3)
    print('==', path.split('/')[-1], 'contacts', n)
    for k in sorted(V):
        v = V[k]; print(f"   {k}{'+' if k == 3 else ''} defenders within 1 yd: {len(v)} frames, carrier fwd speed median {st.median(v):+.2f} yd/s, stalled (<0.5) {100*sum(x < .5 for x in v)/len(v):.0f}%")
    print(f"   2nd defender arrives: {100*len(T2)/n:.0f}% of contacts, median {st.median(T2):.1f} s after first contact; 3rd: {100*len(T3)/n:.0f}%, median {st.median(T3) if T3 else float('nan'):.1f} s")
