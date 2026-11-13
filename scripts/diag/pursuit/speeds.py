"""After the catch: carrier speed and pursuing defenders' speed (relative to
their own top speed on the play), by distance at the catch."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); carrier = []; rel = {'0-5': [], '5-12': [], '12+': []}; spd = {'0-5': [], '5-12': [], '12+': []}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev: continue
        p = Play(raw); kc = p.k(ev['catch'])
        if not p.live(ev['catch'] + 1.5): continue
        k1, k15 = p.k(ev['catch'] + 1.0), p.k(ev['catch'] + 1.5)
        carrier.append(p.speed(t, k1))
        for d in p.who('D'):
            dist = p.dist(d, t, kc)
            b = '0-5' if dist < 5 else '5-12' if dist < 12 else '12+'
            top = max(p.speed(d, k) for k in range(0, p.k(p.end) + 1))
            s = sum(p.speed(d, k) for k in range(kc + 2, k15 + 1)) / max(1, k15 - kc - 1)
            if top > 3: rel[b].append(s / top); spd[b].append(s)
    print(f'{label:9} carrier speed 1 s after catch p50 {q(carrier,.5):.2f} p75 {q(carrier,.75):.2f} | defenders over the 1.5 s after the catch, by distance at catch:', '  '.join(f'{b}: speed {q(spd[b],.5):.2f}, share of own top {q(rel[b],.5):.2f}' for b in rel))
