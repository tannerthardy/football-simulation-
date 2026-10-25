"""Second tackler at a run's first contact, one operator for NFL tracking and
sim common plays (runbreak.py's admission and break definition: first
contact, broken = 4+ yd/s 0.5 s later and 5+ more yards; first tackler =
nearest defender). Whether another defender is within 1.5 yd of the carrier
at any frame in the 0.5 s after contact; the break rate with and without
that help, and the share of contacts that have it.
usage: secondtackler.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
for path in sys.argv[1:]:
    g = {True: [0, 0], False: [0, 0]}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        t = (raw.get('events') or {}).get('first_contact')
        p = Play(raw); c = raw['carrier']
        if t is None or not p.live(t) or not p.live(t + .5): continue
        k = p.k(t)
        if p.pos(c, k)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        first = min(ds, key=lambda d: p.dist(d, c, k))
        x = p.pos(c, k)[0]
        broke = p.speed(c, p.k(t + .5)) >= 4 and raw['yards'] - x >= 5
        help = any(p.pos(d, kk)[0] is not None and p.pos(c, kk)[0] is not None and p.dist(d, c, kk) <= 1.5
                   for d in ds if d != first for kk in range(k, p.k(t + .5) + 1))
        g[help][0] += 1; g[help][1] += broke
    n = g[True][0] + g[False][0]
    print(f"{path.split('/')[-1][:26]}  contacts {n} | second defender within 1.5 yd in 0.5 s: {100 * g[True][0] / max(1, n):.0f}% | broke with help {100 * g[True][1] / max(1, g[True][0]):.1f}%, alone {100 * g[False][1] / max(1, g[False][0]):.1f}% | breaks that were alone {100 * g[False][1] / max(1, g[True][1] + g[False][1]):.0f}%")
