"""Where an untouched tackle stops giving ground (Integration, 2026-11-13: size the depth and its spread). Same code on
NFL and sim.

usage: python3 -I scripts/diag/pass-operators/untouched-depth.py <plays.jsonl.gz> [...]

Dropbacks with a throw. The launch point is the QB's depth at the throw (the NFL set has no called drop). A tackle is
untouched at a frame if no defender has come within 1.2 yd of him since the snap. Frames 2.0-3.0 s, ball in: the
tackle's depth over the launch point (+ = shallower than the QB will throw from) and his x-velocity; the distribution
(p10/25/50/75/90). Also by his x-velocity: a tackle still giving ground (< -1 yd/s) or settled (>= -1).
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
P = lambda v: " / ".join(f"{q(v, f):+.2f}" for f in (.1, .25, .5, .75, .9))

for path in sys.argv[1:]:
    over, vel, settled, moving, launches = [], [], [], [], []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        if str((raw.get('cell') or {}).get('concept', '')).startswith('pa'): continue
        fw = raw['events'].get('pass_forward')
        if fw is None or fw < 2.0: continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; kf = p.k(fw)
        lx = p.pos(qb, kf)[0]
        if lx is None: continue
        launches.append(lx)
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        by = raw['ball_y']; D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        for side in (-1, 1):
            tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by))
            touched = False
            for k in range(0, kf):
                if p.pos(tk, k)[0] is None: break
                if any(p.pos(d, k)[0] is not None and p.dist(d, tk, k) <= 1.2 for d in D): touched = True
                if touched: break
                t = k * p.dt
                if 2.0 <= t <= 3.0:
                    o = p.pos(tk, k)[0] - lx; v = p.velocity(tk, k)[0]
                    over.append(o); vel.append(v); (moving if v < -1 else settled).append(o)
    print(f"== {os.path.basename(path)}: launch depth p50 {q(launches):+.2f} | untouched tackle frames 2.0-3.0 s: {len(over)}")
    print(f"   over the launch point p10/25/50/75/90: {P(over)} | x-vel p50 {q(vel):+.2f} (giving ground > 1 yd/s {100 * sum(v < -1 for v in vel) / max(1, len(vel)):.0f}%)")
    print(f"   settled (x-vel >= -1): n {len(settled)}, over the launch point {P(settled)} | still giving ground: n {len(moving)}, {P(moving)}")
