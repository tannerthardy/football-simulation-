"""Nearest defender to the target at the throw (within 3 yd): his distance to
the target through the flight, at fractions of the air time, and his speed."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
FR = (0, .25, .5, .75, 1.0)
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); dist = {f: [] for f in FR}; spd = {f: [] for f in FR}; tgt = {f: [] for f in FR}; air = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] not in ('pass', 'air') or t is None or 'pass_forward' not in ev or 'pass_arrived' not in ev: continue
        p = Play(raw); kt, ka = p.k(ev['pass_forward']), p.k(ev['pass_arrived'])
        if ka - kt < 6: continue
        ds = [(p.dist(d, t, kt), d) for d in p.who('D')]
        d0, d = min(ds)
        if not math.isfinite(d0) or d0 >= 3: continue
        air.append((ka - kt) * p.dt)
        for f in FR:
            k = kt + round(f * (ka - kt)); dd = p.dist(d, t, k)
            if not math.isfinite(dd): break
            dist[f].append(dd); spd[f].append(p.speed(d, k)); tgt[f].append(p.speed(t, k))
    print(f"{label:7} n={len(air)} air p50 {q(air,.5):.1f}s | " + '  '.join(f"{int(f*100):3}%: gap {q(dist[f],.5):.2f} D {q(spd[f],.5):.1f} R {q(tgt[f],.5):.1f}" for f in FR))
