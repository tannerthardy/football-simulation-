"""Nearest defender (within 3 yd) to the target at the throw: is he running
with the receiver? Heading difference to the receiver, and the turn needed to
head straight to where the target is when the ball arrives."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def ang(a, b):
    d = math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]); return abs(math.degrees(d))
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); hd = []; turn = []; ds = []; rs = []; behind = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] not in ('pass', 'air') or t is None or 'pass_forward' not in ev or 'pass_arrived' not in ev: continue
        p = Play(raw); kt, ka = p.k(ev['pass_forward']), p.k(ev['pass_arrived'])
        if ka - kt < 6: continue
        d0, d = min((p.dist(d, t, kt), d) for d in p.who('D'))
        if not math.isfinite(d0) or d0 >= 3: continue
        dv, rv = p.velocity(d, kt), p.velocity(t, kt)
        if math.hypot(*dv) < 1 or math.hypot(*rv) < 1: continue
        hd.append(ang(dv, rv)); ds.append(math.hypot(*dv)); rs.append(math.hypot(*rv))
        dp, cp = p.pos(d, kt), p.pos(t, ka)
        turn.append(ang(dv, (cp[0] - dp[0], cp[1] - dp[1])))
        tp = p.pos(t, kt); ru = (rv[0] / rs[-1], rv[1] / rs[-1])
        behind.append(1.0 if (dp[0] - tp[0]) * ru[0] + (dp[1] - tp[1]) * ru[1] < 0 else 0.0)
    print(f"{label:7} n={len(hd)} D-R heading diff p50 {q(hd,.5):.0f} p75 {q(hd,.75):.0f} deg | turn to catch point p50 {q(turn,.5):.0f} p75 {q(turn,.75):.0f} | D speed {q(ds,.5):.1f} R speed {q(rs,.5):.1f} | D trailing {sum(behind)/len(behind):.2f}")
