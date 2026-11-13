"""Pursuit heading and line-of-sight rotation, same operator NFL and sim (pursuit.py population: open field, 0-3 s,
defender 5-25 yd, moving > 1.5, carrier > 1): his velocity heading turn rate, the rotation rate of the line to the
carrier (0 = constant bearing = a holding intercept), and aim. usage: python3 -I scripts/diag/pass-operators/losrate.py name=path[:maxplays] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def q(v, f='{:.0f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
def wrap(a): return abs((a + 540) % 360 - 180)
for arg in sys.argv[1:]:
    name, spec = arg.split('='); path, _, mx = spec.partition(':'); mx = int(mx or 10**9)
    R = C.defaultdict(list); n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); kind = raw.get('kind')
        if kind not in ('run', 'pass'): continue
        p = Play(raw); kl = p.k(p.end)
        if kind == 'pass':
            if 'catch' not in ev or raw.get('target') is None: continue
            c = raw['target']; k0 = p.k(ev['catch'])
        else:
            c = raw.get('carrier')
            if c is None: continue
            k0 = next((k for k in range(p.k(ev.get('handoff', 0)), kl + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
            if k0 is None: continue
        if p.players[c]['side'] != 'O' or k0 >= kl: continue
        n += 1
        if n > mx: break
        st = max(1, round(0.2 / p.dt))
        for d in p.who('D'):
            for k in range(k0, min(kl - st, k0 + round(3.0 / p.dt))):
                (x, y), (cx, cy) = p.pos(d, k), p.pos(c, k); (x2, y2), (cx2, cy2) = p.pos(d, k + st), p.pos(c, k + st)
                if None in (x, cx, x2, cx2): break
                dx, dy = cx - x, cy - y; dist = math.hypot(dx, dy)
                if dist <= 1: break
                vx, vy = p.velocity(d, k); vx2, vy2 = p.velocity(d, k + st); cvx, cvy = p.velocity(c, k)
                s, cs = math.hypot(vx, vy), math.hypot(cvx, cvy)
                if not (5 <= dist <= 25) or s < 1.5 or cs < 1 or math.hypot(vx2, vy2) < 1.5: continue
                bear = math.degrees(math.acos(max(-1, min(1, ((x - cx) * cvx + (y - cy) * cvy) / (dist * cs)))))
                geo = 'ahead' if bear < 60 else 'level' if bear <= 120 else 'trailing'
                T = st * p.dt
                hr = wrap(math.degrees(math.atan2(vy2, vx2) - math.atan2(vy, vx))) / T
                lr = wrap(math.degrees(math.atan2(cy2 - y2, cx2 - x2) - math.atan2(dy, dx))) / T
                R[(kind, geo)].append((hr, lr, s))
    print(f'{name}: {n} plays')
    for kind in ('run', 'pass'):
        for geo in ('ahead', 'level', 'trailing'):
            X = R[(kind, geo)]
            if len(X) < 20: continue
            print(f'  {kind:4} {geo:8} n {len(X):6}: heading turn {q([x[0] for x in X])} deg/s | line-of-sight rotation {q([x[1] for x in X])} deg/s | speed {q([x[2] for x in X], "{:.1f}")}')
