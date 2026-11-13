"""The earliest in-front pressures (Integration, 2026-11-13): an edge rusher within 2 yd of the QB before 2.5 s while
still level with or in front of his tackle (pressure-source.py's 'level/in front' class). The pair covered the whole
pocket in about two seconds: the tackle's set too close to the QB, the QB's own depth or drift toward that side, or
a press the tackle does not answer in the first second. Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/early-front.py <plays.jsonl.gz> [...]

For each such play, and for the same class arriving at 2.5 s or later, and for all engaged edge pairs as a reference:
  first contact (rusher within 1.2 yd of his tackle): time, the tackle's depth behind the line and his depth over the
  QB's then; the tackle's x-velocity over the first second of contact; at pressure: the tackle's depth, the QB's depth
  and his drift toward the rusher's side since 1.0 s (+ = toward), the tackle's distance to the QB.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')

for path in sys.argv[1:]:
    groups = {'early (< 2.5 s)': [], 'late (>= 2.5 s)': [], 'all engaged edge pairs': []}
    n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        n += 1; by = raw['ball_y']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        DLB = [d for d in D if p.players[d]['group'] in ('DL', 'LB')]
        edge = {}
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
            if cand: edge[max(cand)[1]] = (side, tk)
        hit = None
        for k in range(kend + 1):
            if p.pos(qb, k)[0] is None: continue
            for d in D:
                if p.pos(d, k)[0] is not None and p.dist(qb, d, k) <= 2.0: hit = (k, d); break
            if hit: break
        def contact_row(d, side, tk, kp=None):
            k0 = next((k for k in range(kend + 1) if p.pos(d, k)[0] is not None and p.pos(tk, k)[0] is not None and p.dist(d, tk, k) <= 1.2), None)
            if k0 is None: return None
            k1 = min(kend, k0 + p.k(1.0))
            tv = (p.pos(tk, k1)[0] - p.pos(tk, k0)[0]) / max(p.dt, (k1 - k0) * p.dt)
            r = {'t0': k0 * p.dt, 'tdepth0': p.pos(tk, k0)[0], 'tOverQB0': p.pos(tk, k0)[0] - p.pos(qb, k0)[0], 'tv1': tv}
            # Before contact: where the rusher is against his tackle at 1.0 and 1.5 s (outside width, depth, gap, speed),
            # and whether he started inside the tackle's snap alignment (a twist or an inside alignment).
            for tt in (1.0, 1.5):
                kk = min(p.k(tt), kend)
                if kk < k0 and p.pos(d, kk)[0] is not None and p.pos(tk, kk)[0] is not None:
                    r[f'w{tt}'] = side * (p.pos(d, kk)[1] - p.pos(tk, kk)[1]); r[f'dx{tt}'] = p.pos(d, kk)[0] - p.pos(tk, kk)[0]
                    r[f'gap{tt}'] = p.dist(d, tk, kk); r[f'sp{tt}'] = p.speed(d, kk)
            r['startOut'] = side * (p.pos(d, 0)[1] - p.pos(tk, 0)[1])
            if kp is not None:
                k10 = min(p.k(1.0), kp)
                r.update({'tdepthP': p.pos(tk, kp)[0], 'qbDepthP': p.pos(qb, kp)[0],
                          'drift': (p.pos(qb, kp)[1] - p.pos(qb, k10)[1]) * side * 1.0,
                          'tToQB': p.dist(tk, qb, kp), 'tP': kp * p.dt})
            return r
        hk = hit[0] if hit else None
        for d, (side, tk) in edge.items():
            r = contact_row(d, side, tk)
            if r:
                # this pair's rusher was the first presser, in front of his tackle
                r['frontP'] = bool(hit and hit[1] == d and side * (p.pos(d, hk)[1] - by) - side * (p.pos(tk, hk)[1] - by) >= -0.3 and p.pos(d, hk)[0] - p.pos(tk, hk)[0] >= -0.3)
                groups['all engaged edge pairs'].append(r)
        if not hit: continue
        k, d = hit
        if d not in edge: continue
        side, tk = edge[d]; rx, ry = p.pos(d, k); tx, ty = p.pos(tk, k)
        width = side * (ry - by) - side * (ty - by)
        if width < -0.3 or rx - tx < -0.3: continue
        r = contact_row(d, side, tk, k)
        if r: groups['early (< 2.5 s)' if k * p.dt < 2.5 else 'late (>= 2.5 s)'].append(r)
    print(f"== {os.path.basename(path)}: dropbacks {n}")
    for g, rows in groups.items():
        if not rows: continue
        line = (f"   {g:24s} n {len(rows):5d} ({100 * len(rows) / n:.1f}% of dropbacks) | contact at t {q([r['t0'] for r in rows]):.2f} s, tackle {q([r['tdepth0'] for r in rows]):+.2f} yd from the LOS"
                f" ({q([r['tOverQB0'] for r in rows]):+.2f} over the QB) | tackle x-vel over contact's first 1.0 s {q([r['tv1'] for r in rows]):+.2f}")
        if 'tP' in rows[0]:
            line += (f" || at pressure t {q([r['tP'] for r in rows]):.2f}: tackle {q([r['tdepthP'] for r in rows]):+.2f}, QB {q([r['qbDepthP'] for r in rows]):+.2f},"
                     f" QB drift toward the rusher since 1.0 s {q([r['drift'] for r in rows]):+.2f}, tackle-QB {q([r['tToQB'] for r in rows]):.2f} yd")
        print(line)
    A = groups['all engaged edge pairs']
    for lo, hi in ((0, 1.2), (1.2, 1.5), (1.5, 1.8), (1.8, 2.2), (2.2, 9)):
        R = [r for r in A if lo <= r['t0'] < hi]
        if R: print(f"     first contact {lo:.1f}-{hi:.1f} s: {100 * len(R) / max(1, len(A)):4.1f}% of pairs | tackle at contact {q([r['tdepth0'] for r in R]):+.2f} yd ({q([r['tOverQB0'] for r in R]):+.2f} over the QB) | the rusher becomes an in-front presser {100 * sum(r['frontP'] for r in R) / len(R):.1f}%")
    L = [r for r in A if r['t0'] >= 1.8]
    if L:
        def st(key): v = [r[key] for r in L if key in r]; return f"{q(v):+.2f}" if v else 'nan'
        print(f"     late contacts (from 1.8 s), n {len(L)}: rusher at 1.0 s outside {st('w1.0')} / ahead in depth {st('dx1.0')} / gap {st('gap1.0')} / speed {st('sp1.0')}"
              f" | at 1.5 s outside {st('w1.5')} / ahead {st('dx1.5')} / gap {st('gap1.5')} / speed {st('sp1.5')} | aligned outside him at the snap {st('startOut')}")
    E = [r for r in A if 1.2 <= r['t0'] < 1.5]
    if E:
        v = [r['startOut'] for r in E]
        print(f"     (reference: contact 1.2-1.5 s, n {len(E)}: aligned outside him at the snap {q(v):+.2f})")
