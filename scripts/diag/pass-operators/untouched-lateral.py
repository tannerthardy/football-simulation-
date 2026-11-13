"""An untouched tackle at the stop depth: is he still on the rusher's inside path? (Integration, 2026-11-13.) Same
code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/untouched-lateral.py <plays.jsonl.gz> [...]

Pairing as tackle-retreat.py. Frames 1.5-3.0 s, ball in, the tackle untouched so far (no defender within 1.2 yd since
the snap), his depth over the launch point (the QB's depth at the throw) in [+1.5, +4.0], and his paired rusher in
front of him (not past) 1.2-4 yd away. Then:
  - the rusher's width outside the tackle;
  - whether the tackle is on the rusher's line to the QB: his offset from that line, inside his body plus the rusher's
    (0.65 yd);
  - over the next 1.0 s: the pair meets (within 1.2 yd), the rusher gets past him outside (behind him in depth while
    outside), crosses inside, or none of these.
Also split by whether the tackle has stopped giving ground (x-vel >= -1).
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')

for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        if str((raw.get('cell') or {}).get('concept', '')).startswith('pa'): continue
        fw = raw['events'].get('pass_forward')
        if fw is None or fw < 1.5: continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; kf = p.k(fw); lx = p.pos(qb, kf)[0]
        if lx is None: continue
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        by = raw['ball_y']; D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        DLB = [d for d in D if p.players[d]['group'] in ('DL', 'LB')]
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
            touched = False; last = -9
            for k in range(0, kf):
                if p.pos(tk, k)[0] is None or p.pos(d, k)[0] is None: break
                if any(p.pos(o, k)[0] is not None and p.dist(o, tk, k) <= 1.2 for o in D): touched = True
                if touched: break
                t = k * p.dt
                if not (1.5 <= t <= 3.0) or k - last < p.k(0.3): continue
                (tx, ty), (rx, ry), (qx, qy) = p.pos(tk, k), p.pos(d, k), p.pos(qb, k)
                over = tx - lx; gap = p.dist(d, tk, k)
                if not (1.5 <= over <= 4.0) or rx - tx < -0.3 or not (1.2 < gap <= 4): continue
                last = k
                vx, vy = qx - rx, qy - ry; L = math.hypot(vx, vy) or 1e-6
                along = ((tx - rx) * vx + (ty - ry) * vy) / L
                off = abs((tx - rx) * vy - (ty - ry) * vx) / L
                onPath = 0 < along < L and off <= 0.65
                out = 'none'
                for j in range(k + 1, min(kf, k + p.k(1.0)) + 1):
                    if p.pos(d, j)[0] is None or p.pos(tk, j)[0] is None: break
                    if p.dist(d, tk, j) <= 1.2: out = 'meets'; break
                    w = side * (p.pos(d, j)[1] - p.pos(tk, j)[1])
                    if w < -0.3: out = 'inside'; break
                    if p.pos(d, j)[0] - p.pos(tk, j)[0] < -0.3: out = 'past outside'; break
                rows.append({'w': side * (ry - ty), 'on': onPath, 'off': off, 'out': out, 'settled': p.velocity(tk, k)[0] >= -1, 'over': over})
    print(f"== {os.path.basename(path)}: samples {len(rows)} (one per pair per 0.3 s)")
    for lab, R in (('all', rows), ('settled (x-vel >= -1)', [r for r in rows if r['settled']]), ('still giving ground', [r for r in rows if not r['settled']])):
        if len(R) < 10: continue
        c = {o: sum(r['out'] == o for r in R) for o in ('meets', 'past outside', 'inside', 'none')}
        print(f"   {lab:22s} n {len(R):5d} | over the launch point p50 {q([r['over'] for r in R]):+.2f} | rusher outside him p50 {q([r['w'] for r in R]):+.2f}"
              f" | tackle on the rusher's line to the QB {100 * sum(r['on'] for r in R) / len(R):.0f}% (offset p50 {q([r['off'] for r in R]):.2f})"
              f" | next 1.0 s: " + ", ".join(f"{k} {100 * v / len(R):.0f}%" for k, v in c.items()))
