"""Catch contacts: share broken (still >= 4 yd/s after 0.5 s and >= 5 more yards)
by tackle angle and carrier entry speed. Same definitions as metrics.py."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
from collections import defaultdict
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); cells = defaultdict(lambda: [0, 0])
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; c = raw.get('target')
        if raw['kind'] != 'pass' or c is None or 'catch' not in ev: continue
        fc = ev.get('first_contact')
        p = Play(raw)
        if fc is None or fc < ev['catch'] or not p.live(fc + 0.5): continue
        k = p.k(fc); tk = min(p.who('D'), key=lambda d: p.dist(d, c, k))
        cv, tv = p.velocity(c, k), p.velocity(tk, k)
        entry = math.hypot(*cv)
        if entry < 1 or math.hypot(*tv) < 1: ang = 'slow'
        else:
            cos = (cv[0]*tv[0]+cv[1]*tv[1]) / (math.hypot(*cv) * math.hypot(*tv))
            ang = 'headon' if cos < -0.5 else 'behind' if cos > 0.5 else 'side'
        sp = 'fast' if entry >= 5.5 else 'mid' if entry >= 3 else 'slow'
        broke = p.speed(c, p.k(fc + 0.5)) >= 4 and raw['yards'] - p.pos(c, k)[0] >= 5
        for key in (ang, f'{ang}/{sp}'):
            cells[key][0] += broke; cells[key][1] += 1
    print(f'== {label}: ' + '  '.join(f"{k} {v[0]/v[1]:.2f} (n={v[1]})" for k, v in sorted(cells.items()) if '/' not in k))
    print('   ' + '  '.join(f"{k} {v[0]/v[1]:.2f} (n={v[1]})" for k, v in sorted(cells.items()) if '/' in k and v[1] >= 15))
