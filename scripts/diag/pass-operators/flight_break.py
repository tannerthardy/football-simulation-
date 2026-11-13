"""Break on the throw (same code NFL and sim): defenders within 8 yd of the catch point at the catch. During the ball's
flight (pass_forward to catch) their speed and velocity toward the catch point (closing), at the throw, mid-flight and
the last 0.2 s; and the share closing faster than 2 yd/s in the last 0.2 s. Split by whether the catch became open
(no defender within 2 yd by +3 s, play live at +1 s) and by his geometry to the catcher at the catch.
usage: python3 -I scripts/diag/pass-operators/flight_break.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list); P = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or 'pass_forward' not in ev or raw.get('target') is None: continue
            p = Play(raw); c = raw['target']; k0 = p.k(ev['catch']); kt = p.k(ev['pass_forward']); kl = p.k(p.end)
            if p.pos(c, k0)[0] is None or k0 - kt < 3: continue
            cx, cy = p.pos(c, k0); cvx, cvy = p.velocity(c, k0); cs = math.hypot(cvx, cvy)
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            kw = min(kl, k0 + round(3 / p.dt))
            mn = min(min((p.dist(d, c, k) for k in range(k0, kw + 1) if p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None), default=99) for d in D)
            open_ = mn > 2 and (kl - k0) * p.dt >= 1.0
            nearest = min(D, key=lambda d: p.dist(d, c, k0)) if D else None
            for d in D:
                if p.dist(d, c, k0) > 8: continue
                grp = p.players[d].get('group'); near = 'nearest' if d == nearest else 'other'
                (x, y) = p.pos(d, k0)
                b = math.degrees(math.acos(max(-1, min(1, ((x - cx) * cvx + (y - cy) * cvy) / (math.hypot(x - cx, y - cy) * cs))))) if cs > 1 and math.hypot(x - cx, y - cy) > 1e-6 else None
                geo = 'still' if b is None else 'ahead' if b < 60 else 'level' if b <= 120 else 'trailing'
                def clos(k):
                    if p.pos(d, k)[0] is None: return None, None
                    px, py = p.pos(d, k); vx, vy = p.velocity(d, k); L = math.hypot(cx - px, cy - py) or 1
                    return (vx * (cx - px) + vy * (cy - py)) / L, math.hypot(vx, vy)
                last = max(kt, k0 - round(0.2 / p.dt)); mid = (kt + k0) // 2
                R[(open_, geo)].append((clos(kt), clos(mid), clos(last), (k0 - kt) * p.dt)); rx, ry = p.pos(c, kt) if p.pos(c, kt)[0] is not None else (cx, cy)
                px, py = p.pos(d, kt); vx, vy = p.velocity(d, kt); Lr = math.hypot(rx - px, ry - py) or 1
                rcv = (vx * (rx - px) + vy * (ry - py)) / Lr; dx_, dy_ = p.velocity(c, kt); rel = math.hypot(vx - dx_, vy - dy_)
                P[(geo, grp, near)].append((clos(kt), clos(last), rcv, Lr, rel))
    print(f'== {name}: defenders within 8 yd of the catch; closing on the catch point / speed (yd/s) at throw, mid-flight, last 0.2 s')
    for open_ in (False, True):
        for geo in ('ahead', 'level', 'trailing'):
            X = R[(open_, geo)]
            if len(X) < 8: continue
            print(f"  {'open ' if open_ else 'other'} {geo:8} n {len(X):5}: flight {q([x[3] for x in X], '{:.2f}')} s | closing {q([x[0][0] for x in X])} / {q([x[1][0] for x in X])} / {q([x[2][0] for x in X])} | speed {q([x[0][1] for x in X])} / {q([x[1][1] for x in X])} / {q([x[2][1] for x in X])} | closing >2 at end {100*sum(1 for x in X if (x[2][0] or 0) > 2)/len(X):.0f}%")
    print(f'  {name} by position and nearest-to-catcher: closing at the throw / last 0.2 s, share closing > 1 yd/s at the throw')
    for geo in ('ahead', 'level', 'trailing'):
        for grp in ('DL', 'LB', 'DB'):
            for near in ('nearest', 'other'):
                X = P[(geo, grp, near)]
                if len(X) < 15: continue
                print(f"    {geo:8} {grp} {near:7} n {len(X):4}: {q([x[0][0] for x in X])} / {q([x[1][0] for x in X])} | >1 at throw {100*sum(1 for x in X if (x[0][0] or 0) > 1)/len(X):.0f}% | at throw: closing on the receiver {q([x[2] for x in X])}, gap to him {q([x[3] for x in X])}, speed relative to him {q([x[4] for x in X])}")
