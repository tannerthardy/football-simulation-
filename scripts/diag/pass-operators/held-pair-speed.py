"""The held interior pass pair's speed toward the QB, one operator for NFL tracking and sim common-format exports (no weights needed). Pairs and hold as held-walkback.py (the three middle OL by y at the snap;
a pair forms at the first frame 0.2-2.0 s, before the throw, a defender is within 1.2 yd of the blocker; held while within 1.2 yd and within 70 deg of the blocker's line to the QB, to 2.5 s after contact).
Per pair and window since contact (0-0.5, 0.5-1.0, 1.0-1.5, 1.5-2.5 s): the mean of the two men's velocities along the rusher's line to the QB (+ = the blocker walked back), for pairs held through the
window (to within 0.15 s of its end); and the rusher's own velocity along that line. Reports p25 / p50 / p75 and n of pairs, and the share of pairs released before 1.0 / 2.0 s.
usage: python3 -I held-pair-speed.py FILE [FILE ...]
The second block splits the pairs by help: a second offensive lineman within 1.5 yd of the rusher 0.5 s after contact (a double team or a chip that stays) against none."""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else float('nan')
W = [(0, .5), (.5, 1.0), (1.0, 1.5), (1.5, 2.5)]
for path in sys.argv[1:]:
    helped = {True: {w: [] for w in W}, False: {w: [] for w in W}}
    pair = {w: [] for w in W}; rush = {w: [] for w in W}; n = rel1 = rel2 = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward'); end = fw if fw is not None else p.end
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]; D = [i for i in p.who('D') if p.pos(i, 0)[0] is not None]
        for b in OL[1:4]:
            start = r = None
            for k in range(p.k(0.2), min(p.k(2.0), p.k(end)) + 1):
                bx, by = p.pos(b, k)
                if bx is None: continue
                near = [(math.hypot(p.pos(d, k)[0] - bx, p.pos(d, k)[1] - by), d) for d in D if p.pos(d, k)[0] is not None]
                near = [x for x in near if x[0] <= 1.2]
                if near: start = k; r = min(near)[1]; break
            if start is None: continue
            kh = min(start + 5, p.frames - 1)
            hlp = any(o != b and o in OL and p.pos(o, kh)[0] is not None and p.pos(r, kh)[0] is not None and p.dist(o, r, kh) <= 1.5 for o in OL)
            n += 1; t0 = start * p.dt; prev = None; vals = {w: [] for w in W}; rv = {w: [] for w in W}; held_to = 0.0
            for k in range(start, p.k(min(end, t0 + 2.5)) + 1):
                (bx, by), (rx, ry), (qx, qy) = p.pos(b, k), p.pos(r, k), p.pos(qb, k)
                if None in (bx, rx, qx): break
                ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1
                sx, sy = rx - bx, ry - by
                if math.hypot(sx, sy) > 1.2 or abs(math.degrees(math.atan2((sx * -uy + sy * ux) / L, -(sx * ux + sy * uy) / L))) > 70: break
                held_to = k * p.dt - t0
                if prev is not None:
                    (pbx, pby), (prx, pry) = prev
                    lx, ly = qx - rx, qy - ry; ll = math.hypot(lx, ly) or 1
                    vbx, vby, vrx, vry = (bx - pbx) / p.dt, (by - pby) / p.dt, (rx - prx) / p.dt, (ry - pry) / p.dt
                    t = k * p.dt - t0
                    for w in W:
                        if w[0] <= t < w[1]:
                            vals[w].append(((vbx + vrx) / 2 * lx + (vby + vry) / 2 * ly) / ll); rv[w].append((vrx * lx + vry * ly) / ll)
                prev = ((bx, by), (rx, ry))
            if held_to < 1.0 - 0.15: rel1 += 1
            if held_to < 2.0 - 0.15: rel2 += 1
            for w in W:
                if vals[w] and held_to >= w[1] - 0.15: helped[hlp][w].append(sum(vals[w]) / len(vals[w])); pair[w].append(sum(vals[w]) / len(vals[w])); rush[w].append(sum(rv[w]) / len(rv[w]))
    print(f"== {os.path.basename(path)}: {n} interior pairs; released before 1.0 s {rel1 / max(1, n):.2f}, before 2.0 s {rel2 / max(1, n):.2f}")
    for w in W:
        print(f"  {w[0]:.1f}-{w[1]:.1f} s n {len(pair[w]):5d}: pair velocity toward the QB p25/50/75 {q(pair[w], .25)}/{q(pair[w])}/{q(pair[w], .75)} | rusher's own {q(rush[w], .25)}/{q(rush[w])}/{q(rush[w], .75)}")
    for h in (False, True):
        print(f"  {'helped by a second lineman' if h else 'alone':27s}" + ' | '.join(f"{w[0]:.1f}-{w[1]:.1f} s n {len(helped[h][w]):5d} p50 {q(helped[h][w])}" for w in W))
