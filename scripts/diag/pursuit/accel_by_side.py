"""Speed gained 0.8 s after the catch when the nearest defender is within 4 yd,
split by where he is (ahead of / beside / behind the receiver's motion) and
whether he is closing. No contact inside the window."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
from collections import defaultdict
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); g = defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev: continue
        p = Play(raw); kc = p.k(ev['catch'])
        if not p.live(ev['catch'] + 0.8): continue
        fc = ev.get('first_contact')
        if fc is not None and ev['catch'] <= fc < ev['catch'] + 0.8: continue
        tp = p.pos(t, kc); tv = p.velocity(t, kc); ts = math.hypot(*tv)
        if ts < 1: continue
        best = None
        for d in p.who("D"):
            dp = p.pos(d, kc)
            if dp[0] is None: continue
            r = math.hypot(dp[0] - tp[0], dp[1] - tp[1])
            if best is None or r < best[0]: best = (r, d, dp)
        if best is None or best[0] >= 4: continue
        r, d, dp = best
        ux, uy = tv[0] / ts, tv[1] / ts
        ahead = ((dp[0] - tp[0]) * ux + (dp[1] - tp[1]) * uy) / r
        side = 'ahead' if ahead > 0.5 else 'behind' if ahead < -0.5 else 'beside'
        dv = p.velocity(d, kc); close = -((dp[0] - tp[0]) * (dv[0] - tv[0]) + (dp[1] - tp[1]) * (dv[1] - tv[1])) / r
        g[side].append(p.speed(t, p.k(ev['catch'] + 0.8)) - ts)
        g[side + ':close'].append(close)
    print(f'{label:9} ' + '  '.join(f"{s}: n={len(g[s])} gain {q(g[s],.5):+.2f} closing {q(g[s+':close'],.5):+.2f}" for s in ('ahead', 'beside', 'behind')))
