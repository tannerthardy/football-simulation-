"""The interior lineman's retreat toward the QB on the SNAP clock, one operator for NFL tracking and sim common-format exports (Tools, 2026-11-16, for Flex's POCKET_DROP read).
The three middle OL by y at the snap on dropbacks whose QB lines up 3+ yd behind the line (the gun: QB x <= -3 at the snap). Windows from the snap: 0.5-1.0, 1.0-1.5, 1.5-2.0, 2.0-2.5 s (before the throw).
Per lineman and window: his displacement along his line to the QB over the window / the window's length (+ = toward the QB). Classes: held by a rusher the whole window (a defender within 1.2 yd and within 70 deg of
his line to the QB from 0.15 s into the window to its end), covered otherwise-near (any defender within 3 yd in the window), uncovered (none within 3 yd). Also the held pair's rusher's own velocity along the same line.
Reports p25 / p50 / p75 and n by class. usage: python3 -I interior-retreat-snap.py FILE [FILE ...]"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else float('nan')
W = [(0.5, 1.0), (1.0, 1.5), (1.5, 2.0), (2.0, 2.5)]
for path in sys.argv[1:]:
    R = {c: {w: [] for w in W} for c in ('all', 'held', 'near', 'uncovered')}; rush = {w: [] for w in W}; plays = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward'); end = fw if fw is not None else p.end
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]
        if p.pos(qb, 0)[0] is None or p.pos(qb, 0)[0] > -3: continue
        plays += 1; D = [i for i in p.who('D') if p.pos(i, 0)[0] is not None]
        for b in OL[1:4]:
            for w in W:
                if w[1] > end + 1e-9: continue
                ks = list(range(p.k(w[0]), p.k(w[1]) + 1))
                if any(p.pos(b, k)[0] is None or p.pos(qb, k)[0] is None for k in ks): continue
                (x0, y0), (x1, y1), (qx, qy) = p.pos(b, ks[0]), p.pos(b, ks[-1]), p.pos(qb, ks[-1])
                L = math.hypot(qx - x1, qy - y1) or 1
                v = ((x1 - x0) * (qx - x1) + (y1 - y0) * (qy - y1)) / L / ((ks[-1] - ks[0]) * p.dt)
                R['all'][w].append(v)
                near = any(p.pos(d, k)[0] is not None and p.dist(b, d, k) < 3.0 for d in D for k in ks)
                R['near' if near else 'uncovered'][w].append(v)
                # held through the window by one rusher
                kk = [k for k in ks if k * p.dt >= w[0] + 0.15]
                best = None
                for d in D:
                    ok = True
                    for k in kk:
                        if p.pos(d, k)[0] is None: ok = False; break
                        bx, by = p.pos(b, k); ux, uy = p.pos(qb, k)[0] - bx, p.pos(qb, k)[1] - by; Lk = math.hypot(ux, uy) or 1
                        sx, sy = p.pos(d, k)[0] - bx, p.pos(d, k)[1] - by
                        if math.hypot(sx, sy) > 1.2 or abs(math.degrees(math.atan2((sx * -uy + sy * ux) / Lk, -(sx * ux + sy * uy) / Lk))) > 70: ok = False; break
                    if ok: best = d; break
                if best is not None:
                    R['held'][w].append(v)
                    (rx0, ry0), (rx1, ry1) = p.pos(best, ks[0]), p.pos(best, ks[-1])
                    rush[w].append(((rx1 - rx0) * (qx - x1) + (ry1 - ry0) * (qy - y1)) / L / ((ks[-1] - ks[0]) * p.dt))
    print(f"== {os.path.basename(path)}: {plays} gun dropbacks; interior OL velocity toward the QB on the snap clock, p25/50/75 (n)")
    for c, lab in (('all', 'all three middle OL'), ('held', 'held by a rusher the window'), ('near', 'a defender within 3 yd, not held'), ('uncovered', 'no defender within 3 yd')):
        print(f"  {lab:34s}" + ' | '.join(f"{w[0]:.1f}-{w[1]:.1f}: {q(R[c][w], .25)}/{q(R[c][w])}/{q(R[c][w], .75)} ({len(R[c][w])})" for w in W))
    print(f"  {'the held pair rusher own':34s}" + ' | '.join(f"{w[0]:.1f}-{w[1]:.1f}: {q(rush[w], .25)}/{q(rush[w])}/{q(rush[w], .75)} ({len(rush[w])})" for w in W))
