"""How long an edge rusher stays level-outside an engaged, nearly stationary tackle, and how it ends (Integration,
2026-11-12: does an anchored NFL tackle keep the rusher beside him while we end the rep?). Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/level-hold.py <plays.jsonl.gz> [...]

Pairing as edge-rush.py. A spell: consecutive frames (ball in the QB's hands) with the rusher within 1.2 yd of his
tackle, level with him (rusher x - tackle x within +-0.3 yd... or deeper by up to 0.6 yd: beside his hip), outside him
(width outside >= -0.3), and the tackle nearly stationary (speed < 1.5 yd/s). Its length, the share lasting 0.5 s or
more, and how it ends: past (the rusher more than 0.6 yd deeper than the tackle, still outside), inside (width
< -0.3), apart (more than 1.2 yd), tackle moving (>= 1.5 yd/s), or the ball out / the play over.
"""
import sys, os, json, gzip, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')

for path in sys.argv[1:]:
    spells = []; plays = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        plays += 1; by = raw['ball_y']; fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end))
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
            d = max(cand)[1]; start = None
            def state(k):
                (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
                if None in (rx, tx): return 'gone'
                if p.dist(d, tk, k) > 1.2: return 'apart'
                if side * (ry - by) - side * (ty - by) < -0.3: return 'inside'
                dep = rx - tx
                if dep < -0.6: return 'past'
                if dep > 0.3: return 'in front'
                if p.speed(tk, k) >= 1.5: return 'tackle moving'
                return 'level'
            for k in range(p.k(0.5), kend + 1):
                s = state(k)
                if s == 'level':
                    if start is None: start = k
                elif start is not None:
                    spells.append(((k - start) * p.dt, s)); start = None
            if start is not None: spells.append(((kend + 1 - start) * p.dt, 'ball out / play over'))
    L = [s[0] for s in spells]; n = len(spells)
    print(f"== {os.path.basename(path)}: dropbacks {plays} | spells level-outside an engaged, nearly stationary tackle: {n} ({n / max(1, plays):.2f} a dropback)")
    if not n: continue
    print(f"   length p25/50/75 {q(L, .25):.2f}/{q(L):.2f}/{q(L, .75):.2f} s | lasting >= 0.5 s {100 * sum(x >= 0.5 for x in L) / n:.0f}% | >= 1.0 s {100 * sum(x >= 1.0 for x in L) / n:.0f}%")
    c = C.Counter(s[1] for s in spells); c5 = C.Counter(s[1] for s in spells if s[0] >= 0.5); n5 = sum(c5.values())
    print("   ends: " + ' | '.join(f"{k} {100 * v / n:.0f}%" for k, v in c.most_common()))
    print("   ends of spells >= 0.5 s: " + ' | '.join(f"{k} {100 * v / max(1, n5):.0f}%" for k, v in c5.most_common()))
