"""Deep backfield first contact (Integration, 2026-11-10): what NFL backs hit more than 1 yd behind the line have that
ours don't. Same code on NFL tracking and sim dumps; zone runs, first contact as backfield.py (first frame at or after
the handoff that a defender's centre is within 1.0 yd of the carrier's; no angle filter), kept when the carrier is
deeper than 1 yd behind the line then.

At that frame (velocities by backward difference over 0.1 s):
- runner: speed, his velocity's angle from straight downfield (0 = north, 90 = lateral, 180 = backward), time since the
  handoff;
- hitter: closing speed toward the runner, speed; blocked (an offensive non-carrier within 1.2 yd of him);
- second defender within 1.0 yd of the runner by +0.3 / +0.5 s;
- outcome: share stuffed (play yards <= 0), runner's net gain from contact to the end along x, contact to end (s).
Split by the runner's speed at contact (< 2, 2-4, >= 4 yd/s).
usage: python3 -I deephit3.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, math, os, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv, sys.argv = sys.argv, sys.argv[:1]   # frontcourse reports on its argv at import
import frontcourse as fc  # noqa: E402
import backfield as bfm  # noqa: E402
sys.argv = _argv


def rows(path):
    for (C, D, O, ho, e, *_), y in zip(fc.plays(path), bfm.yards_of(path)):
        if y is None:
            continue
        h = max(1, int(round(ho * 10)))
        hit = next((f for f in range(h, e + 1) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or hit < 1 or C[hit][0] >= -1:
            continue
        j = min(range(len(D[hit])), key=lambda j: math.dist(D[hit][j], C[hit]))
        H = [d[j] for d in D]
        vel = lambda P, f: ((P[f][0] - P[f-1][0]) * 10, (P[f][1] - P[f-1][1]) * 10)
        vr, vh = vel(C, hit), vel(H, hit)
        rs = math.hypot(*vr)
        rx, ry = C[hit][0] - H[hit][0], C[hit][1] - H[hit][1]; rd = math.hypot(rx, ry) or 1e-9
        second = lambda k: any(i != j and math.dist(D[min(e, hit + k)][i], C[min(e, hit + k)]) <= 1.0 for i in range(len(D[hit])))
        yield dict(rs=rs, dir=math.degrees(math.atan2(abs(vr[1]), vr[0])) if rs > 0.3 else None, since=(hit - h) / 10,
                   hclose=(vh[0] * rx + vh[1] * ry) / rd, hs=math.hypot(*vh), blocked=any(math.dist(o, H[hit]) <= 1.2 for o in O[hit]),
                   s3=second(3), s5=second(5), stuff=y <= 0, gain=C[e][0] - C[hit][0], tend=(e - hit) / 10, depth=C[hit][0])


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else float('nan')


def show(label, R):
    if not R:
        return
    pc = lambda k: 100 * sum(1 for r in R if r[k]) / len(R)
    print(f"   {label:12} n {len(R):4} | runner {med([r['rs'] for r in R]):.2f} yd/s at {med([r['dir'] for r in R]):3.0f} deg from north, "
          f"{med([r['since'] for r in R]):.2f} s after handoff, depth {med([r['depth'] for r in R]):+.2f} | hitter closing {med([r['hclose'] for r in R]):.2f} "
          f"(speed {med([r['hs'] for r in R]):.2f}), blocked {pc('blocked'):3.0f}% | 2nd man by +0.3 {pc('s3'):3.0f}% +0.5 {pc('s5'):3.0f}% | "
          f"stuffed {pc('stuff'):4.1f}%, gain after {med([r['gain'] for r in R]):+.2f}, to end {med([r['tend'] for r in R]):.1f} s")


for p in sys.argv[1:]:
    R = list(rows(p))
    print(f"== {os.path.basename(p)}: zone runs, first contact deeper than 1 yd behind the line")
    show('all', R)
    for lab, lo, hi in (('runner < 2', 0, 2), ('runner 2-4', 2, 4), ('runner >= 4', 4, 99)):
        show(lab, [r for r in R if lo <= r['rs'] < hi])
    show('blocked', [r for r in R if r['blocked']]); show('unblocked', [r for r in R if not r['blocked']])
    for lab, lo, hi in (('depth -1..-1.5', -1.5, -1), ('depth -1.5..-2', -2, -1.5), ('depth < -2', -99, -2)):
        show(lab, [r for r in R if lo <= r['depth'] < hi])
        show('  unblocked', [r for r in R if lo <= r['depth'] < hi and not r['blocked']])
