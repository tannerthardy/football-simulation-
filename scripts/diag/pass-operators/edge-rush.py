"""The edge rush against the tackle (Integration, 2026-11-12: free rushers at 2 yd come from the edge 23% of the time in
the NFL and 3% in ours). Same code on NFL tracking and sim exports (common play format: x yards past the line, offense
attacking +x, 0.1 s frames from the snap).

usage: python3 -I scripts/diag/pass-operators/edge-rush.py <plays.jsonl.gz> [...]

Population: dropbacks (kind pass) with five or more OL. On each side the tackle is the outermost OL at the snap; the edge
rusher there is the defender (DL or LB) whose snap spot is within 1.6 yd of the line and outside the tackle's snap y by
0-4 yd, the widest such man, who rushes (1.0 yd or more toward the QB by 1.0 s). Alignment by his width outside the
tackle at the snap: 'head-up/shade' < 1.0 yd, 'wide' 1.0-2.5, 'very wide' > 2.5. Stance is not in the tracking.
At 1.0 / 1.5 / 2.0 / 2.5 / 3.0 s (while the ball is in the QB's hands):
  - the rusher's depth against the tackle (rusher x minus tackle x; negative = deeper than the tackle, past him) and
    width outside him (rusher's distance from the ball's snap y minus the tackle's; positive = outside);
  - state: 'not level' (rusher x > tackle x + 0.3), 'level outside' (within 0.3 yd of the tackle's depth and outside),
    'past outside' (more than 0.3 yd deeper and outside: the corner turned), 'inside' (width < -0.3);
  - the rusher's speed and his distance to the QB;
  - the tackle's set: his depth (x) and his outward width from his snap y;
  - the QB's depth (x).
Win: the first frame the rusher is within 2.0 yd of the QB before the ball is out; by 2.5 and 3.0 s; the time.
Limits: 'edge rusher' and 'the tackle over him' are geometric proxies (alignment, not assignment); a TE or back
blocking him is not separated; 0.1 s frames.
"""
import sys, os, json, gzip, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, b: f"{100 * a / b:.0f}%" if b else '-'
TIMES = (0.5, 1.0, 1.5, 2.0, 2.5, 3.0)


def rows(path):
    out = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']
        qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        by = raw['ball_y']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        for side in (-1, 1):
            tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by))
            ty0 = p.pos(tk, 0)[1]
            cand = []
            for d in D:
                x0, y0 = p.pos(d, 0)
                if x0 > 1.6: continue
                w = side * (y0 - ty0)
                if w < 0 or w > 4: continue
                k1 = min(p.k(1.0), p.frames - 1)
                if p.pos(d, k1)[0] is None or x0 - p.pos(d, k1)[0] < 1.0: continue
                cand.append((w, d))
            if not cand: continue
            w0, d = max(cand)
            align = 'head-up/shade' if w0 < 1.0 else 'wide' if w0 <= 2.5 else 'very wide'
            r = {'align': align, 'snaps': {}, 'win': None, 'contact': None, 'vContact': None, 'vmax': 0.0}
            # First contact with the tackle (within 1.2 yd) and his speed the frame before; his top speed (a speed proxy).
            for k in range(1, kend + 1):
                if p.pos(d, k)[0] is None or p.pos(tk, k)[0] is None: continue
                r['vmax'] = max(r['vmax'], p.speed(d, k))
                if r['contact'] is None and p.dist(tk, d, k) <= 1.2:
                    r['contact'] = k * p.dt; r['vContact'] = p.speed(d, k - 1)
                    # Where it lands: the rusher's center outside the tackle's center, across the field (+ = outside).
                    r['offContact'] = side * (p.pos(d, k)[1] - p.pos(tk, k)[1])
                    r['vAfter'] = p.speed(d, min(kend, k + 2))
                    # His velocity 0.2 s on, in the tackle-to-rusher frame at contact: into the tackle (-n) and across
                    # him toward the outside (t, oriented outward).
                    k2 = min(kend, k + 2); (dx0, dy0), (tx0, ty0) = p.pos(d, k), p.pos(tk, k)
                    nx, ny = dx0 - tx0, dy0 - ty0; L = math.hypot(nx, ny) or 1e-6; nx, ny = nx / L, ny / L
                    t1, t2 = -ny, nx
                    if (t1 * 0 + t2 * side) < 0: t1, t2 = -t1, -t2
                    vx, vy = p.velocity(d, k2)
                    if vx is not None: r['vInto'] = -(vx * nx + vy * ny); r['vAcross'] = vx * t1 + vy * t2
                    # Integration (2026-11-14): the tackle's chest against the line to the rusher, at contact and +0.2 /
                    # +0.4 s, where the record has orientation ('o'): off = the rusher's bearing from the tackle minus
                    # his facing, + = the rusher toward the outside of where his chest points; turn = his facing
                    # toward the outside of downfield (0 = square to the line of scrimmage).
                    # The tackle's own velocity at contact: depth (+ = retreating toward his own goal) and outward.
                    tvx, tvy = p.velocity(tk, k)
                    if tvx is not None: r['tRetreat'] = -tvx; r['tOut'] = side * tvy; r['tSpeed'] = math.hypot(tvx, tvy)
                    o = raw.get('o'); r['chest'] = {}
                    if o:
                        for a, kk in ((0.0, k), (0.2, k + 2), (0.4, k + 4)):
                            if kk > kend or kk >= len(o) or o[kk][tk] is None or p.pos(d, kk)[0] is None: break
                            (rx, ry), (tx, ty) = p.pos(d, kk), p.pos(tk, kk)
                            brg = math.degrees(math.atan2(ry - ty, rx - tx)); f = o[kk][tk]
                            wrap = lambda a_: (a_ + 180) % 360 - 180
                            r['chest'][a] = {'off': side * wrap(brg - f), 'turn': side * wrap(f), 'dist': p.dist(tk, d, kk)}
            for k in range(p.k(0.3), kend + 1):
                if p.pos(d, k)[0] is not None and p.pos(qb, k)[0] is not None and p.dist(d, qb, k) <= 2.0:
                    r['win'] = k * p.dt
                    # Free at the win: no offensive non-QB body within 1.0 yd of him then; and where the tackle is.
                    O = [o for o in p.who('O') if o != qb and p.pos(o, k)[0] is not None]
                    r['free'] = not any(p.dist(o, d, k) <= 1.0 for o in O)
                    r['tackleOn'] = p.dist(tk, d, k) <= 1.2
                    tx, ty = p.pos(tk, k); rx, ry = p.pos(d, k)
                    r['winState'] = 'inside' if side * (ry - by) - side * (ty - by) < -0.3 else 'past outside' if rx - tx < -0.3 else 'level/in front'
                    break
            for T in TIMES:
                k = p.k(T)
                if k > kend or k >= p.frames: break
                rx, ry = p.pos(d, k); tx, ty = p.pos(tk, k); qx, qy = p.pos(qb, k)
                if None in (rx, tx, qx): break
                depth = rx - tx; width = side * (ry - by) - side * (ty - by)
                state = 'inside' if width < -0.3 else 'not level' if depth > 0.3 else 'level outside' if depth >= -0.3 else 'past outside'
                r['snaps'][T] = {'state': state, 'depth': depth, 'width': width, 'speed': p.speed(d, k), 'toQB': p.dist(d, qb, k),
                                 'tset': tx, 'twide': side * (ty - ty0), 'qbx': qx}
            out.append(r)
    return out


for path in sys.argv[1:]:
    R = rows(path)
    print(f"== {os.path.basename(path)}: edge rushes {len(R)} | alignment {dict(C.Counter(r['align'] for r in R))}")
    for T in TIMES:
        S = [r['snaps'][T] for r in R if T in r['snaps']]
        if not S: continue
        c = C.Counter(s['state'] for s in S)
        print(f"   {T:.1f} s (ball still in, n {len(S)}): " + ' | '.join(f"{k} {pct(c[k], len(S))}" for k in ('not level', 'level outside', 'past outside', 'inside'))
              + f" || rusher depth vs tackle p50 {q([s['depth'] for s in S]):+.2f}, width outside {q([s['width'] for s in S]):+.2f}, speed {q([s['speed'] for s in S]):.1f}, to QB {q([s['toQB'] for s in S]):.1f} yd"
              + f" || tackle depth {q([s['tset'] for s in S]):+.2f}, out {q([s['twide'] for s in S]):+.2f} | QB depth {q([s['qbx'] for s in S]):+.2f}")
    w = [r['win'] for r in R if r['win'] is not None]
    W = [r for r in R if r['win'] is not None]
    cw = C.Counter(r['winState'] for r in W)
    print(f"   at the win: free {pct(sum(r['free'] for r in W), len(W))} | the tackle still within 1.2 yd {pct(sum(r['tackleOn'] for r in W), len(W))} | " + ' | '.join(f"{k} {pct(cw[k], len(W))}" for k in ('past outside', 'level/in front', 'inside')))
    print(f"   win (within 2 yd of the QB before the ball is out): {pct(len(w), len(R))} | by 2.5 s {pct(sum(1 for x in w if x <= 2.5), len(R))} | by 3.0 s {pct(sum(1 for x in w if x <= 3.0), len(R))} | time p25/50/75 {q(w, .25):.2f}/{q(w):.2f}/{q(w, .75):.2f}")
    for a in ('head-up/shade', 'wide', 'very wide'):
        g = [r for r in R if r['align'] == a]
        if not g: continue
        wg = [r['win'] for r in g if r['win'] is not None]
        s15 = [r['snaps'][1.5] for r in g if 1.5 in r['snaps']]
        cc = C.Counter(s['state'] for s in s15)
        print(f"   {a:13s} n {len(g):5d}: win {pct(len(wg), len(g))}, time p50 {q(wg):.2f} | at 1.5 s past outside {pct(cc['past outside'], len(s15))}, level {pct(cc['level outside'], len(s15))}, inside {pct(cc['inside'], len(s15))}")

    # Integration (2026-11-14): when the rusher contacts the tackle and how fast he is then; the tackle's width by the
    # rusher's state at 2.0 s (is the late pinch him following a rusher who got level?); our rushers by top-speed tercile.
    Cn = [r for r in R if r['contact'] is not None]
    print(f"   first contact with the tackle (within 1.2 yd): {pct(len(Cn), len(R))} | at p25/50/75 {q([r['contact'] for r in Cn], .25):.2f}/{q([r['contact'] for r in Cn]):.2f}/{q([r['contact'] for r in Cn], .75):.2f} s | his speed just before p50 {q([r['vContact'] for r in Cn]):.2f} yd/s | his top speed in the play p50 {q([r['vmax'] for r in R]):.2f}")
    print(f"   where first contact lands: rusher center outside the tackle's p25/50/75 {q([r['offContact'] for r in Cn], .25):+.2f}/{q([r['offContact'] for r in Cn]):+.2f}/{q([r['offContact'] for r in Cn], .75):+.2f} yd | head-up (|offset| < 0.3) {pct(sum(1 for r in Cn if abs(r['offContact']) < 0.3), len(Cn))}, outside half (0.3-0.9) {pct(sum(1 for r in Cn if 0.3 <= r['offContact'] < 0.9), len(Cn))}, wide (> 0.9) {pct(sum(1 for r in Cn if r['offContact'] >= 0.9), len(Cn))} | his speed 0.2 s after contact p50 {q([r['vAfter'] for r in Cn]):.2f}")
    for lab, f in (('head-up', lambda o: abs(o) < 0.3), ('outside half', lambda o: 0.3 <= o < 0.9), ('wide', lambda o: o >= 0.9)):
        g = [r for r in Cn if f(r['offContact'])]
        gi = [r for r in g if 'vInto' in r]
        if g: print(f"      contact {lab:12s} velocity 0.2 s after, into the tackle {q([r['vInto'] for r in gi]):+.2f}, across him outward {q([r['vAcross'] for r in gi]):+.2f} yd/s")
        gt = [r for r in g if 'tRetreat' in r]
        if gt: print(f"      contact {lab:12s} the tackle at contact: retreat p25/50/75 {q([r['tRetreat'] for r in gt], .25):+.2f}/{q([r['tRetreat'] for r in gt]):+.2f}/{q([r['tRetreat'] for r in gt], .75):+.2f}, outward {q([r['tOut'] for r in gt]):+.2f}, speed {q([r['tSpeed'] for r in gt]):.2f} yd/s, under 0.5 yd/s {pct(sum(1 for r in gt if r['tSpeed'] < 0.5), len(gt))}")
        if g: print(f"      contact {lab:12s} n {len(g):5d}: speed before {q([r['vContact'] for r in g]):.2f} -> 0.2 s after {q([r['vAfter'] for r in g]):.2f} yd/s | at 2.0 s past outside {pct(sum(1 for r in g if 2.0 in r['snaps'] and r['snaps'][2.0]['state'] == 'past outside'), len(g))}")
    for lab, f in (('head-up', lambda o: abs(o) < 0.3), ('outside half', lambda o: 0.3 <= o < 0.9), ('wide', lambda o: o >= 0.9)):
        g = [r for r in Cn if f(r['offContact']) and r.get('chest')]
        if not g: continue
        parts = []
        for a in (0.0, 0.2, 0.4):
            h = [r['chest'][a] for r in g if a in r['chest']]
            if not h: continue
            offs = [x['off'] for x in h]
            parts.append(f"+{a:.1f} s n {len(h)}: rusher off his chest p25/50/75 {q(offs, .25):+.0f}/{q(offs):+.0f}/{q(offs, .75):+.0f} deg, |off| > 30 {pct(sum(1 for v in offs if abs(v) > 30), len(h))}, > 60 {pct(sum(1 for v in offs if abs(v) > 60), len(h))}; his turn outward p50 {q([x['turn'] for x in h]):+.0f} deg; sep {q([x['dist'] for x in h]):.2f}")
        print(f"      chest, contact {lab:12s} " + ' || '.join(parts))
    for a in ('head-up/shade', 'wide', 'very wide'):
        g = [r for r in Cn if r['align'] == a and 'tRetreat' in r]
        if not g: continue
        print(f"   tackle at first contact, rusher aligned {a:13s} n {len(g):5d}: retreat p25/50/75 {q([r['tRetreat'] for r in g], .25):+.2f}/{q([r['tRetreat'] for r in g]):+.2f}/{q([r['tRetreat'] for r in g], .75):+.2f}, outward p25/50/75 {q([r['tOut'] for r in g], .25):+.2f}/{q([r['tOut'] for r in g]):+.2f}/{q([r['tOut'] for r in g], .75):+.2f} yd/s | contact at {q([r['contact'] for r in g]):.2f} s, landing {q([r['offContact'] for r in g]):+.2f} yd, wide {pct(sum(1 for r in g if r['offContact'] >= 0.9), len(g))} | at 2.0 s inside {pct(sum(1 for r in g if 2.0 in r['snaps'] and r['snaps'][2.0]['state'] == 'inside'), len(g))}, past outside {pct(sum(1 for r in g if 2.0 in r['snaps'] and r['snaps'][2.0]['state'] == 'past outside'), len(g))}")
    for lab, f in (('not level at 2.0 s', lambda st: st == 'not level'), ('level / past outside at 2.0 s', lambda st: st in ('level outside', 'past outside')), ('inside at 2.0 s', lambda st: st == 'inside')):
        g = [r for r in R if 2.0 in r['snaps'] and f(r['snaps'][2.0]['state'])]
        if not g: continue
        print(f"   tackle width out by rusher {lab:30s} n {len(g):5d}: " + ' | '.join(f"{T:.1f} s {q([r['snaps'][T]['twide'] for r in g if T in r['snaps']]):+.2f}" for T in TIMES if any(T in r['snaps'] for r in g)))
    vs = sorted(r['vmax'] for r in R)
    if vs:
        lo, hi = vs[len(vs) // 3], vs[2 * len(vs) // 3]
        for lab, f in (('slowest third', lambda v: v <= lo), ('middle third', lambda v: lo < v <= hi), ('fastest third', lambda v: v > hi)):
            g = [r for r in R if f(r['vmax'])]
            s2 = [r['snaps'][2.0] for r in g if 2.0 in r['snaps']]; cc = C.Counter(x['state'] for x in s2)
            print(f"   rushers by top speed, {lab:14s} (top {q([r['vmax'] for r in g]):.1f} yd/s): at 2.0 s not level {pct(cc['not level'], len(s2))}, level {pct(cc['level outside'], len(s2))}, past outside {pct(cc['past outside'], len(s2))} | speed at 0.5 / 1.0 / 1.5 s {q([r['snaps'][0.5]['speed'] for r in g if 0.5 in r['snaps']]):.1f} / {q([r['snaps'][1.0]['speed'] for r in g if 1.0 in r['snaps']]):.1f} / {q([r['snaps'][1.5]['speed'] for r in g if 1.5 in r['snaps']]):.1f}")
