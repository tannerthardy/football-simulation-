"""Defensive linemen after the throw on completed passes (Integration, 2026-11-11). Same code on NFL tracking and sim
plays (common format). For every DL with tracking from the release (events.pass_forward) to the ball's arrival: at
release +0 / +0.2 / +0.4 / +0.6 / +0.8 s, his speed, his velocity toward the catcher, and whether an OL is within 1.2 yd
(still on a block); plus the share of DL within 10 yd of the catcher at the arrival, and for those, the same columns.
usage: python3 -I scripts/diag/defense-yards/rushpeel.py <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = (0.0, 0.2, 0.4, 0.6, 0.8)
for path in sys.argv[1:]:
    S = collections.defaultdict(list); n = collections.Counter()
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'catch' not in ev or 'pass_forward' not in ev: continue
        c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
        if c is None: continue
        p = Play(raw); kr = p.k(ev['pass_forward']); ka = p.k(ev.get('pass_arrived', ev['catch']))
        OL = p.who('O', 'OL')
        for d in p.who('D', 'DL'):
            if any(p.pos(d, k)[0] is None for k in range(kr, min(p.frames, ka + 1))) or p.pos(c, ka)[0] is None: continue
            grp = ('all', 'near') if p.dist(c, d, ka) <= 10 else ('all',)
            for g in grp:
                n[g] += 1
                for t in T:
                    k = kr + int(round(t / p.dt))
                    if k >= p.frames or p.pos(c, k)[0] is None or p.pos(d, k)[0] is None: continue
                    (dx, dy), (cx, cy) = p.pos(d, k), p.pos(c, k); L = math.hypot(cx - dx, cy - dy) or 1; vx, vy = p.velocity(d, k)
                    S[(g, t, 's')].append(math.hypot(vx, vy)); S[(g, t, 'tw')].append((vx * (cx - dx) + vy * (cy - dy)) / L)
                    S[(g, t, 'ol')].append(any(p.dist(o, d, k) <= 1.2 for o in OL))
    print(f"== {os.path.basename(path)}: DL on completed passes {n['all']}; within 10 yd of the catcher at arrival {n['near']} ({100 * n['near'] / max(1, n['all']):.0f}%)")
    for g in ('all', 'near'):
        print(f"  [{g}]")
        for t in T:
            if S[(g, t, 's')]: print(f"   release +{t:.1f} s: speed p50 {q(S[(g, t, 's')]):.1f} yd/s | toward the catcher {q(S[(g, t, 'tw')]):+.1f} (p75 {q(S[(g, t, 'tw')], .75):+.1f}) | an OL within 1.2 yd {100 * sum(S[(g, t, 'ol')]) / len(S[(g, t, 'ol')]):.0f}%")
