"""Turn at speed (2026-11-23): how fast a defender crossing the carrier's path at speed redirects toward the carrier's
travel. Positions only (velocity from centred 0.2 s position differences), the same on NFL and sim dumps
(pursuit-dump.mts / pursuit-dump-nfl.py rows).
Episode: a defender after the catch, first frame where his speed >= FAST yd/s and his travel crosses the carrier's
(|cos(defender travel, carrier travel)| <= 0.5, carrier moving > 2 yd/s), not within 2 yd of the carrier.
Measured from the episode start: his travel's turn toward the carrier's travel direction after 0.5 and 1.0 s (deg,
+ = toward), his speed then, and the time until his travel is within 45 deg of the carrier's (censored at 1.5 s).
Usage: python3 -I pursuit-turn.py DUMP.json [FAST]"""
import json, math, sys
FAST = float(sys.argv[2]) if len(sys.argv) > 2 else 7.0
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def vel(tr, i):
    a, b = max(0, i - 1), min(len(tr) - 1, i + 1)
    dt = tr[b][0] - tr[a][0]
    return ((tr[b][1] - tr[a][1]) / dt, (tr[b][2] - tr[a][2]) / dt) if dt > 0 else (0.0, 0.0)
rows = json.load(open(sys.argv[1]))
out = []
for r in rows:
    car = r['car']; ct = {round(x[0], 1): i for i, x in enumerate(car)}
    for tr in r['defs'].values():
        tr = [x for x in tr]
        for i in range(1, len(tr) - 1):
            t = round(tr[i][0], 1)
            if t not in ct: break
            ci = ct[t]; cv = vel(car, ci); cs = math.hypot(*cv); dv = vel(tr, i); ds = math.hypot(*dv)
            if ds < FAST or cs < 2: continue
            if math.hypot(tr[i][1] - car[ci][1], tr[i][2] - car[ci][2]) < 2: continue
            c = (dv[0] * cv[0] + dv[1] * cv[1]) / (ds * cs)
            if abs(c) > 0.5: continue
            h0 = math.atan2(dv[1], dv[0]); hc = math.atan2(cv[1], cv[0])
            def toward(j):
                v = vel(tr, j); h = math.atan2(v[1], v[0])
                d0 = math.atan2(math.sin(hc - h0), math.cos(hc - h0)); d1 = math.atan2(math.sin(h - h0), math.cos(h - h0))
                return math.degrees(d1) * (1 if d0 >= 0 else -1), math.hypot(*v), abs(math.degrees(math.atan2(math.sin(hc - h), math.cos(hc - h))))
            res = {}
            for lag in (5, 10):
                if i + lag < len(tr) - 1: res[lag] = toward(i + lag)
            t45 = None
            for j in range(i + 1, min(len(tr) - 1, i + 16)):
                if toward(j)[2] <= 45: t45 = round(tr[j][0] - tr[i][0], 1); break
            out.append(dict(r05=res.get(5), r10=res.get(10), t45=t45, s0=ds))
            break  # one episode per defender per play
n = len(out)
print(f'episodes (defender crossing at >= {FAST} yd/s): {n}')
for lag, k in ((0.5, 'r05'), (1.0, 'r10')):
    X = [o[k] for o in out if o[k]]
    if X: print(f'  after {lag} s: turned toward the carrier p25/p50/p75 {q([x[0] for x in X], .25):.0f} / {q([x[0] for x in X], .5):.0f} / {q([x[0] for x in X], .75):.0f} deg; speed p50 {q([x[1] for x in X], .5):.1f} yd/s (n {len(X)})')
T = [o['t45'] for o in out]
done = sorted(t for t in T if t is not None)
print(f'  within 45 deg of the carrier\'s travel by 1.5 s: {100 * len(done) / max(1, n):.0f}%; time p50 among those {q(done, .5):.1f} s')
