"""How negative runs happen, one operator for NFL tracking and sim common
plays. For runs losing yardage: the first defender to come within R yd of the
carrier after the snap (the handoff for the sim's QB-to-back exchange is
inside that window), his group, the carrier's depth and lateral travel from
the ball then, the time, and the approach: behind (moving with the carrier,
cos > 0.5), head-on (cos < -0.5) or side. Also the carrier's lateral speed.
usage: negs.py FILE [--ytg60] [--concept iz|oz]"""
import gzip, json, math, sys, collections
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
R = 1.0
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
tot = 0; neg = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if want and raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') != {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE'}[want]: continue
    if want and raw.get('source') == 'sim' and not raw['id'].startswith(want + '/') and not (want == 'oz' and raw['id'].startswith('wz/')): continue
    tot += 1
    if raw['yards'] >= 0: continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    for k in range(end + 1):
        hit = [d for d in p.who('D') if p.dist(c, d, k) <= R]
        if not hit: continue
        d = min(hit, key=lambda d: p.dist(c, d, k))
        vc, vd = p.velocity(c, k), p.velocity(d, k)
        cos = (vc[0] * vd[0] + vc[1] * vd[1]) / ((math.hypot(*vc) or 1) * (math.hypot(*vd) or 1))
        neg.append({'g': p.players[d]['group'], 'x': p.pos(c, k)[0], 'lat': abs(p.pos(c, k)[1] - raw['ball_y']), 't': k * p.dt,
                    'app': 'behind' if cos > .5 else 'head-on' if cos < -.5 else 'side', 'vy': abs(vc[1]), 'v': math.hypot(*vc)})
        break
n = len(neg)
print(f"{path.split('/')[-1][:24]:24s} {want or ''} runs {tot}, negative {n} ({100*n/max(1,tot):.1f}%)")
if n:
    print(f"  first defender within {R} yd: " + ' '.join(f"{g} {100*v/n:.0f}%" for g, v in collections.Counter(r['g'] for r in neg).most_common()) + ' | approach ' + ' '.join(f"{a} {100*v/n:.0f}%" for a, v in collections.Counter(r['app'] for r in neg).most_common()))
    print(f"  at t p50 {q([r['t'] for r in neg])} s, carrier depth p50 {q([r['x'] for r in neg])}, lateral from ball p50 {q([r['lat'] for r in neg])} yd, carrier speed {q([r['v'] for r in neg])} (lateral {q([r['vy'] for r in neg])})")
