"""The end of a tackled play as a fall (Integration, 2026-11-12: a fall in the World keeps the carrier's pace; tracking
cannot see a fall, but the end of a tackle is one). Same code on NFL and sim.

usage: python3 -I scripts/diag/pass-operators/fall-end.py <plays.jsonl.gz> [...]

Population: plays with a ball carrier (designed-run carrier from the handoff, or the receiver from the catch) whose
play ends in a tackle-like stop (the play's end, the carrier inside the field, not past the goal line), with exactly
one defender within 1.5 yd of him at the end (a solo finish). The 'last running frame' is the last frame before the end
where his speed is at least 70% of his peak over the 1.0 s before first contact (else of the 1.0 s before the end).
Reported, by his speed at that frame (<4, 4-6, >6 yd/s): n, distance and time from it to the end (p50/p75), and the
mean deceleration over it. Limits: speeds are tracking speeds (0.1 s, quantized 0.1 yd); 'the end' is the tagged end
(NFL: tackle tag; sim: the whistle), so both include the whistle's own lag.
"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
sb = lambda s: '<4' if s < 4 else '4-6' if s <= 6 else '>6'

def rows(path):
    out = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') == 'run' and raw.get('carrier') is not None and 'handoff' in ev: c = raw['carrier']; k0t = ev['handoff']
        elif raw.get('kind') == 'pass' and 'catch' in ev and (raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')) is not None:
            c = raw['receiver'] if raw.get('receiver') is not None else raw['target']; k0t = ev.get('pass_arrived', ev['catch'])
        else: continue
        p = Play(raw); last = min(p.frames - 1, p.k(p.end)); k0 = p.k(k0t)
        if last - k0 < 5 or p.pos(c, last)[0] is None: continue
        x, y = p.pos(c, last)
        if y < 0.5 or y > 160 / 3 - 0.5 or raw.get('yards', 0) is None: continue
        D = [d for d in p.who('D') if p.pos(d, last)[0] is not None]
        near = [d for d in D if p.dist(c, d, last) <= 1.5]
        if len(near) != 1: continue
        kc = next((k for k in range(k0, last + 1) if any(p.pos(d, k)[0] is not None and p.dist(c, d, k) <= 1.0 for d in D)), None)
        ref = kc if kc is not None else last
        peak = max((p.speed(c, k) for k in range(max(k0, ref - 10), ref + 1)), default=0)
        if peak < 1: continue
        kr = next((k for k in range(last - 1, k0 - 1, -1) if p.speed(c, k) >= 0.7 * peak), None)
        if kr is None: continue
        s = p.speed(c, kr); dt = (last - kr) * p.dt
        if dt <= 0: continue
        dist = math.hypot(p.pos(c, last)[0] - p.pos(c, kr)[0], p.pos(c, last)[1] - p.pos(c, kr)[1])
        out.append((sb(s), s, dist, dt, max(0.0, s - p.speed(c, last)) / dt))
    return out

R = {path: rows(path) for path in sys.argv[1:]}
for path, rs in R.items():
    print(f"== {os.path.basename(path)}: solo finishes n {len(rs)}")
    for b in ('<4', '4-6', '>6'):
        v = [r for r in rs if r[0] == b]
        if not v: continue
        print(f"   speed {b:4s} n {len(v):5d}: distance to the end p50/p75 {q([r[2] for r in v]):.2f}/{q([r[2] for r in v], .75):.2f} yd | time {q([r[3] for r in v]):.2f}/{q([r[3] for r in v], .75):.2f} s | mean decel p50 {q([r[4] for r in v]):.1f} yd/s^2")
