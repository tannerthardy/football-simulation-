"""Settled catches against zone (catch 3-10 yd past the line, catcher under 2 yd/s at arrival), nearest non-DL defender
within 3.5 yd at arrival: from arrival to +1.0 s every 0.2 s, his distance to the catcher, his speed toward him, his
speed, the catcher's speed; the side the catcher goes at +0.5 s relative to the defender's velocity at arrival (with
his momentum / against / still); reached within 1.0 yd by +1.0 s. Same code on NFL and sim.
usage: python3 -I settlecurve.py name=a.jsonl.gz[,b] ..."""
import os, sys, gzip, json, math, statistics as st, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family
MARKS = (0, 0.2, 0.4, 0.6, 0.8, 1.0)
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = {m: [] for m in MARKS}; turns = C.Counter(); reach = C.Counter(); n = 0
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or raw.get('target') is None: continue
            if coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
            t = raw['target']; rec = raw.get('receiver') if raw.get('receiver') is not None else t
            if rec != t: continue
            p = Play(raw)
            if p.players[t]['side'] != 'O': continue
            kc = p.k(ev.get('pass_arrived', ev['catch'])); kl = p.k(p.end); cx, cy = p.pos(t, kc)
            if cx is None or not (3 <= cx <= 10) or p.speed(t, kc) >= 2: continue
            D = [d for d in p.who('D') if p.players[d].get('group') != 'DL' and p.pos(d, kc)[0] is not None]
            if not D: continue
            d = min(D, key=lambda d: p.dist(d, t, kc))
            if p.dist(d, t, kc) > 3.5: continue
            n += 1; dvx, dvy = p.velocity(d, kc)
            for m in MARKS:
                k = kc + round(m / p.dt)
                if k > kl or p.pos(d, k)[0] is None or p.pos(t, k)[0] is None: continue
                dist = p.dist(d, t, k); (x, y), (tx, ty) = p.pos(d, k), p.pos(t, k); vx, vy = p.velocity(d, k)
                tow = (vx * (tx - x) + vy * (ty - y)) / (dist or 1)
                R[m].append((dist, tow, math.hypot(vx, vy), p.speed(t, k)))
            k5 = min(kl, kc + round(.5 / p.dt)); cvx, cvy = p.velocity(t, k5)
            turns['still' if math.hypot(cvx, cvy) < 1 else 'with his momentum' if dvx * cvx + dvy * cvy > 0 else 'against his momentum'] += 1
            k10 = min(kl, kc + round(1.0 / p.dt))
            reach['reached' if any(min(p.dist(e, t, k) for e in p.who('D')) <= 1.0 for k in range(kc, k10 + 1)) else 'never'] += 1
    print(f"== {name}: settled catches with a defender within 3.5 yd, n {n}; reached within 1.0 yd by +1.0 s {reach['reached'] / max(1, n):.0%}; catcher at +0.5 s: " + ', '.join(f'{k} {v / n:.0%}' for k, v in turns.most_common()))
    for m in MARKS:
        X = R[m]
        if X: print(f"   +{m:.1f} s n {len(X):3}: dist {st.median(x[0] for x in X):.1f}, his speed toward him {st.median(x[1] for x in X):+.1f}, his speed {st.median(x[2] for x in X):.1f}, catcher speed {st.median(x[3] for x in X):.1f}")
