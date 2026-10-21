"""The deep defender after the run declares, one operator for NFL tracking and sim
common plays. For runs whose carrier crosses the line: the defender deepest at the
crossing (any group, 8+ yd), his depth and downhill speed then; his speed and
gap to the runner 0.5/1.0/1.5 s later; whether and where (runner's x past the
line) he first gets within MEET yd of the runner; and the run's gain.
usage: deepfit.py FILE [--ytg60] [--sim]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
MEET = 1.5
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
rows = []
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']
    end = p.k(p.end)
    kc = next((k for k in range(p.k(raw.get('events', {}).get('handoff', 0) or 0), end + 1)
               if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
    if kc is None: continue
    D = [i for i in p.who('D') if p.pos(i, kc)[0] is not None]
    deep = max(D, key=lambda i: p.pos(i, kc)[0])
    d0 = p.pos(deep, kc)[0]
    if d0 < 8: continue
    def downhill(k):
        a, b = max(0, k - 2), min(p.frames - 1, k + 2)
        return -(p.pos(deep, b)[0] - p.pos(deep, a)[0]) / ((b - a) * p.dt) if b > a else 0
    r = {'depth': d0, 'down': downhill(kc), 'gain': raw['yards']}
    for s in (.5, 1.0, 1.5):
        k = kc + int(round(s / p.dt))
        if k <= end:
            r[f'v{s}'] = p.speed(deep, k); r[f'gap{s}'] = p.dist(deep, c, k)
    meet = next((k for k in range(kc, end + 1) if p.dist(deep, c, k) <= MEET), None)
    r['meet'] = None if meet is None else p.pos(c, meet)[0]
    r['meet_t'] = None if meet is None else (meet - kc) * p.dt
    rows.append(r)
print(f"{path.split('/')[-1]:24s} runs crossing with a deep man (8+ yd at the crossing): {len(rows)}")
print(f"  at crossing: depth p25/50/75 {q([r['depth'] for r in rows],.25)}/{q([r['depth'] for r in rows])}/{q([r['depth'] for r in rows],.75)}"
      f" | downhill p25/50/75 {q([r['down'] for r in rows],.25)}/{q([r['down'] for r in rows])}/{q([r['down'] for r in rows],.75)} yd/s")
for s in (.5, 1.0, 1.5):
    v = [r[f'v{s}'] for r in rows if f'v{s}' in r]; g = [r[f'gap{s}'] for r in rows if f'gap{s}' in r]
    print(f"  +{s}s: speed p50 {q(v)} (p75 {q(v,.75)}) | gap to runner p50 {q(g)} (n {len(v)})")
for lo, hi, name in ((-99, 4, '<4'), (4, 10, '4-9'), (10, 20, '10-19'), (20, 999, '20+')):
    k = [r for r in rows if lo <= r['gain'] < hi]
    m = [r for r in k if r['meet'] is not None]
    print(f"  gain {name:5s} n {len(k):4d} share {100*len(k)/max(1,len(rows)):5.1f}% | deep man met runner {100*len(m)/max(1,len(k)):5.1f}%"
          f" at runner x p50 {q([r['meet'] for r in m])} after {q([r['meet_t'] for r in m])} s")
