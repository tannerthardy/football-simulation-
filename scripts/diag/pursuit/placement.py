"""How far the target had to leave his course at the throw to make the catch:
his position at arrival vs straight-line extrapolation from the throw, for
completed passes with 0.6-2.0 s of air time. Also by air time."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); dev = []; short = []; long_ = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev or 'pass_forward' not in ev: continue
        p = Play(raw); kt, kc = p.k(ev['pass_forward']), p.k(ev['catch'])
        T = (kc - kt) * p.dt
        if not 0.6 <= T <= 2.0: continue
        x0, v0, xc = p.pos(t, kt), p.velocity(t, kt), p.pos(t, kc)
        if x0[0] is None or xc[0] is None: continue
        d = math.hypot(xc[0] - x0[0] - v0[0] * T, xc[1] - x0[1] - v0[1] * T)
        dev.append(d); (short if T < 1.1 else long_).append(d)
    print(f"{label:7} n={len(dev)} course deviation p25 {q(dev,.25):.2f} p50 {q(dev,.5):.2f} p75 {q(dev,.75):.2f} | air<1.1s p50 {q(short,.5):.2f} | air>=1.1s p50 {q(long_,.5):.2f}")
