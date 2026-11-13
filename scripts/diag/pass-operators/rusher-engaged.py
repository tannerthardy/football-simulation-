"""The pass rusher's speed while engaged (Integration, 2026-11-12: our rushers cross their tackle's face at about
4 yd/s unslowed). Same code on NFL tracking and sim exports.

usage: python3 -I scripts/diag/pass-operators/rusher-engaged.py <plays.jsonl.gz> [...]

Every DL/LB who started within 1.6 yd of the line, every frame with the ball in the QB's hands from 0.5 s, while an
offensive lineman is within 1.0 yd of him (engaged, a distance proxy): his speed, his speed toward the QB, and his
speed across (perpendicular to his line to the QB), by time bin; edge (started outside the outermost OL) and interior.
"""
import sys, os, json, gzip, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BINS = ((0.5, 1.5), (1.5, 2.5), (2.5, 4.0))

for path in sys.argv[1:]:
    acc = C.defaultdict(lambda: {'s': [], 'q': [], 'x': []})
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        ys = [p.pos(o, 0)[1] for o in OL]
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        for d in p.who('D'):
            if p.players[d]['group'] not in ('DL', 'LB') or p.pos(d, 0)[0] is None or p.pos(d, 0)[0] > 1.6: continue
            y0 = p.pos(d, 0)[1]; g = 'edge' if (y0 < min(ys) or y0 > max(ys)) else 'interior'
            for k in range(p.k(0.5), kend + 1):
                if p.pos(d, k)[0] is None or p.pos(qb, k)[0] is None: break
                if not any(p.pos(o, k)[0] is not None and p.dist(o, d, k) <= 1.0 for o in OL): continue
                t = k * p.dt; b = next((b for b in BINS if b[0] <= t < b[1]), None)
                if not b: continue
                vx, vy = p.velocity(d, k); (dx, dy), (qx, qy) = p.pos(d, k), p.pos(qb, k)
                L = math.hypot(qx - dx, qy - dy) or 1; ux, uy = (qx - dx) / L, (qy - dy) / L
                A = acc[(g, b)]; A['s'].append(math.hypot(vx, vy)); A['q'].append(vx * ux + vy * uy); A['x'].append(abs(-vx * uy + vy * ux))
    print(f"== {os.path.basename(path)}: rushers engaged (an OL within 1.0 yd), ball in")
    for g in ('edge', 'interior'):
        for b in BINS:
            A = acc[(g, b)]
            if len(A['s']) < 20: continue
            print(f"   {g:8s} {b[0]:.1f}-{b[1]:.1f} s (frames {len(A['s']):6d}): speed p50 {q(A['s']):.2f} (p75 {q(A['s'], .75):.2f}) | toward the QB {q(A['q']):.2f} | across {q(A['x']):.2f} yd/s")
