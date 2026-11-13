"""The unengaged approach: an edge rusher in front of his tackle and not yet in contact (Integration, 2026-11-13).
Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/approach-gap.py <plays.jsonl.gz> [...]

Pairing as tackle-retreat.py. Split by the rusher's width outside the tackle at the snap: up to 1.5 yd (head-up or
shaded), 1.5-3 (wide), beyond 3 (very wide).
  - Frames 1.0-1.8 s, ball in, rusher in front (not past, not inside), gap > 1.2 yd: the tackle's and the rusher's
    x-velocity, the gap and its rate (- = closing).
  - Per pair, the last yard before first contact (gap 2.2 -> 1.2 yd): the share of the closing done by the rusher
    (his displacement toward the tackle along the line between them, over the total).
  - At first contact (gap <= 1.2): the time, and the tackle's depth over the QB.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
WIDTHS = (('head-up/shade (<= 1.5)', -9, 1.5), ('wide (1.5-3)', 1.5, 3), ('very wide (> 3)', 3, 9))

for path in sys.argv[1:]:
    acc = {w[0]: {'tv': [], 'rv': [], 'gap': [], 'rate': [], 'share': [], 't0': [], 'over': [], 'pairs': 0} for w in WIDTHS}
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
            w0, d = max(cand)
            g = next(x for x in WIDTHS if x[1] < w0 <= x[2])[0]
            a = acc[g]; a['pairs'] += 1
            gaps = {}
            for k in range(0, kend + 1):
                if p.pos(d, k)[0] is None or p.pos(tk, k)[0] is None: break
                gaps[k] = p.dist(d, tk, k)
            k0 = next((k for k in sorted(gaps) if gaps[k] <= 1.2 and k * p.dt >= 0.3), None)
            for k in range(p.k(1.0), min(p.k(1.8), kend) + 1):
                if k not in gaps or k - 1 not in gaps or k + 1 not in gaps: continue
                if k0 is not None and k >= k0: break
                (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
                if rx - tx < -0.3 or side * (ry - ty) < -0.3 or gaps[k] <= 1.2: continue
                a['tv'].append(p.velocity(tk, k)[0]); a['rv'].append(p.velocity(d, k)[0]); a['gap'].append(gaps[k])
                a['rate'].append((gaps[k + 1] - gaps[k - 1]) / (2 * p.dt))
            if k0 is None: continue
            a['t0'].append(k0 * p.dt)
            if p.pos(qb, k0)[0] is not None: a['over'].append(p.pos(tk, k0)[0] - p.pos(qb, k0)[0])
            ks = next((k for k in range(k0, -1, -1) if k in gaps and gaps[k] >= 2.2), None)
            if ks is None or ks == k0: continue
            (r0x, r0y), (t0x, t0y) = p.pos(d, ks), p.pos(tk, ks); (r1x, r1y), (t1x, t1y) = p.pos(d, k0), p.pos(tk, k0)
            ux, uy = (t0x - r0x), (t0y - r0y); L = math.hypot(ux, uy) or 1e-6; ux, uy = ux / L, uy / L
            rmove = (r1x - r0x) * ux + (r1y - r0y) * uy          # rusher toward the tackle
            tmove = -((t1x - t0x) * ux + (t1y - t0y) * uy)       # tackle toward the rusher
            tot = rmove + tmove
            if tot > 0.3: a['share'].append(rmove / tot)
    print(f"== {os.path.basename(path)}")
    for g, a in acc.items():
        if a['pairs'] < 10: continue
        n = len(a['tv'])
        print(f"   {g:24s} pairs {a['pairs']:5d} | unengaged in front 1.0-1.8 s: frames {n}, tackle x-vel {q(a['tv']):+.2f} vs rusher {q(a['rv']):+.2f}, gap {q(a['gap']):.2f}, gap rate p25/50/75 {q(a['rate'], .25):+.2f}/{q(a['rate']):+.2f}/{q(a['rate'], .75):+.2f}"
              f" | last yard closed by the rusher {100 * q(a['share']):.0f}% (p25 {100 * q(a['share'], .25):.0f}) | first contact t p50 {q(a['t0']):.2f} (late >= 1.8 s {100 * sum(t >= 1.8 for t in a['t0']) / max(1, len(a['t0'])):.0f}%), tackle over the QB then {q(a['over']):+.2f}")
