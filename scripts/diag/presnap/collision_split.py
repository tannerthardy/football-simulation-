"""Pre-snap defender collisions (centres under 0.6 yd at a frame in the last 3 s before the snap), split by when (Coverage,
2026-11-23): already together at the first pre-snap frame (installed spots: alignment), or coming together later (walking:
motion, stems, creeps), and for walking ones whether a motion was running. Also spots under 1.0 yd apart at the snap.
usage: python3 -I scripts/diag/presnap/collision_split.py ROWS.jsonl [...]"""
import json, sys, math
pre = n = align = walk = walkmot = near_snap = 0
for p in sys.argv[1:]:
    for l in open(p):
        r = json.loads(l); n += 1
        W = [k for k, t in enumerate(r['t']) if -3.0 - 1e-9 <= t < -1e-9]
        if not W: continue
        pre += 1
        D = [i for i, q in enumerate(r['players']) if q['side'] == 'D']
        P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
        k0 = min(range(len(r['t'])), key=lambda k: abs(r['t'][k]))
        if any(math.dist(P(i, k0), P(j, k0)) < 1.0 for a, i in enumerate(D) for j in D[a + 1:]): near_snap += 1
        first = None
        for a, i in enumerate(D):
            for j in D[a + 1:]:
                for k in W:
                    if math.dist(P(i, k), P(j, k)) < 0.6:
                        first = k if first is None else min(first, k); break
        if first is None: continue
        if first == W[0]: align += 1
        else:
            walk += 1; walkmot += any(e == 'man_in_motion' for _, e in r['events'])
print(f'plays {n}, with pre-snap frames {pre}; collisions {align + walk} ({100 * (align + walk) / max(1, pre):.1f}%): already together at the first pre-snap frame {align}, came together later {walk} (with motion {walkmot}); plays with two defenders under 1.0 yd apart at the snap {near_snap} ({100 * near_snap / max(1, n):.1f}% of plays)')
