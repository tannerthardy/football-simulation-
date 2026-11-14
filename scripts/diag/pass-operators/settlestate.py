"""Settled catches against zone (catch 3-10 yd past the line, catcher under 2 yd/s at the catch; no route labels needed).
The nearest non-DL defender at the catch: depth over the catcher (+ = deeper), his speed, his downhill speed (toward the
line), his closing speed on the catcher, distance; 'through the spot' = within 1 yd over or below him and moving downhill
over 2 yd/s. Then time until any defender is within 1.0 yd, and YAC. By depth-over band. Same code on NFL and sim.
usage: python3 -I settlestate.py name=a.jsonl.gz[,b] ..."""
import os, sys, gzip, json, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family
BANDS = ((-9, 0), (0, 1), (1, 2), (2, 9))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = []
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
            D = [d for d in p.who('D') if p.players[d].get('group') != 'DL']
            D = [d for d in D if p.pos(d, kc)[0] is not None]
            if not D: continue
            d = min(D, key=lambda d: p.dist(d, t, kc)); dx, dy = p.pos(d, kc); vx, vy = p.velocity(d, kc)
            dist = p.dist(d, t, kc)
            close = (p.dist(d, t, kc - 1) - p.dist(d, t, kc + 1)) / (2 * p.dt) if 0 < kc < p.frames - 1 else 0
            kr = next((k for k in range(kc, kl + 1) if min(p.dist(e, t, k) for e in p.who('D')) <= 1.0), None)
            xs = [p.pos(t, k)[0] for k in range(kc, kl + 1) if p.pos(t, k)[0] is not None]
            over = dx - cx
            R.append((over, p.speed(d, kc), -vx, close, dist, None if kr is None else (kr - kc) * p.dt, xs[-1] - cx,
                      over <= 1 and -vx > 2))
    n = len(R)
    print(f"== {name}: settled catches vs zone n {n}: YAC mean {st.mean(r[6] for r in R):.2f}, 10+ {sum(r[6] >= 10 for r in R) / n:.0%}; through the spot {sum(r[7] for r in R) / n:.0%}")
    for lo, hi in BANDS:
        X = [r for r in R if lo <= r[0] < hi]
        if not X: continue
        T = [r[5] for r in X if r[5] is not None]
        print(f"   over {lo:+d}..{hi:+d}: {len(X) / n:4.0%} (n {len(X):3}) | his speed {st.median(r[1] for r in X):.1f}, downhill {st.median(r[2] for r in X):+.1f}, closing {st.median(r[3] for r in X):+.1f}, dist {st.median(r[4] for r in X):.1f} | "
              f"through the spot {sum(r[7] for r in X) / len(X):4.0%} | to 1.0 yd {st.median(T) if T else float('nan'):.1f} s (never {sum(r[5] is None for r in X) / len(X):.0%}) | YAC {st.mean(r[6] for r in X):5.2f}, 10+ {sum(r[6] >= 10 for r in X) / len(X):4.0%}")
