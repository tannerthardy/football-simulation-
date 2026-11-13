"""After-catch acceleration race (same code NFL and sim): defenders within 8 yd at the catch, by geometry, and the
catcher: speed at the catch, +0.5, +1.0 s, and the gap change over 1 s; split open / other (open = no defender within
2 yd by +3 s, live at +1 s). Also the defender's velocity heading off the line to the catcher at the catch (0 = at him).
usage: python3 -I scripts/diag/pass-operators/catch_accel.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list); CR = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or raw.get('target') is None: continue
            p = Play(raw); c = raw['target']; k0 = p.k(ev['catch']); kl = p.k(p.end)
            k5, k1 = k0 + round(.5 / p.dt), k0 + round(1 / p.dt)
            if p.pos(c, k0)[0] is None or k1 > kl or p.pos(c, k1)[0] is None: continue
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            kw = min(kl, k0 + round(3 / p.dt))
            mn = min(min((p.dist(d, c, k) for k in range(k0, kw + 1) if p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None), default=99) for d in D)
            open_ = 'open' if mn > 2 else 'other'
            CR[open_].append((p.speed(c, k0), p.speed(c, k5), p.speed(c, k1)))
            cx, cy = p.pos(c, k0); cvx, cvy = p.velocity(c, k0); cs = math.hypot(cvx, cvy)
            for d in D:
                if p.dist(d, c, k0) > 8 or p.pos(d, k1)[0] is None: continue
                (x, y) = p.pos(d, k0); L = math.hypot(cx - x, cy - y)
                if cs < 1 or L < 1e-6: continue
                b = math.degrees(math.acos(max(-1, min(1, ((x - cx) * cvx + (y - cy) * cvy) / (L * cs)))))
                geo = 'ahead' if b < 60 else 'level' if b <= 120 else 'trailing'
                vx, vy = p.velocity(d, k0)
                off = abs(math.degrees(math.atan2(-vx * (cy - y) + vy * (cx - x), vx * (cx - x) + vy * (cy - y)))) if math.hypot(vx, vy) > 0.5 else None
                R[(open_, geo)].append((p.speed(d, k0), p.speed(d, k5), p.speed(d, k1), p.dist(d, c, k1) - L, off))
    print(f'== {name}: speed at catch / +0.5 / +1.0 s (p50), gap change over 1 s, his heading off the line to the catcher at the catch')
    for o in ('other', 'open'):
        X = CR[o]; print(f"  {o:5} catcher n {len(X):4}: {q([x[0] for x in X]).split('/')[1]} / {q([x[1] for x in X]).split('/')[1]} / {q([x[2] for x in X]).split('/')[1]}" if len(X) >= 5 else f'  {o} catcher -')
        for geo in ('ahead', 'level', 'trailing'):
            Y = R[(o, geo)]
            if len(Y) < 8: continue
            print(f"     {geo:8} defenders n {len(Y):4}: {q([y[0] for y in Y]).split('/')[1]} / {q([y[1] for y in Y]).split('/')[1]} / {q([y[2] for y in Y]).split('/')[1]} | gain +0..1 s {q([y[2] - y[0] for y in Y])} | gap change {q([y[3] for y in Y])} yd | heading off line {q([y[4] for y in Y], '{:.0f}')} deg")
