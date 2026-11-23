"""Coverage-to-pursuit hand-off (2026-11-23), positions only, the same on NFL and sim dumps that carry frames from the
throw (pursuit-dump.mts / pursuit-dump-nfl.py with throwT and dpos).
For each defender within RANGE yd of the catch point at the throw:
 - break on the ball: the first time after the throw his travel (velocity from centred 0.2 s position differences) is at
   least MOVE yd/s and within ANG deg of the bearing to the catch point, held SUSTAIN frames; time from the throw, and
   whether that happens before the catch;
 - break on the carrier: the first time from the catch his travel is within ANG deg of the bearing to the carrier (or to
   the carrier's constant-velocity intercept), at least MOVE yd/s, held SUSTAIN frames; time from the catch.
Split by seat (CB / S / LB / DL) and for the first defender of plays where he is beaten or missed (pursuit-an.py).
Usage: python3 -I pursuit-handoff.py DUMP.json"""
import json, math, sys, collections, importlib.util, os
RANGE, MOVE, ANG, SUSTAIN = 15.0, 2.0, 45.0, 3
spec = importlib.util.spec_from_file_location('pa', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pursuit-an.py'))
pa = importlib.util.module_from_spec(spec); spec.loader.exec_module(pa)
SEAT = {'CB': 'CB', 'NB': 'CB', 'S': 'S', 'SS': 'S', 'FS': 'S', 'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL'}
def q(v, p):
    v = sorted(x for x in v if x is not None); return v[min(len(v) - 1, int(p * len(v)))] if v else float('nan')
def pct(n, d): return f'{100 * n / d:4.1f}%' if d else '  -  '
def vel(tr, i):
    a, b = max(0, i - 1), min(len(tr) - 1, i + 1); dt = tr[b][0] - tr[a][0]
    return ((tr[b][1] - tr[a][1]) / dt, (tr[b][2] - tr[a][2]) / dt) if dt > 0 else (0.0, 0.0)
def angd(v, b):
    return abs(math.degrees(math.atan2(v[0] * b[1] - v[1] * b[0], v[0] * b[0] + v[1] * b[1])))
rows = json.load(open(sys.argv[1]))
res = []
for r in rows:
    if r.get('throwT') is None: continue
    a = pa.analyse(r)
    if not isinstance(a, dict): continue
    car = {round(x[0], 1): x for x in r['car']}; c0 = car.get(0.0)
    if not c0: continue
    for k, tr in r['defs'].items():
        tr = sorted(tr, key=lambda x: x[0]); ti = {round(x[0], 1): i for i, x in enumerate(tr)}
        t0 = round(r['throwT'], 1)
        i0 = min((i for i, x in enumerate(tr) if x[0] >= t0 - 0.05), default=None)
        if i0 is None or math.hypot(tr[i0][1] - c0[1], tr[i0][2] - c0[2]) > RANGE: continue
        # break on the ball (toward the catch point), from the throw
        run, tb = 0, None
        for i in range(i0, len(tr)):
            v = vel(tr, i); s = math.hypot(*v); b = (c0[1] - tr[i][1], c0[2] - tr[i][2])
            ok = s >= MOVE and math.hypot(*b) > 0.5 and angd(v, b) <= ANG
            run = run + 1 if ok else 0
            if run >= SUSTAIN: tb = round(tr[i - SUSTAIN + 1][0] - tr[i0][0], 1); break
        # break on the carrier, from the catch
        run, tcr = 0, None
        for i in range(ti.get(0.0, len(tr)), len(tr)):
            t = round(tr[i][0], 1)
            if t not in car: break
            c = car[t]; v = vel(tr, i); s = math.hypot(*v); b = (c[1] - tr[i][1], c[2] - tr[i][2])
            if math.hypot(*b) <= 1.0: tcr = tcr if tcr is not None else round(t, 1); break
            ic = pa.cv_intercept(tr[i][1], tr[i][2], max(s, 1), c[1], c[2], c[3], c[4])
            ok = s >= MOVE and (angd(v, b) <= ANG or (ic is not None and angd(v, ic[0]) <= ANG))
            run = run + 1 if ok else 0
            if run >= SUSTAIN: tcr = round(tr[i - SUSTAIN + 1][0], 1); break
        seat = SEAT.get((r.get('dpos') or {}).get(k) or '', (r.get('dpos') or {}).get(k) or '?')
        res.append(dict(seat=seat, throw_to_catch=-r['throwT'], ball=tb, before_catch=tb is not None and tb <= -r['throwT'] + 1e-9, carrier=tcr,
                        d1fail=(k == a['d1'] and a['cls'] is not None), d1=(k == a['d1']), outside=a['outside']))
print(f"defenders within {RANGE:.0f} yd of the catch point at the throw: {len(res)} (plays {len(set(id(r) for r in rows))})")
for lab, keep in (('all', lambda x: True), ('outside catches', lambda x: x['outside']), ('first defender (nearest at the catch)', lambda x: x['d1']),
                  ('first defender, beaten or missed', lambda x: x['d1fail'])):
    X = [x for x in res if keep(x)]
    if not X: continue
    print(f"\n{lab} (n {len(X)}): throw to catch p50 {q([x['throw_to_catch'] for x in X], .5):.1f} s")
    for seat in ['all', 'CB', 'S', 'LB', 'DL']:
        Y = X if seat == 'all' else [x for x in X if x['seat'] == seat]
        if len(Y) < 5: continue
        B = [x['ball'] for x in Y if x['ball'] is not None]; C = [x['carrier'] for x in Y if x['carrier'] is not None]
        print(f"  {seat:<4} n {len(Y):>5}: breaks on the ball before the catch {pct(sum(x['before_catch'] for x in Y), len(Y))}, time from the throw p50 {q(B, .5):.1f} s (p75 {q(B, .75):.1f})"
              f" | on the carrier by +1.0 s {pct(sum(1 for x in Y if x['carrier'] is not None and x['carrier'] <= 1.0), len(Y))}, time from the catch p50 {q(C, .5):.1f} s (p75 {q(C, .75):.1f}); never {pct(sum(x['carrier'] is None for x in Y), len(Y))}")
