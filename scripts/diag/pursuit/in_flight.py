"""Ball in the air: for defenders within 10 yd of the target at the throw, how
much they close on the target by arrival, how fast they move toward him, and
whether they had turned toward him within 0.4 s of the throw."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); close = {'0-3': [], '3-6': [], '6-10': []}; speed_at_arrival = {'0-3': [], '3-6': [], '6-10': []}; reacted = {'0-3': [], '3-6': [], '6-10': []}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] not in ('pass', 'air') or t is None or 'pass_forward' not in ev or 'pass_arrived' not in ev: continue
        p = Play(raw); kt, ka = p.k(ev['pass_forward']), p.k(ev['pass_arrived'])
        if ka - kt < 6: continue
        k4 = min(ka, kt + 4)
        for d in p.who('D'):
            d0 = p.dist(d, t, kt)
            if not math.isfinite(d0) or d0 > 10: continue
            da = p.dist(d, t, ka)
            if not math.isfinite(da): continue
            b = '0-3' if d0 < 3 else '3-6' if d0 < 6 else '6-10'
            close[b].append(d0 - da)
            # speed component toward the target at arrival
            v = p.velocity(d, ka); dx = p.pos(t, ka)[0] - p.pos(d, ka)[0]; dy = p.pos(t, ka)[1] - p.pos(d, ka)[1]; L = math.hypot(dx, dy) or 1
            speed_at_arrival[b].append((v[0] * dx + v[1] * dy) / L)
            # reacted: closing rate over [throw+0.4, throw+0.8] > 1 yd/s
            k8 = min(ka, kt + 8)
            reacted[b].append(1.0 if (p.dist(d, t, k4) - p.dist(d, t, k8)) / max(1e-6, (k8 - k4) * p.dt) > 1.0 else 0.0)
    print(f'== {label}')
    for b in close:
        if close[b]: print(f"  defenders {b:5} yd from target at throw: n={len(close[b]):5} closed by arrival p50 {q(close[b],.5):+.2f} | speed toward target at arrival p50 {q(speed_at_arrival[b],.5):.2f} | closing >1 yd/s between 0.4-0.8 s after throw {sum(reacted[b])/len(reacted[b]):.2f}")
