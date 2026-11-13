"""usage: python3 -I scripts/diag/pass-operators/trail_break.py <plays.jsonl.gz> [...]

When a trailing man defender breaks on the catch (same code, NFL and sim). Population: man coverage targets caught
or not, 3-12 yd downfield of his start at arrival, whose nearest defender at arrival is within 2.5 yd, behind him
along his run (< -0.3 yd), and in phase 0.6 s before arrival (heading within 45 deg of the receiver's, speed >= 3).
His break: the first frame from -1.0 s to +0.5 s of arrival where he closes on the receiver at >= 1.0 yd/s for two
frames running. Reported relative to arrival (pass_arrived; the sim's 'secure'), with the share with no break by
+0.5 s. Tracking has no hands: this is the observable end of the trailer's recognition."""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'pass_forward' not in ev or r.get('target') is None: continue
        if coverage_family((r.get('cell') or {}).get('coverage')) != 'man': continue
        t = r['target']; p = Play(r)
        ka = p.k(ev.get('pass_arrived', ev['end'])); k6 = ka - p.k(0.6); k0 = ka - p.k(1.0); k1 = ka + p.k(0.5)
        if k0 < 1 or k1 + 1 >= p.frames or p.pos(t, ka)[0] is None or p.pos(t, 0)[0] is None: continue
        if not (3 <= p.pos(t, ka)[0] - p.pos(t, 0)[0] <= 12): continue
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None and p.pos(d, k6)[0] is not None]
        if not D: continue
        d = min(D, key=lambda x: p.dist(t, x, ka))
        if p.dist(t, d, ka) > 2.5: continue
        vx, vy = p.velocity(t, ka); s = math.hypot(vx, vy) or 1
        if ((p.pos(d, ka)[0] - p.pos(t, ka)[0]) * vx + (p.pos(d, ka)[1] - p.pos(t, ka)[1]) * vy) / s > -0.3: continue
        rvx, rvy = p.velocity(t, k6); dvx, dvy = p.velocity(d, k6); rs, ds = math.hypot(rvx, rvy), math.hypot(dvx, dvy)
        if rs < 3 or ds < 3 or (rvx * dvx + rvy * dvy) / (rs * ds) < math.cos(math.radians(45)): continue
        close = [(p.dist(t, d, k - 1) - p.dist(t, d, k)) / p.dt for k in range(k0, k1 + 1)]
        br = next((i for i in range(len(close) - 1) if close[i] >= 1.0 and close[i + 1] >= 1.0), None)
        # His own drive: his velocity toward where his man is, rising by >= 1.5 yd/s over 0.3 s (so a receiver braking
        # into the catch does not count as the defender breaking).
        def toward(k):
            ux, uy = p.pos(t, k)[0] - p.pos(d, k)[0], p.pos(t, k)[1] - p.pos(d, k)[1]; L = math.hypot(ux, uy) or 1
            vx_, vy_ = p.velocity(d, k); return (vx_ * ux + vy_ * uy) / L
        k3 = p.k(0.3)
        own = next((k for k in range(k0, k1 - k3 + 1) if toward(k + k3) - toward(k) >= 1.5), None)
        rows.append(dict(brk=None if br is None else (k0 + br - ka) * p.dt, own=None if own is None else (own - ka) * p.dt, comp='catch' in ev))
    b = [o['brk'] for o in rows if o['brk'] is not None]
    print(f'== {os.path.basename(path)}: trailing in-phase man defenders n {len(rows)} | break before arrival {100*sum(x < 0 for x in b)/max(1,len(rows)):.0f}%, '
          f'onset p25/p50/p75 {q(b, .25):+.2f} / {q(b):+.2f} / {q(b, .75):+.2f} s from arrival | no break by +0.5 s {100*(len(rows)-len(b))/max(1,len(rows)):.0f}%')
    o = [x['own'] for x in rows if x['own'] is not None]
    print(f'     his own drive toward his man (+1.5 yd/s in 0.3 s): onset p25/p50/p75 {q(o, .25):+.2f} / {q(o):+.2f} / {q(o, .75):+.2f} s | before arrival {100*sum(x < 0 for x in o)/max(1,len(rows)):.0f}% | none by +0.5 s {100*(len(rows)-len(o))/max(1,len(rows)):.0f}%')
