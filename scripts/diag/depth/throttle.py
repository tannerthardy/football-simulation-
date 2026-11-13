"""COV-1 step 2: when the defender over a receiver stops running, one operator.
Zone throws where the target is under D0 (nearest defender at the throw) within 6 yd. Within the 2 s
before the throw, the target's downfield speed peaks at >= 4 yd/s and then throttles below 2 yd/s.
Receiver onset = first frame after his peak below 85% of it; D0 onset = first frame after D0's own
peak (from 0.5 s before the receiver's) below 85% of it. Reports the onset lag (D0 - receiver), D0's
speed and cushion over the target at receiver onset and at the throw, and the share of cases where D0
began slowing first.
usage: throttle.py FILE..."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    lag, first, v_on, c_on, v_t, c_t, rpeak, dpeak = [], 0, [], [], [], [], [], []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or raw.get('target') is None: continue
        ev = raw.get('events') or {}; t0 = ev.get('pass_forward')
        if t0 is None or coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
        p = Play(raw); r = raw['target']; k0 = p.k(t0)
        if p.pos(r, k0)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
        d = min(ds, key=lambda d: p.dist(d, r, k0))
        if p.dist(d, r, k0) >= 6 or p.pos(d, k0)[0] <= p.pos(r, k0)[0]: continue
        ks = list(range(max(1, k0 - 20), k0 + 1))
        rv = {k: p.velocity(r, k)[0] for k in ks}
        kp = max(ks, key=lambda k: rv[k])
        if rv[kp] < 4 or min(rv[k] for k in ks if k >= kp) >= 2: continue
        kr = next((k for k in ks if k > kp and rv[k] < .85 * rv[kp]), None)
        if kr is None: continue
        n += 1
        dks = [k for k in ks if k >= kr - 5]
        dv = {k: p.velocity(d, k)[0] for k in dks}
        kd_peak = max(dks, key=lambda k: dv[k])
        kd = next((k for k in dks if k > kd_peak and dv[k] < .85 * dv[kd_peak]), None)
        rpeak.append(rv[kp]); dpeak.append(dv[kd_peak])
        v_on.append(p.velocity(d, kr)[0]); c_on.append(p.pos(d, kr)[0] - p.pos(r, kr)[0])
        v_t.append(p.velocity(d, k0)[0]); c_t.append(p.pos(d, k0)[0] - p.pos(r, k0)[0])
        if kd is not None:
            lag.append((kd - kr) * p.dt); first += kd < kr
    print(f"{path.split('/')[-1][:30]}: throttling targets under D0 (sep < 6): {n}")
    print(f"   peaks: receiver {q(rpeak)} D0 {q(dpeak)} yd/s | onset lag D0 - receiver p25/p50/p75 {q(lag, .25)}/{q(lag)}/{q(lag, .75)} s (D0 first {first / max(len(lag), 1):.2f})")
    print(f"   at receiver onset: D0 downfield {q(v_on)} yd/s, cushion {q(c_on)} yd | at the throw: {q(v_t)} yd/s, cushion {q(c_t)} yd")
