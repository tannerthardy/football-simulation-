"""When the ball leaves relative to the target's break, by route class from the trajectory (same code, NFL and sim).
Throws: pass plays with pass_forward and a target, the target 2+ yd past the line at arrival (pass_arrived, else
the last frame). Break: the first frame after the target has run 0.6 s at >= 3 yd/s where his heading over the
next 0.3 s differs from the previous 0.3 s by >= 35 deg, or his speed drops below 60% of his stem speed.
Class at the break: stop (post-break downfield velocity <= -0.5: comeback, curl, hitch), in / out (lateral,
toward / away from the ball's snap spot), vertical-ish breaks (corner, post: post-break downfield velocity >= 2),
none (no break before arrival: go, seam, flat). Depth of the break bucketed. Reports release - break p25/50/75
(negative = thrown before the break) and arrival - break.
usage: python3 -I scripts/diag/pass-operators/relbreak.py <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    G = collections.defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'pass_forward' not in ev or raw.get('target') is None: continue
        p = Play(raw); t = raw['target']; kr = p.k(ev['pass_forward'])
        ka = min(p.k(ev['pass_arrived']) if 'pass_arrived' in ev else len(raw['xy']) - 1, len(raw['xy']) - 1)
        if any(p.pos(t, k)[0] is None for k in range(0, ka + 1)) or p.pos(t, ka)[0] < 2: continue
        n3 = max(1, int(round(0.3 / p.dt))); run = 0; kb = None; stem = 0
        for k in range(n3, ka - n3 + 1):
            vx, vy = p.velocity(t, k); s = math.hypot(vx, vy)
            if s >= 3: run += 1; stem = max(stem, s)
            if run * p.dt < 0.6: continue
            (x0, y0), (x1, y1), (x2, y2) = p.pos(t, k - n3), p.pos(t, k), p.pos(t, k + n3)
            a1, a2 = math.atan2(y1 - y0, x1 - x0), math.atan2(y2 - y1, x2 - x1)
            turn = abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi) * 57.3
            if turn >= 35 or math.hypot(x2 - x1, y2 - y1) / (n3 * p.dt) < 0.6 * stem: kb = k; break
        if kb is None: cls = 'none'; depth = p.pos(t, ka)[0]
        else:
            (x1, y1), (x2, y2) = p.pos(t, kb), p.pos(t, min(ka, kb + n3)); dvx = (x2 - x1) / (n3 * p.dt); dvy = (y2 - y1) / (n3 * p.dt)
            inward = -math.copysign(1, y1 - raw['ball_y']) * dvy
            cls = 'stop' if dvx <= -0.5 else 'vert-break' if dvx >= 2 and abs(dvy) < dvx * 1.5 else 'in' if inward > 0 else 'out'
            depth = x1
        db = '<5' if depth < 5 else '5-10' if depth < 10 else '10-20' if depth < 20 else '20+'
        for key in ((cls, db), (cls, 'all')):
            G[key].append(((kr - kb) * p.dt if kb is not None else None, (ka - kb) * p.dt if kb is not None else None, ev['pass_forward']))
    print('==', os.path.basename(path))
    tot = sum(len(v) for k, v in G.items() if k[1] == 'all')
    for k in sorted(G):
        v = G[k]; rb = [a for a, _, _ in v if a is not None]; ab = [b for _, b, _ in v if b is not None]
        print(f"   {k[0]:10} {k[1]:5} n {len(v):5} ({100*len(v)/tot:4.1f}%) | release-break p25/50/75 {q(rb,.25):+.2f} {q(rb):+.2f} {q(rb,.75):+.2f} | arrival-break {q(ab):+.2f} | release t p50 {q([c for _, _, c in v]):.2f}")
