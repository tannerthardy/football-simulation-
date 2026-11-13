"""When a rusher comes off a lineman: what the QB does, and who is next (Integration, 2026-11-13). Same code on NFL
tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/come-off.py <plays.jsonl.gz> [...]

Dropbacks; a come-off is a DL/LB within 1.2 yd of an offensive lineman on one frame and of none on the next, between
0.5 s and the throw. Its state is the last close frame's (as ride-pair.py): ridden (dx <= +0.2 along the QB-blocker
line: level with or past him toward the QB), front (dx >= +0.5) or between. Offense moves toward +x.

  QB:   his displacement over the 1.0 s before the come-off and the 0.5 s after (cut at the throw), split into toward
        the rusher (along the line from the QB to the rusher at the come-off; + = toward him) and up (+x, toward the
        line); the rusher's distance to the QB at the come-off, and from that spot to where the QB is 0.4 s later.
  Help: the nearest other offensive player (not the QB, not the lineman he came off) to the rusher at the come-off,
        his distance, and whether any of them is within 1.2 yd of the rusher within 0.4 s.
Each split by whether the rusher then gets within 2 yd of the QB before the throw.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
NEAR = 1.2

for path in sys.argv[1:]:
    ev_rows = []; drop = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        drop += 1
        ys = sorted(OL, key=lambda o: p.pos(o, 0)[1]); tackle = {ys[0], ys[-1]}
        others = [o for o in p.who('O') if o != qb and p.pos(o, 0)[0] is not None]
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        DLB = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        for d in DLB:
            last = None
            for k in range(max(1, p.k(0.5)), kend + 1):
                rx, ry = p.pos(d, k); qx, qy = p.pos(qb, k)
                if rx is None or qx is None: break
                near = [(math.hypot(p.pos(o, k)[0] - rx, p.pos(o, k)[1] - ry), o) for o in OL if p.pos(o, k)[0] is not None]
                dist, o = min(near) if near else (99, None)
                if o is not None and dist <= NEAR:
                    tx, ty = p.pos(o, k); lx, ly = tx - qx, ty - qy; ll = math.hypot(lx, ly) or 1e-6
                    dx = ((rx - tx) * lx + (ry - ty) * ly) / ll
                    last = (o, 'ridden' if dx <= 0.2 else 'front' if dx >= 0.5 else 'between')
                    continue
                if last is None: continue
                o0, state = last; last = None
                # QB movement
                ux, uy = rx - qx, ry - qy; ul = math.hypot(ux, uy) or 1e-6; ux, uy = ux / ul, uy / ul
                kb = max(0, k - p.k(1.0)); ka = min(kend, k + p.k(0.5)); k4 = min(kend, k + p.k(0.4))
                (bx, by), (ax, ay), (fx, fy) = p.pos(qb, kb), p.pos(qb, ka), p.pos(qb, k4)
                if None in (bx, ax, fx): continue
                before = ((qx - bx) * ux + (qy - by) * uy, qx - bx)
                after = ((ax - qx) * ux + (ay - qy) * uy, ax - qx)
                reached = any(p.pos(d, j)[0] is not None and p.pos(qb, j)[0] is not None and p.dist(d, qb, j) <= 2.0
                              for j in range(k, kend + 1))
                # help
                hs = [(math.hypot(p.pos(h, k)[0] - rx, p.pos(h, k)[1] - ry), h) for h in others
                      if h != o0 and p.pos(h, k)[0] is not None]
                hd, h = min(hs) if hs else (99, None)
                helped = any(p.pos(x, j)[0] is not None and p.pos(d, j)[0] is not None and p.dist(x, d, j) <= NEAR
                             for j in range(k, k4 + 1) for x in others if x != o0)
                ev_rows.append({'cls': 'tackle' if o0 in tackle else 'interior', 'state': state, 'reached': reached,
                                'toQB': ul, 'qbLater': math.hypot(fx - rx, fy - ry), 'b_tow': before[0], 'b_up': before[1],
                                'a_tow': after[0], 'a_up': after[1], 'help': hd, 'hgroup': p.players[h]['group'] if h is not None else '-',
                                'helped': helped, 't': k * p.dt})
    print(f"== {os.path.basename(path)}: dropbacks {drop}")
    for c in ('interior', 'tackle'):
        for st in ('ridden', 'all'):
            R = [r for r in ev_rows if r['cls'] == c and (st == 'all' or r['state'] == st)]
            if not R: continue
            print(f"   {c} come-offs from {st}: {100 * len(R) / max(1, drop):.1f} /100 dropbacks, then reached the QB {100 * sum(r['reached'] for r in R) / len(R):.0f}%")
            for lab, sub in (('reached', [r for r in R if r['reached']]), ('did not', [r for r in R if not r['reached']])):
                if len(sub) < 5: continue
                g = {}
                for r in sub: g[r['hgroup']] = g.get(r['hgroup'], 0) + 1
                print(f"      {lab:7s} n {len(sub):5d} | QB 1.0 s before: toward him {q([r['b_tow'] for r in sub]):+.2f}, up {q([r['b_up'] for r in sub]):+.2f}"
                      f" | 0.5 s after: toward him {q([r['a_tow'] for r in sub]):+.2f}, up {q([r['a_up'] for r in sub]):+.2f}"
                      f" | rusher to QB {q([r['toQB'] for r in sub]):.2f} -> to QB 0.4 s later {q([r['qbLater'] for r in sub]):.2f}"
                      f" | nearest other {q([r['help'] for r in sub]):.2f} yd ({', '.join(f'{k} {100 * v / len(sub):.0f}%' for k, v in sorted(g.items(), key=lambda x: -x[1])[:3])}),"
                      f" within 1.2 yd in 0.4 s {100 * sum(r['helped'] for r in sub) / len(sub):.0f}%")
