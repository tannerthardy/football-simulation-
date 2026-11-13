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
TIMES = (1.0, 1.5, 2.0, 2.5, 3.0)


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
            r = {'align': align, 'snaps': {}, 'win': None}
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
