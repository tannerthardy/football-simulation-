"""The engaged tackle-edge pair's geometry (Integration, 2026-11-12, after the lean trace: the press on our edge tackle is
mostly across him). Same code on NFL tracking and sim exports (common play format; no body orientation in it).

usage: python3 -I scripts/diag/pass-operators/pair-geometry.py <plays.jsonl.gz> [...]

Pairing as tackle-retreat.py. Frames from 1.0 s, ball in the QB's hands, rusher within 1.2 yd of his tackle. Per bin of
time since the snap:
  - where the rusher is relative to the tackle's own retreat (his velocity, when he moves >= 1 yd/s): the angle between
    (rusher - tackle) and the direction opposite his motion. Square: within 30 deg (the rusher is where he is retreating
    from: the load comes along his retreat axis, through his chest); 30-60 deg; beside: beyond 60 deg;
  - in the QB frame: dx = the rusher's offset along the line from the QB to the tackle (+ = farther from the QB than
    the tackle, i.e. in front of him); outside = the rusher's world-y offset from the tackle (+ = away from the ball);
  - the pair's velocity (the mean of the two) against the line from the pair to the QB: the angle (0 = straight at the
    QB) and the pair's speed; the rusher's and the tackle's speed.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BINS = ((1.0, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 3.0), (3.0, 4.0))

for path in sys.argv[1:]:
    acc = {b: [] for b in BINS}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        by = raw['ball_y']; fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        DLB = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
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
            d = max(cand)[1]
            for k in range(p.k(1.0), kend + 1):
                (rx, ry), (tx, ty), (qx, qy) = p.pos(d, k), p.pos(tk, k), p.pos(qb, k)
                if None in (rx, tx, qx): break
                if p.dist(d, tk, k) > 1.2: continue
                t = k * p.dt; b = next((b for b in BINS if b[0] <= t < b[1]), None)
                if b is None: continue
                tvx, tvy = p.velocity(tk, k); rvx, rvy = p.velocity(d, k)
                ts, rs = math.hypot(tvx, tvy), math.hypot(rvx, rvy)
                ox, oy = rx - tx, ry - ty
                ang = None
                if ts >= 1:
                    ang = abs(math.degrees(math.atan2(ox * tvy - oy * tvx, -(ox * tvx + oy * tvy))))
                lx, ly = tx - qx, ty - qy; ll = math.hypot(lx, ly) or 1e-6
                dx = (ox * lx + oy * ly) / ll
                mvx, mvy = (tvx + rvx) / 2, (tvy + rvy) / 2; ms = math.hypot(mvx, mvy)
                mx, my = (tx + rx) / 2, (ty + ry) / 2; gx, gy = qx - mx, qy - my; gl = math.hypot(gx, gy) or 1e-6
                pang = math.degrees(math.acos(max(-1, min(1, (mvx * gx + mvy * gy) / (ms * gl))))) if ms >= 0.5 else None
                acc[b].append({'ang': ang, 'dx': dx, 'across': (ry - ty) * side, 'pang': pang, 'ms': ms, 'rs': rs, 'ts': ts})
    print(f"== {os.path.basename(path)}: tackle and edge rusher within 1.2 yd, ball in")
    for b in BINS:
        a = acc[b]
        if len(a) < 10: continue
        A = [r['ang'] for r in a if r['ang'] is not None]
        sq = sum(x <= 30 for x in A); mid = sum(30 < x <= 60 for x in A); bes = sum(x > 60 for x in A)
        P = [r['pang'] for r in a if r['pang'] is not None]
        print(f"   {b[0]:.1f}-{b[1]:.1f} s (frames {len(a):6d}): vs his retreat: square {100 * sq / max(1, len(A)):.0f}% | 30-60 {100 * mid / max(1, len(A)):.0f}% | beside {100 * bes / max(1, len(A)):.0f}% (angle p50 {q(A):.0f})"
              f" || QB frame: in front dx p50 {q([r['dx'] for r in a]):+.2f}, outside (world y, + away from the ball) p50 {q([r['across'] for r in a]):+.2f}"
              f" || pair heading vs the QB p50 {q(P):.0f} deg, pair speed {q([r['ms'] for r in a]):.2f} | rusher {q([r['rs'] for r in a]):.2f} | tackle {q([r['ts'] for r in a]):.2f}")
