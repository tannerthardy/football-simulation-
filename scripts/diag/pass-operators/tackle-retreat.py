"""The tackle's retreat while engaged with the edge rusher in front of him (Integration, 2026-11-12: the direct NFL
gate for the anchor). Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/tackle-retreat.py <plays.jsonl.gz> [...]

Pairing as edge-rush.py. Each frame with the ball in the QB's hands at which the rusher is within 1.2 yd of the
tackle (engaged, a distance proxy) and in front of him (rusher x - tackle x > -0.3, and not inside him: width outside
>= -0.3): the tackle's velocity along x (negative = retreating toward his own goal; 0.2 s differences), binned by time
since the snap. Also the rusher's velocity along x and the tackle's depth against the QB.
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BINS = ((0.5, 1.0), (1.0, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 3.0), (3.0, 4.0))

for path in sys.argv[1:]:
    acc = {b: {'tv': [], 'rv': [], 'tq': []} for b in BINS}
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
            for k in range(p.k(0.5), kend + 1):
                (rx, ry), (tx, ty), (qx, _) = p.pos(d, k), p.pos(tk, k), p.pos(qb, k)
                if None in (rx, tx, qx): break
                if p.dist(d, tk, k) > 1.2 or rx - tx < -0.3 or side * (ry - by) - side * (ty - by) < -0.3: continue
                t = k * p.dt
                for b in BINS:
                    if b[0] <= t < b[1]:
                        acc[b]['tv'].append(p.velocity(tk, k)[0]); acc[b]['rv'].append(p.velocity(d, k)[0]); acc[b]['tq'].append(tx - qx)
    print(f"== {os.path.basename(path)}: tackle engaged with the edge rusher in front (within 1.2 yd), ball in")
    for b in BINS:
        a = acc[b]
        if len(a['tv']) < 10: continue
        print(f"   {b[0]:.1f}-{b[1]:.1f} s (frames {len(a['tv']):6d}): tackle x-velocity p25/50/75 {q(a['tv'], .25):+.2f}/{q(a['tv']):+.2f}/{q(a['tv'], .75):+.2f} yd/s"
              f" (retreating > 1 yd/s {100 * sum(v < -1 for v in a['tv']) / len(a['tv']):.0f}%) | rusher x-velocity p50 {q(a['rv']):+.2f} | tackle minus QB depth p50 {q(a['tq']):+.2f}")
