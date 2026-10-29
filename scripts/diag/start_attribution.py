#!/usr/bin/env python3
"""Is defenders' start overshoot the gait law or their requests?
    python3 -I scripts/diag/start_attribution.py <nfl.jsonl.gz> <probe-rows.jsonl.gz>...
Probe rows from scripts/diag/start-probe-defense.ts. For each group and speed bin the
NFL side gives (same position operator as accel_envelope.py: speed over +-0.1 s, accel
over +-0.2 s, free and speeding up) the median speed reached 0.5 s later and the accel
p50/p90. The sim side smooths each defender's probe speed the same way and splits ticks
by request: modest (<= 1.25x that NFL future speed) or larger."""
import collections, gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
import run_film_reference as R
q = lambda v, p: sorted(v)[int(p * (len(v) - 1))] if v else float('nan')
BINS = [('DB', 0), ('DB', 1), ('DL', 1), ('DL', 2), ('LB', 1), ('LB', 2)]
fut, nacc = collections.defaultdict(list), collections.defaultdict(list)
for p in R.nfl(sys.argv[1]):
    xy, n = p['xy'], len(p['xy'])
    kend = min(n - 7, int((p['contact'] if p['contact'] is not None else p['end']) / .1), 25)
    for i, who in enumerate(p['players']):
        g = who['group']
        if who['side'] != 'D' or g not in ('DL', 'LB', 'DB'): continue
        sp = lambda k: math.dist(xy[k + 1][i], xy[k - 1][i]) / .2
        for k in range(3, kend):
            if min((math.dist(xy[k][i], xy[k][j]) for j, o in enumerate(p['players']) if o['side'] != who['side']), default=9) < 1.5: continue
            a = (sp(k + 2) - sp(k - 2)) / .4
            if a <= .5: continue
            b = (g, int(min(sp(k), 5)))
            fut[b].append(sp(k + 5)); nacc[b].append(a)
ser = collections.defaultdict(dict)
for path in sys.argv[2:]:
    for l in gzip.open(path, 'rt'):
        r = json.loads(l)
        if r[15] == 0: ser[(r[0], r[1], r[24])][round(r[3] * 20)] = r
out = collections.defaultdict(lambda: ([], [], []))
for s in ser.values():
    for k, r in s.items():
        if k - 4 not in s or k + 4 not in s: continue
        a = (s[k + 4][19] - s[k - 4][19]) / .4
        b = (r[2], int(min(r[19], 5)))
        if a <= .5 or b not in BINS: continue
        modest = r[4] <= 1.25 * q(fut[b], .5)
        out[b][0 if modest else 1].append(a)
        out[b][2].append(r[21])
for b in BINS:
    m, big, kinds = out[b]
    print(f"{b[0]} {b[1]}-{b[1]+1} yd/s | NFL future speed {q(fut[b], .5):.2f}, accel p50/p90 {q(nacc[b], .5):.2f}/{q(nacc[b], .9):.2f}"
          f" | sim modest requests n {len(m)} {q(m, .5):.2f}/{q(m, .9):.2f} | larger n {len(big)} {q(big, .5):.2f}/{q(big, .9):.2f}"
          f" | plans {collections.Counter(kinds).most_common(3)}")
