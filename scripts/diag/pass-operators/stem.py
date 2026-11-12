"""Route stems: speed profile from the snap, by release (pressed / off) and alignment (same code, NFL and sim).

usage: python3 -I scripts/diag/pass-operators/stem.py <plays.jsonl.gz> [...]

Population: pass plays; WR/TE who run downfield (3+ yd past the line by 1.5 s or by the throw). Pressed = a defender
within 2.0 yd of him at the snap. Alignment: slot / wide by lateral distance from the ball (10 yd). Speed at 0.5, 1.0,
1.5, 2.0 s after the snap (before the throw only), share at 6-7+ yd/s by 1.5 s, and the first-0.5 s acceleration
(speed at 0.5 s / 0.5 s). A 'throttle' = a drop of 1 yd/s or more within 0.4 s before his first heading change of
35 degrees or more (a break), among those with a break before the throw."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
T = (0.5, 1.0, 1.5, 2.0)
for path in sys.argv[1:]:
    G = collections.defaultdict(lambda: collections.defaultdict(list))
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
        if raw.get('kind') != 'pass' or 'pass_forward' not in ev: continue
        p = Play(raw); kr = p.k(ev['pass_forward']); D = p.who('D')
        for r in p.who('O'):
            if p.players[r]['group'] not in ('WR', 'TE') or p.pos(r, 0)[0] is None: continue
            k15 = min(kr, int(round(1.5 / p.dt)))
            if p.pos(r, k15)[0] is None or p.pos(r, k15)[0] < 3: continue
            press = any(p.pos(d, 0)[0] is not None and p.dist(r, d, 0) <= 2.0 for d in D)
            align = 'slot' if abs(p.pos(r, 0)[1] - raw['ball_y']) < 10 else 'wide'
            sp = {}
            for t in T:
                k = int(round(t / p.dt))
                if k <= kr and k < p.frames and p.pos(r, k)[0] is not None: sp[t] = math.hypot(*p.velocity(r, k))
            n3, kb = max(1, int(round(0.3 / p.dt))), None
            for k in range(n3, min(kr, p.frames - n3)):
                (x0, y0), (x1, y1), (x2, y2) = p.pos(r, k - n3), p.pos(r, k), p.pos(r, k + n3)
                if None in (x0, x1, x2) or math.hypot(x1 - x0, y1 - y0) < 0.6: continue
                a1, a2 = math.atan2(y1 - y0, x1 - x0), math.atan2(y2 - y1, x2 - x1)
                if abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi) * 57.3 >= 35: kb = k; break
            thr = None
            if kb is not None:
                n4 = int(round(0.4 / p.dt)); vs = [math.hypot(*p.velocity(r, k)) for k in range(max(0, kb - n4), kb + 1)]
                thr = (max(vs) - vs[-1]) >= 1.0
            for key in ((('press' if press else 'off'), align), ('all', 'all')):
                g = G[key]
                for t, v in sp.items(): g[t].append(v)
                if 1.5 in sp: g['fast15'].append(sp[1.5] >= 6)
                if 0.5 in sp: g['acc05'].append(sp[0.5] / 0.5)
                if thr is not None: g['throttle'].append(thr)
    print('==', os.path.basename(path))
    for key in sorted(G):
        g = G[key]; n = len(g[0.5])
        print(f"  {'/'.join(key):12} n {n:5} | speed at 0.5/1.0/1.5/2.0 s {' / '.join(f'{q(g[t]):.1f}' for t in T)} | >=6 yd/s at 1.5 s {100*sum(g['fast15'])/max(1,len(g['fast15'])):.0f}% | "
              f"accel first 0.5 s {q(g['acc05']):.1f} yd/s2 | throttle before the break {100*sum(g['throttle'])/max(1,len(g['throttle'])):.0f}% (n {len(g['throttle'])})")
