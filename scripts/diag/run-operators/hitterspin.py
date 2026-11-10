"""The tackler's own rotation after first contact, by approach (Integration, 2026-11-10). Same code on NFL tracking
(orientation 'o') and sim zone dumps (defFace). First contact as backfield.py (first frame at or after the handoff that a
defender's centre is within 1.0 yd of the carrier's). Approach = the hitter's bearing from the runner against the
runner's travel: front (within 45 deg ahead), behind (within 45 deg behind), side. Reports the hitter's |change of
facing| by +0.5 and +1.0 s (deg, median and p75), his facing against "square to the runner" at contact, and how far the
runner's travel direction turns over the same time.
usage: python3 -I hitterspin.py <nfl.jsonl.gz | sim zone dump with off> [...]"""
import sys, os, math, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_argv, sys.argv = sys.argv, sys.argv[:1]   # frontcourse reports on its argv at import
import frontcourse as fc  # noqa: E402
sys.argv = _argv
wrap = lambda a: abs((a + 180.0) % 360.0 - 180.0)
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for p in sys.argv[1:]:
    R = {'front': [], 'side': [], 'behind': []}
    for C, D, O, ho, e, mr, MD, FC, FD in fc.plays(p):
        if FD is None:
            continue
        h = max(1, int(round(ho * 10)))
        hit = next((f for f in range(h, e + 1) if min(math.dist(d, C[f]) for d in D[f]) <= 1.0), None)
        if hit is None or hit < 1:
            continue
        j = min(range(len(D[hit])), key=lambda k: math.dist(D[hit][k], C[hit]))
        vx, vy = C[hit][0] - C[hit-1][0], C[hit][1] - C[hit-1][1]; sp = math.hypot(vx, vy)
        if sp < 0.05 or FD[hit][j] is None:
            continue
        rx, ry = D[hit][j][0] - C[hit][0], D[hit][j][1] - C[hit][1]; rd = math.hypot(rx, ry) or 1
        cos = (rx * vx + ry * vy) / (rd * sp)
        cls = 'front' if cos > math.sqrt(.5) else 'behind' if cos < -math.sqrt(.5) else 'side'
        sq = wrap(FD[hit][j] - math.degrees(math.atan2(-ry, -rx)))   # 0 = facing the runner
        row = dict(sq=sq)
        for k, f in (('0.5', hit + 5), ('1.0', hit + 10)):
            if f <= e and FD[f][j] is not None:
                row['h' + k] = wrap(FD[f][j] - FD[hit][j])
                row['b' + k] = wrap(math.degrees(math.atan2(C[f][1] - D[f][j][1], C[f][0] - D[f][j][0]) - math.atan2(-ry, -rx)))
                row['s' + k] = wrap(FD[f][j] - math.degrees(math.atan2(C[f][1] - D[f][j][1], C[f][0] - D[f][j][0])))
                if f >= 1:
                    ax, ay = C[f][0] - C[f-1][0], C[f][1] - C[f-1][1]
                    row['r' + k] = wrap(math.degrees(math.atan2(ay, ax) - math.atan2(vy, vx))) if math.hypot(ax, ay) > 0.03 else None
        R[cls].append(row)
    print(f"== {os.path.basename(p)}")
    for cls, rows in R.items():
        g = lambda k, f=.5: q([r[k] for r in rows if r.get(k) is not None], f)
        print(f"   {cls:6} n {len(rows):4} | hitter vs square at contact {g('sq'):3.0f} deg | hitter rotation +0.5 s {g('h0.5'):3.0f} (p75 {g('h0.5', .75):3.0f}), +1.0 s {g('h1.0'):3.0f} (p75 {g('h1.0', .75):3.0f}) deg | runner's travel turned +0.5 / +1.0 s {g('r0.5'):3.0f} / {g('r1.0'):3.0f} deg | bearing hitter->runner turned {g('b0.5'):3.0f} / {g('b1.0'):3.0f} deg | hitter vs square then {g('s0.5'):3.0f} / {g('s1.0'):3.0f} deg")
