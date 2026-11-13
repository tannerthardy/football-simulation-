"""The last 0.6 s before the catch, same code on NFL tracking and sim plays (common format; Integration, 2026-11-11).
Defenders unengaged (no offensive non-catcher within 1.2 yd) and within 6 yd of the catcher at the catch frame. At
-0.6 / -0.4 / -0.2 / 0 / +0.3 / +0.5 s from the catch: his speed, his velocity along the line to the catcher (+ = coming at
him; the catcher's position at that frame), and the catcher's speed away from him. At -0.6 s: his heading off the line to
the catcher (0 = straight at him, 180 = straight away), distribution. Catch = events.catch; catcher = receiver/target.
usage: python3 -I scripts/diag/defense-yards/catchwin.py <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = (-0.6, -0.4, -0.2, 0.0, 0.3, 0.5)
for path in sys.argv[1:]:
    S = collections.defaultdict(list); n = 0; H = collections.Counter()
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'catch' not in ev: continue
        c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
        if c is None: continue
        p = Play(raw); kc = p.k(ev.get('pass_arrived', ev['catch']))  # ball arrival: NFL's catch event lags arrival by 0.3-0.4 s
        if kc - 6 < 0 or kc + 5 >= p.frames or any(p.pos(c, k)[0] is None for k in range(kc - 6, kc + 6)): continue
        O = [o for o in p.who('O') if o != c]
        for d in p.who('D'):
            if any(p.pos(d, k)[0] is None for k in range(kc - 6, kc + 6)): continue
            if p.dist(c, d, kc) > 6 or any(p.dist(o, d, kc) <= 1.2 for o in O): continue
            n += 1
            for t in T:
                k = kc + int(round(t / p.dt))
                (dx, dy), (cx, cy) = p.pos(d, k), p.pos(c, k); L = math.hypot(cx - dx, cy - dy) or 1; ex, ey = (cx - dx) / L, (cy - dy) / L
                vx, vy = p.velocity(d, k); wx, wy = p.velocity(c, k)
                S[(t, 'spd')].append(math.hypot(vx, vy)); S[(t, 'toward')].append(vx * ex + vy * ey); S[(t, 'away')].append(wx * ex + wy * ey)
                if t == -0.6:
                    s = math.hypot(vx, vy)
                    h = 'slow' if s < 1.5 else 'at him (<45)' if (vx * ex + vy * ey) / s > math.cos(math.radians(45)) else 'away (>135)' if (vx * ex + vy * ey) / s < -math.cos(math.radians(45)) else 'across (45-135)'
                    H[h] += 1
    print(f"== {os.path.basename(path)}: {n} defenders unengaged within 6 yd at the catch")
    for t in T:
        print(f"   {t:+.1f} s: his speed p50 {q(S[(t, 'spd')]):.1f} yd/s | toward the catcher p50 {q(S[(t, 'toward')]):+.1f} (p25 {q(S[(t, 'toward')], .25):+.1f}, p75 {q(S[(t, 'toward')], .75):+.1f}) | catcher away from him {q(S[(t, 'away')]):+.1f}")
    print('   heading at -0.6 s: ' + ', '.join(f"{k} {100 * v / n:.0f}%" for k, v in H.most_common()))
