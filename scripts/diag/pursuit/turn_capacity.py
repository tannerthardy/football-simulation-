"""How hard DBs and WRs turn and speed up: normal (turning) and tangential
acceleration from velocities 0.4 s apart, by speed band, on pass plays from
the snap to the end. Upper percentiles show the capacity actually used."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
BANDS = ((2, 4), (4, 6), (6, 8))
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); an = {b: [] for b in BANDS}; at = {b: [] for b in BANDS}; plays = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] not in ('pass', 'air'): continue
        plays += 1
        if plays > 1500: break
        p = Play(raw); end = p.k(min(p.end, raw['events'].get('pass_arrived', p.end) + 1.0))
        for i in p.who('D', 'DB') + p.who('O', 'WR'):
            for k in range(4, end - 4, 2):
                v0, v1, v = p.velocity(i, k - 2), p.velocity(i, k + 2), p.velocity(i, k)
                s = math.hypot(*v)
                b = next((b for b in BANDS if b[0] <= s < b[1]), None)
                if b is None: continue
                ax, ay = (v1[0] - v0[0]) / 0.4, (v1[1] - v0[1]) / 0.4
                ux, uy = v[0] / s, v[1] / s
                at[b].append(ax * ux + ay * uy); an[b].append(abs(-ax * uy + ay * ux))
    print(f"{label:7} " + '  '.join(f"{b[0]}-{b[1]} yd/s: turn p75 {q(an[b],.75):.1f} p95 {q(an[b],.95):.1f} p99 {q(an[b],.99):.1f}, speed-up p95 {q(at[b],.95):.1f}" for b in BANDS))
