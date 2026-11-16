"""PURSUIT_SPOT per tick on the 707 pursuers (pursuit-trace.mts with the local commitSpot tag).
usage: python3 -I scripts/diag/yac/spot-report.py out/diag/yac/ps*.json"""
import json, math, sys
from collections import Counter
R = [r for p in sys.argv[1:] for r in json.load(open(p))]
mean = lambda v: sum(v) / len(v) if v else float('nan')
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
reasons = Counter(); held_rows = []; rel_rows = []; n = 0
for r in R:
    rows = [x for x in r['rows'] if r['t0'] - 1e-6 <= x['t'] <= r['t0'] + 0.5 and 2.5 <= x['dist'] < 6 and not x['bond'] and not x['contact'] and x.get('steer')]
    for a, b in zip(rows, rows[1:]):
        dt = b['t'] - a['t']
        if dt <= 0: continue
        rs = (b['spot'] or {}).get('r', '-'); reasons[rs] += 1; n += 1
        ang = lambda x: math.atan2(x['steer']['y'] - x['pos']['y'], x['steer']['x'] - x['pos']['x'])
        rate = abs(math.degrees(wrap(ang(b) - ang(a)))) / dt
        chd = abs(math.degrees(wrap(b['chd'] - a['chd']))) / dt
        hs = (a['spot'] or {}).get('held'), (b['spot'] or {}).get('held')
        heldMove = math.hypot(hs[1]['x'] - hs[0]['x'], hs[1]['y'] - hs[0]['y']) / dt if hs[0] and hs[1] else float('nan')
        steerMove = math.hypot(b['steer']['x'] - a['steer']['x'], b['steer']['y'] - a['steer']['y']) / dt
        row = dict(rate=rate, chd=chd, heldMove=heldMove, steerMove=steerMove, csp=a['csp'], dcsp=(b['csp'] - a['csp']) / dt)
        (held_rows if rs == 'held' else rel_rows).append(row)
print(f"pursuer ticks {n}: commitSpot path " + ', '.join(f"{k} {v / n:.0%}" for k, v in reasons.most_common()))
for nm, g in (('held', held_rows), ('released/new', rel_rows)):
    print(f"  {nm:13s} n {len(g):5d}: steering-point bearing rate p50 {q([x['rate'] for x in g]):.0f} deg/s (p75 {q([x['rate'] for x in g], .75):.0f}); steering point moves {q([x['steerMove'] for x in g]):.2f} yd/s p50"
          f" while the held spot moves {q([x['heldMove'] for x in g if x['heldMove'] == x['heldMove']]):.2f}; carrier heading rate p50 {q([x['chd'] for x in g]):.0f} deg/s; carrier speed {mean([x['csp'] for x in g]):.2f} gaining {mean([x['dcsp'] for x in g]):+.2f} yd/s/s")
