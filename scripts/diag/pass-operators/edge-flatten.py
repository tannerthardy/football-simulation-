"""The edge rusher's flatten, in Defense's deep_break.py form (Integration, 2026-11-15: report the edge's turn at the top of
the arc "in the same form as their deep_break.py ... so the three findings can be read together"). Same code on NFL
tracking and sim exports (common format, offense attacks +x, the line at x = 0).

usage: python3 -I scripts/diag/pass-operators/edge-flatten.py <plays.jsonl.gz> [...]

Pairing: on dropbacks, each tackle (the outermost OL by y at the snap) and the outermost defender aligned outside him
within 4 yd and within 2 yd of the line at the snap.
The event (where the coaching says he flattens: at the tackle's hip): the first frame, from 0.3 s and before the ball is
out, at which the rusher is more than 0.3 yd deeper than the tackle while still outside him. Achieved only, both sides.
  old line: his velocity at the event. new line: his displacement from +0.5 to +1.0 s after it (at least 1 yd).
  turn: old line to new line.
For each: his speed at the event; speed along the new line at +0.25 / +0.5 / +1.0 s; along the old line at +0.1 .. +0.5 s;
the time for his velocity to come within 20 deg of the new line; his distance to the QB at the event and at +1.0 s.
Rows by turn (under 45, 45-90, over 90) and for all.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
def q(v, p=.5):
    v = sorted(x for x in v if x is not None)
    return v[min(len(v) - 1, int(p * (len(v) - 1) + .5))] if v else float('nan')
def ang(a, b):
    return abs(math.degrees((math.atan2(a[1], a[0]) - math.atan2(b[1], b[0]) + math.pi) % (2 * math.pi) - math.pi))
for path in sys.argv[1:]:
    R = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw.get('events', {}); fw = ev.get('pass_forward'); end = fw if fw is not None else p.end
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]; by = raw.get('ball_y', 0)
        D = [i for i in p.who('D') if p.pos(i, 0)[0] is not None]
        vel = lambda j, k: (lambda a, b: None if a[0] is None or b[0] is None else ((b[0] - a[0]) / (2 * p.dt), (b[1] - a[1]) / (2 * p.dt)))(p.pos(j, k - 1), p.pos(j, k + 1))
        for tk in (OL[0], OL[-1]):
            tx0, ty0 = p.pos(tk, 0); side = 1 if ty0 - by > 0 else -1
            cand = [d for d in D if 0 <= side * (p.pos(d, 0)[1] - ty0) <= 4 and abs(p.pos(d, 0)[0]) < 2]
            if not cand: continue
            d = max(cand, key=lambda d: side * (p.pos(d, 0)[1] - ty0))
            F = None
            for k in range(p.k(0.3), min(p.k(end), p.frames - 12)):
                (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
                if rx is None or tx is None: break
                if rx - tx < -0.3 and side * (ry - ty) > 0: F = k; break
            if F is None: continue
            v0 = vel(d, F); a5, a10 = p.pos(d, F + 5), p.pos(d, F + 10)
            if v0 is None or a5[0] is None or a10[0] is None or math.hypot(*v0) < 1: continue
            dd = (a10[0] - a5[0], a10[1] - a5[1]); L = math.hypot(*dd)
            if L < 1: continue
            nl = (dd[0] / L, dd[1] / L); s0 = math.hypot(*v0); ol = (v0[0] / s0, v0[1] / s0)
            along = lambda k, u: (lambda v: None if v is None else v[0] * u[0] + v[1] * u[1])(vel(d, k))
            t20 = None
            for k in range(F + 1, F + 11):
                v = vel(d, k)
                if v and math.hypot(*v) > 0.5 and ang(v, nl) < 20: t20 = (k - F) * p.dt; break
            n25 = [x for x in (along(F + 2, nl), along(F + 3, nl)) if x is not None]
            R.append(dict(turn=ang(v0, nl), s0=s0, t=F * p.dt, n25=sum(n25) / len(n25) if n25 else None, n5=along(F + 5, nl), n10=along(F + 10, nl),
                          old=[along(F + k, ol) for k in range(1, 6)], t20=t20, qb0=p.dist(d, qb, F), qb10=p.dist(d, qb, F + 10)))
    print(f"== {os.path.basename(path)}: edge rushers reaching the tackle's hip, {len(R)}")
    for lab, f in (('all', lambda r: True), ('turn under 45', lambda r: r['turn'] < 45), ('turn 45-90', lambda r: 45 <= r['turn'] <= 90), ('turn over 90', lambda r: r['turn'] > 90)):
        S = [r for r in R if f(r)]
        if not S: continue
        t20 = [r['t20'] for r in S]
        print(f"  {lab:14s} n {len(S):5d} ({100 * len(S) / len(R):3.0f}%) | at {q([r['t'] for r in S]):.1f} s, speed {q([r['s0'] for r in S]):.1f}, turn {q([r['turn'] for r in S]):.0f} deg"
              f" | along new line +0.25 / +0.5 / +1.0 s: {q([r['n25'] for r in S]):.1f} / {q([r['n5'] for r in S]):.1f} / {q([r['n10'] for r in S]):.1f}"
              f" | along old line +0.1..0.5 s: " + ' '.join(f"{q([r['old'][i] for r in S]):.1f}" for i in range(5))
              + f" | within 20 deg of new line by {q(t20):.1f} s ({100 * sum(1 for x in t20 if x is not None) / len(S):.0f}% within 1 s)"
              f" | to the QB {q([r['qb0'] for r in S]):.1f} -> {q([r['qb10'] for r in S]):.1f} yd")
