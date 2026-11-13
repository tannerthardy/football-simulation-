"""The last 1.5 yards: defenders whose closest approach to a receiver after the
catch is within 3 yd. At closest approach: their speed, the carrier's speed,
whether they came from in front / beside / behind, and closing speed 0.3 s before."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = {'reach': [], 'near_miss': []}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev: continue
        p = Play(raw); kc = p.k(ev['catch']); ke = p.k(p.end)
        if ke - kc < 4: continue
        for d in p.who('D'):
            ds = [(p.dist(d, t, k), k) for k in range(kc + 1, ke + 1)]
            if not ds: continue
            dmin, kmin = min(ds)
            if dmin > 3: continue
            cv, dv = p.velocity(t, kmin), p.velocity(d, kmin)
            cs, dsp = math.hypot(*cv), math.hypot(*dv)
            # where the defender is relative to the carrier's motion: + in front, - behind
            rel = (p.pos(d, kmin)[0] - p.pos(t, kmin)[0], p.pos(d, kmin)[1] - p.pos(t, kmin)[1])
            front = (rel[0] * cv[0] + rel[1] * cv[1]) / max(1e-6, cs * math.hypot(*rel)) if cs > 1 else 0
            kb = max(kc, kmin - 3)
            closing = (p.dist(d, t, kb) - dmin) / max(1e-6, (kmin - kb) * p.dt) if kmin > kb else 0
            rows['reach' if dmin <= 1.5 else 'near_miss'].append((dsp, cs, front, closing))
    print(f'== {label}')
    for k, v in rows.items():
        if not v: continue
        col = lambda i: [x[i] for x in v]
        print(f"  {k:9} n={len(v):5}  defender speed p50 {q(col(0),.5):.2f} | carrier speed p50 {q(col(1),.5):.2f} | from front {sum(x[2]>0.5 for x in v)/len(v):.2f} side {sum(-0.5<=x[2]<=0.5 for x in v)/len(v):.2f} behind {sum(x[2]<-0.5 for x in v)/len(v):.2f} | closing speed last 0.3 s p50 {q(col(3),.5):.2f}")
