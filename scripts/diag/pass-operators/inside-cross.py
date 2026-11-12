"""Edge rushers crossing their tackle's face, and who meets them (Integration, 2026-11-12). Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/inside-cross.py <plays.jsonl.gz> [...]

Pairing as edge-rush.py. A crossing: the first frame, ball in the QB's hands, at which the rusher's width outside his
tackle goes below -0.3 yd (edge-rush.py's 'inside') within 2 yd of him. Then, over the next 0.5 s: another offensive
non-QB within 1.0 yd of him (met), within 2 yd (near), or none; and whether he comes within 2 yd of the QB before the
ball is out. Per dropback rates. And the tackle after the crossing: within 1.2 yd of the man at +0.3 and +0.5 s (he
stays on him, turned and riding), and his lateral speed toward the ball over that 0.3 s.
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')

for path in sys.argv[1:]:
    n = 0; X = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        n += 1; by = raw['ball_y']; fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        DLB = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        O = [o for o in p.who('O') if o != qb]
        for side in (-1, 1):
            tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by)); ty0 = p.pos(tk, 0)[1]; cand = []
            for d in DLB:
                x0, y0 = p.pos(d, 0)
                if x0 > 1.6: continue
                w = side * (y0 - ty0)
                if w < 0 or w > 4: continue
                k1 = min(p.k(1.0), p.frames - 1)
                if p.pos(d, k1)[0] is None or x0 - p.pos(d, k1)[0] < 1.0: continue
                cand.append((w, d))
            if not cand: continue
            d = max(cand)[1]; prev = None
            for k in range(p.k(0.3), kend + 1):
                (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
                if None in (rx, tx): break
                w = side * (ry - by) - side * (ty - by)
                if prev is not None and prev >= -0.3 and w < -0.3 and p.dist(d, tk, k) <= 2.0:
                    met = near = False
                    for m in range(k, min(kend, k + p.k(0.5)) + 1):
                        for o in O:
                            if o == tk or p.pos(o, m)[0] is None: continue
                            dd = p.dist(o, d, m)
                            if dd <= 1.0: met = True
                            if dd <= 2.0: near = True
                    win = any(p.pos(qb, m)[0] is not None and p.dist(d, qb, m) <= 2.0 for m in range(k, kend + 1))
                    k3, k5 = min(kend, k + p.k(0.3)), min(kend, k + p.k(0.5))
                    on3 = p.dist(d, tk, k3) <= 1.2; on5 = p.dist(d, tk, k5) <= 1.2
                    ty3 = p.pos(tk, k3)[1]; lat = (side * (ty - ty3)) / max(p.dt, (k3 - k) * p.dt) if ty3 is not None and k3 > k else float('nan')
                    X.append((k * p.dt, met, near, win, on3, on5, lat, p.speed(d, k), p.speed(d, k3), rx - tx)); break
                prev = w
    c = len(X)
    print(f"== {os.path.basename(path)}: dropbacks {n} | edge crossings inside the tackle: {c} ({100 * c / max(1, n):.1f}% of dropbacks), at p50 {q([x[0] for x in X]):.2f} s")
    if c:
        print(f"   in the next 0.5 s: met by another blocker (within 1 yd) {100 * sum(x[1] for x in X) / c:.0f}% | one within 2 yd {100 * sum(x[2] for x in X) / c:.0f}% | none {100 * sum(not x[2] for x in X) / c:.0f}%"
              f" || reached 2 yd of the QB before the ball was out: {100 * sum(x[3] for x in X) / c:.0f}% (met {100 * sum(x[3] for x in X if x[1]) / max(1, sum(x[1] for x in X)):.0f}%, not met {100 * sum(x[3] for x in X if not x[1]) / max(1, sum(not x[1] for x in X)):.0f}%)")
        L = [x[6] for x in X if x[6] == x[6]]
        print(f"   the rusher: speed at the crossing p50 {q([x[7] for x in X]):.2f}, 0.3 s later {q([x[8] for x in X]):.2f} yd/s")
        dep = [x[9] for x in X]; fr = [x for x in X if x[9] >= -0.3]; bh = [x for x in X if x[9] < -0.3]
        print(f"   where he crosses: depth vs the tackle p25/50/75 {q(dep, .25):+.2f}/{q(dep):+.2f}/{q(dep, .75):+.2f} | across his face (level or in front, >= -0.3) {100 * len(fr) / c:.0f}%, reaches the QB {100 * sum(x[3] for x in fr) / max(1, len(fr)):.0f}% | behind him (around, then in) {100 * len(bh) / c:.0f}%, reaches the QB {100 * sum(x[3] for x in bh) / max(1, len(bh)):.0f}%")
        print(f"   the tackle after it: still within 1.2 yd at +0.3 s {100 * sum(x[4] for x in X) / c:.0f}%, at +0.5 s {100 * sum(x[5] for x in X) / c:.0f}% | his lateral speed toward the ball over 0.3 s p50 {q(L):.2f} yd/s"
              f" | reached the QB when the tackle stayed on at +0.5 s {100 * sum(x[3] for x in X if x[5]) / max(1, sum(x[5] for x in X)):.0f}%, when not {100 * sum(x[3] for x in X if not x[5]) / max(1, sum(not x[5] for x in X)):.0f}%")
