"""usage: python3 -I scripts/diag/pass-operators/catcher.py <plays.jsonl.gz> [...]

The catcher after a short catch (same code, NFL and sim). Population: completions caught 3-10 yd downfield of the
line (his x at arrival minus the snap's ball x); arrival = pass_arrived (the sim's 'secure'). Banded by his speed at
arrival: settled (< 2 yd/s, Defense's settlestate.py definition), 2-4, 4-6, 6+. Per catch, from arrival:
 - speed at +0.2 / +0.5 / +1.0 s; for settled catches, time to reach 4 yd/s;
 - time to turn upfield: first frame his velocity is within 45 deg of downfield at >= 2 yd/s;
 - the nearest defender at arrival: distance, whether he is behind the catcher (farther downfield, out of the
   catcher's view while he faces the ball), his lateral velocity; the catcher's lateral move over the next 0.5 s
   against that momentum (away from where the defender is heading = 'against momentum') when it is > 1 yd/s;
 - YAC (the carrier's last x minus x at arrival)."""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        r = json.loads(line); r = r.get('common', r); ev = r['events']
        if r['kind'] != 'pass' or 'catch' not in ev or r.get('target') is None: continue
        t = r['target']; p = Play(r)
        ka = p.k(ev.get('pass_arrived', ev['catch'])); ke = min(p.k(ev['end']), p.frames - 1)
        if ka + p.k(1.0) >= p.frames or p.pos(t, ka)[0] is None: continue
        los = (r.get('bxy') or [[None]])[0][0] if r.get('bxy') else None
        x0 = los if los is not None else p.pos(t, 0)[0]
        depth = p.pos(t, ka)[0] - x0
        if not (3 <= depth <= 10): continue
        D = [d for d in p.who('D') if p.pos(d, ka)[0] is not None]
        if not D: continue
        s0 = p.speed(t, ka)
        band = 'settled <2' if s0 < 2 else '2-4' if s0 < 4 else '4-6' if s0 < 6 else '6+'
        sp = [p.speed(t, ka + p.k(x)) for x in (0.2, 0.5, 1.0)]
        t4 = next(((k - ka) * p.dt for k in range(ka, min(p.frames, ka + p.k(2.0))) if p.speed(t, k) >= 4), None)
        tup = next(((k - ka) * p.dt for k in range(ka, min(p.frames, ka + p.k(2.0)))
                    if p.speed(t, k) >= 2 and p.velocity(t, k)[0] / max(1e-6, p.speed(t, k)) >= math.cos(math.radians(45))), None)
        d = min(D, key=lambda x: p.dist(t, x, ka))
        (cx, cy), (dx, dy) = p.pos(t, ka), p.pos(d, ka)
        dvy = p.velocity(d, ka)[1]
        lat = p.pos(t, ka + p.k(0.5))[1] - cy
        against = None if abs(dvy) <= 1 or abs(lat) < 0.2 else (lat * dvy < 0)
        xe = next((p.pos(t, k)[0] for k in range(ke, ka - 1, -1) if p.pos(t, k)[0] is not None), None)
        def near(k):
            ds = [p.dist(t, x, k) for x in D if k < p.frames and p.pos(x, k)[0] is not None]
            return min(ds) if ds else float('nan')
        dn = [near(ka + p.k(x)) for x in (0.5, 1.0)]
        reached = any(near(k) <= 1.0 for k in range(ka, min(p.frames, ka + p.k(1.0)) + 1))
        rows.append(dict(dn=dn, reached=reached, band=band, sp=sp, t4=t4, tup=tup, dd=p.dist(t, d, ka), behind=dx > cx, against=against,
                         yac=(xe - cx) if xe is not None else None))
    print(f'== {os.path.basename(path)}: catches 3-10 yd, n {len(rows)}')
    for b in ('settled <2', '2-4', '4-6', '6+'):
        v = [o for o in rows if o['band'] == b]
        if not v: continue
        n = len(v); a = [o for o in v if o['against'] is not None]; bh = [o for o in a if o['behind']]; fr = [o for o in a if not o['behind']]
        print(f"   {b:10} n {n:4} ({100*n/len(rows):2.0f}%) | speed +0.2/+0.5/+1.0 s {q([o['sp'][0] for o in v]):.1f} / {q([o['sp'][1] for o in v]):.1f} / {q([o['sp'][2] for o in v]):.1f}"
              + (f" | to 4 yd/s p50 {q([o['t4'] for o in v if o['t4'] is not None]):.2f} s (never in 2 s {100*sum(o['t4'] is None for o in v)/n:.0f}%)" if b == 'settled <2' else '')
              + f" | turned upfield p50 {q([o['tup'] for o in v if o['tup'] is not None]):.2f} s (not in 2 s {100*sum(o['tup'] is None for o in v)/n:.0f}%)"
              + f" | nearest defender {q([o['dd'] for o in v]):.1f} yd, behind him {100*sum(o['behind'] for o in v)/n:.0f}%"
              + f" | goes against the defender's momentum {100*sum(o['against'] for o in a)/max(1,len(a)):.0f}% (n {len(a)}; defender behind {100*sum(o['against'] for o in bh)/max(1,len(bh)):.0f}% n {len(bh)}, in front {100*sum(o['against'] for o in fr)/max(1,len(fr)):.0f}% n {len(fr)})"
              + f" | nearest at +0.5/+1.0 s {q([o['dn'][0] for o in v if o['dn'][0] == o['dn'][0]]):.1f} / {q([o['dn'][1] for o in v if o['dn'][1] == o['dn'][1]]):.1f}, someone within 1 yd by +1.0 s {100*sum(o['reached'] for o in v)/n:.0f}%"
              + f" | YAC mean {sum(o['yac'] for o in v if o['yac'] is not None)/n:.2f} p50 {q([o['yac'] for o in v if o['yac'] is not None]):.1f}")
