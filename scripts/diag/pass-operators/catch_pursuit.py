"""How the nearest defenders close on a short catch (0-10 yd downfield), same code NFL and sim.

usage: python3 -I scripts/diag/pass-operators/catch_pursuit.py <off.jsonl.gz> [...] -- <on.jsonl.gz> [...] --- <nfl.jsonl.gz>

At the catch: nearest gap, his closing speed on the catcher, his and the catcher's speed; 0.5 s later: gap, his speed
and the part of it aimed at the catcher; 1.0 s later: the nearest gap."""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def go(paths):
    out = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw['events']
            if raw['kind'] != 'pass' or 'catch' not in ev: continue
            c = raw.get('receiver') if raw.get('receiver') is not None else raw.get('target')
            if c is None: continue
            p = Play(raw); ka = p.k(ev['catch']); ke = min(p.k(ev['end']), p.frames - 1)
            if p.pos(c, ka)[0] is None or not (0 <= p.pos(c, ka)[0] < 10): continue
            D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
            if not D: continue
            # three nearest defenders at the catch: gap now and 0.5 / 1.0 s later
            near = sorted(D, key=lambda d: p.dist(c, d, ka))[:3]
            row = {'gap0': [p.dist(c, d, ka) for d in near]}
            for dt in (5, 10):
                k = ka + dt
                if k > ke or p.pos(c, k)[0] is None: row[dt] = None; continue
                row[dt] = min(p.dist(c, d, k) for d in D if p.pos(d, k)[0] is not None)
            cv = p.velocity(c, ka); f = near[0]; fv = p.velocity(f, ka)
            (cx, cy), (fx, fy) = p.pos(c, ka), p.pos(f, ka); L = math.hypot(cx - fx, cy - fy) or 1
            row['close'] = ((fv[0] - cv[0]) * (cx - fx) + (fv[1] - cv[1]) * (cy - fy)) / L
            row['fs'] = math.hypot(*fv); row['cs'] = math.hypot(*cv)
            # 0.5 s after: nearest defender's speed and how much of it points at the catcher
            k = ka + 5
            if k <= ke and p.pos(c, k)[0] is not None and p.pos(f, k)[0] is not None:
                fv2 = p.velocity(f, k); (cx2, cy2), (fx2, fy2) = p.pos(c, k), p.pos(f, k); L2 = math.hypot(cx2 - fx2, cy2 - fy2) or 1
                row['fs5'] = math.hypot(*fv2); row['toward5'] = (fv2[0] * (cx2 - fx2) + fv2[1] * (cy2 - fy2)) / L2
                cv2 = p.velocity(c, k); row['cs5'] = math.hypot(*cv2)
            out.append(row)
    return out
i = sys.argv.index('--'); j = sys.argv.index('---')
for name, paths in (('nfl', sys.argv[j + 1:]), ('off', sys.argv[1:i]), ('on', sys.argv[i + 1:j])):
    v = go(paths); g = lambda key: [o[key] for o in v if o.get(key) is not None]
    print(f"{name:3} catches 0-10 yd n{len(v)} | at catch: nearest gap {q([o['gap0'][0] for o in v]):.1f}, closing {q(g('close')):+.1f} yd/s, finisher speed {q(g('fs')):.1f}, catcher {q(g('cs')):.1f} | "
          f"+0.5 s: nearest gap {q(g(5)):.1f}, finisher speed {q(g('fs5')):.1f} (toward him {q(g('toward5')):.1f}), catcher {q(g('cs5')):.1f} | +1.0 s gap {q(g(10)):.1f}")
