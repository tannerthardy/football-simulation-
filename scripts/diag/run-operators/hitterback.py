"""Zone runs, first contact (defender centre within 1.0 yd of the carrier after the handoff), by carrier depth at contact.
First hitter's x displacement from contact to the end (+ = driven back toward his own goal; NFL end = events.end, sim =
last frame), split by approach: front-on (hitter within 45 deg of the carrier's travel, ahead of him) vs side/rear.
Also carrier gain over the same window."""
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
BINS = [(-1, 0, '-1..0'), (0, 1, '0..1'), (1, 3, '1..3')]
for path in sys.argv[1:]:
    R = collections.defaultdict(list)
    for C, D, ho, e in plays(path):
        h = max(1, int(round(ho*10)))
        hit = next((f for f in range(h, e) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or e - hit < 2 or hit < 1: continue
        b = next((lab for lo, hi, lab in BINS if lo <= C[hit][0] < hi), None)
        if not b: continue
        j = min(range(len(D[hit])), key=lambda j: math.dist(D[hit][j], C[hit]))
        vx, vy = C[hit][0] - C[hit-1][0], C[hit][1] - C[hit-1][1]; sp = math.hypot(vx, vy)
        rx, ry = D[hit][j][0] - C[hit][0], D[hit][j][1] - C[hit][1]; rd = math.hypot(rx, ry) or 1
        front = sp > 0.05 and (rx * vx + ry * vy) / (rd * sp) > math.cos(math.radians(45))
        R[(b, 'front' if front else 'side/rear')].append((D[e][j][0] - D[hit][j][0], C[e][0] - C[hit][0]))
    print('==', path.split('/')[-1])
    for k in sorted(R):
        v = R[k]; dx = [a for a, _ in v]
        print(f"   contact {k[0]:6} {k[1]:9} n {len(v):4}: hitter driven back median {st.median(dx):+.2f} yd (>=1 yd {100*sum(x >= 1 for x in dx)/len(v):.0f}%), carrier gain median {st.median(g for _, g in v):+.2f}")
