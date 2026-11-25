"""How fast an interior lineman with no defender near him moves back toward his QB, one operator for NFL tracking and sim exports (Tools, 2026-11-16; context for the held pair's walk-back).
The three middle OL by y at the snap on dropbacks; per 0.5 s window since the snap (0.5-1.0, 1.0-1.5, 1.5-2.5), his own velocity along his line to the QB (+ = away from the line toward the QB) over frames
where no defender is within 3.0 yd of him (the same hold clock as held-pair-speed.py is not used: there is no contact). p25 / p50 / p75 and n of lineman-windows.
usage: python3 -I uncovered-retreat.py FILE [FILE ...]"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else float('nan')
W = [(0.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
for path in sys.argv[1:]:
    vals = {w: [] for w in W}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward'); end = fw if fw is not None else p.end
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]; D = [i for i in p.who('D') if p.pos(i, 0)[0] is not None]
        for b in OL[1:4]:
            for w in W:
                ks = [k for k in range(p.k(w[0]), p.k(min(w[1], end)) + 1) if p.pos(b, k)[0] is not None and p.pos(qb, k)[0] is not None]
                if len(ks) < int((w[1] - w[0]) / p.dt) - 1: continue
                if any(p.pos(d, k)[0] is not None and p.dist(b, d, k) < 3.0 for d in D for k in ks): continue
                k0, k1 = ks[0], ks[-1]
                (x0, y0), (x1, y1), (qx, qy) = p.pos(b, k0), p.pos(b, k1), p.pos(qb, k1)
                L = math.hypot(qx - x1, qy - y1) or 1
                vals[w].append(((x1 - x0) * (qx - x1) + (y1 - y0) * (qy - y1)) / L / ((k1 - k0) * p.dt))
    print(f"== {os.path.basename(path)}: interior OL with no defender within 3 yd, velocity toward the QB p25/50/75 (yd/s)")
    for w in W: print(f"  {w[0]:.1f}-{w[1]:.1f} s n {len(vals[w]):5d}: {q(vals[w], .25)}/{q(vals[w])}/{q(vals[w], .75)}")
