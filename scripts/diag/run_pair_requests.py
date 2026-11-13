"""Engaged run pairs (true engagement), 0.95-1.55 s: lateral requests of
blocker and defender, whether they agree, and the achieved pair motion.
Columns from pair-probe.ts: seed play concept t bslot dslot helpers breq.x breq.y
dreq.x dreq.y bvel.x bvel.y dvel.x dvel.y dx dy carrierOffsetY carrierVy bplan djob.
    python3 -I scripts/diag/run_pair_requests.py out/run/pairs-*.jsonl.gz
Prints the request terms, how long agreement holds and what drives the
defender's lateral flips (scripts/diag/run-pair-requests.ts writes the rows)."""
import gzip, json, math, statistics as st, sys

rows = []
for p in sys.argv[1:]:
    with gzip.open(p, 'rt') as f:
        rows += [json.loads(l) for l in f]
ZONE = {'iz_strong', 'iz_weak', 'oz_strong', 'oz_weak', 'wz_strong', 'wz_weak', 'duo', 'split_zone', 'toss'}


def med(v):
    v = [x for x in v if x is not None]
    return f"{st.median(v):5.2f}" if v else '    -'


def mean(v):
    v = [x for x in v if x is not None]
    return f"{sum(v) / len(v):5.2f}" if v else '    -'


def into(rx, ry, ux, uy):
    L = math.hypot(ux, uy) or 1
    return (rx * ux + ry * uy) / L


for label, sel in (('all', lambda r: True), ('zone', lambda r: r[2] in ZONE),
                   ('gap', lambda r: r[2] in ('power', 'counter', 'trap')), ('draw', lambda r: r[2] == 'draw')):
    R = [r for r in rows if sel(r) and 0.95 <= r[3] <= 1.55]
    if not R:
        continue
    same = [(r[8] * r[10] > 0) for r in R if abs(r[8]) > .3 and abs(r[10]) > .3]
    print(f"{label:5s} n={len(R):6d}"
          f" |b.req.y| {med([abs(r[8]) for r in R])} |d.req.y| {med([abs(r[10]) for r in R])} same-dir {mean(same)}"
          f" | req common lat {med([abs((r[8] + r[10]) / 2) for r in R])} achieved centroid lat {med([abs((r[12] + r[14]) / 2) for r in R])}"
          f" | into opp: b {med([into(r[7], r[8], r[15], r[16]) for r in R])} d {med([into(r[9], r[10], -r[15], -r[16]) for r in R])}"
          f" | toward ball: b {mean([r[8] * r[17] > 0 for r in R if r[17] is not None and abs(r[17]) > 1 and abs(r[8]) > .3])}"
          f" d {mean([r[10] * r[17] > 0 for r in R if r[17] is not None and abs(r[17]) > 1 and abs(r[10]) > .3])}")
# Agreeing pairs only: both want the same lateral direction. How much of the smaller request is achieved?
A = [r for r in rows if 0.95 <= r[3] <= 1.55 and r[8] * r[10] > 0 and min(abs(r[8]), abs(r[10])) > .8]
print(f"agreeing (both >0.8 same side) n={len(A)}: min request {med([min(abs(r[8]), abs(r[10])) for r in A])}"
      f" achieved centroid lat {med([abs((r[12] + r[14]) / 2) for r in A])}")
D = [r for r in rows if 0.95 <= r[3] <= 1.55 and r[8] * r[10] < 0 and min(abs(r[8]), abs(r[10])) > .8]
print(f"opposing  (both >0.8, opposite) n={len(D)}: achieved centroid lat {med([abs((r[12] + r[14]) / 2) for r in D])}")


# How long requests hold, and pairs whose agreement held for 0.5 s.
from collections import Counter, defaultdict
S = defaultdict(list)
for r in rows:
    S[(r[0], r[1], r[4], r[5])].append(r)
flips_b, flips_d, runs = [], [], []
steady = []   # agreement held >= 0.5 s: achieved vs request at the end
for k, rs in S.items():
    rs.sort(key=lambda r: r[3])
    for side, out in ((8, flips_b), (10, flips_d)):
        sg = [1 if r[side] > .3 else -1 if r[side] < -.3 else 0 for r in rs]
        n = sum(1 for a, b in zip(sg, sg[1:]) if a and b and a != b); dur = rs[-1][3] - rs[0][3]
        if dur >= .5: out.append(n / dur)
    start = None
    for r in rs:
        ok = r[8] * r[10] > 0 and min(abs(r[8]), abs(r[10])) > .8
        if ok and start is None: start = r[3]
        if not ok: start = None
        if ok and r[3] - start >= .5 and 0.95 <= r[3] <= 1.8:
            steady.append((min(abs(r[8]), abs(r[10])), abs((r[12] + r[14]) / 2), abs(r[12]), abs(r[14])))
print(f"lateral request sign flips per second: blocker {med(flips_b)} defender {med(flips_d)} (pairs engaged >= 0.5 s: {len(flips_b)})")
print(f"agreement held >= 0.5 s: n={len(steady)} min request {med([s[0] for s in steady])} achieved centroid {med([s[1] for s in steady])} (blocker {med([s[2] for s in steady])}, defender {med([s[3] for s in steady])})")

# What drives the defender's lateral flips.
flips = []
for k, rs in S.items():
    rs.sort(key=lambda r: r[3])
    prev = None
    for i, r in enumerate(rs):
        sg = 1 if r[10] > .3 else -1 if r[10] < -.3 else 0
        if sg and prev and sg != prev[0]:
            p = prev[1]
            ball_before = p[17]; ball_after = r[17]
            bside_flip = ball_before is not None and ball_after is not None and ball_before * ball_after < 0
            toward_after = ball_after is not None and r[10] * ball_after > 0
            flips.append((r[2], r[20], bside_flip, toward_after, r[3] - p[3], abs(ball_after) if ball_after is not None else None, r[6]))
        if sg: prev = (sg, r)
n = len(flips)
print(f"defender lateral flips: {n}")
print(f"  ball changed side of the pair across the flip: {sum(f[2] for f in flips)/n:.2f}")
print(f"  request toward the ball after the flip: {sum(f[3] for f in flips)/n:.2f}")
print(f"  with a helper on the defender (double team): {sum(f[6] > 0 for f in flips)/n:.2f}")
print(f"  ball within 1 yd laterally of the pair: {sum(1 for f in flips if f[5] is not None and f[5] < 1)/n:.2f}")
print("  defender job:", Counter(f[1] for f in flips).most_common(5))
print("  concept:", Counter(f[0] for f in flips).most_common(6))
