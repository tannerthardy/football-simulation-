"""After a double releases a climber: his travel over the next 0.5 s, and his
distance to the backer at release and +0.5/+1.0 s; whether the climber was
the playside or backside member.
python -I scripts/diag/zone-lab/climbs.py 'out/zone-lab/X-*.jsonl.gz' [concepts]"""
import glob, gzip, json, sys, math, statistics as st
from collections import defaultdict
rows = [json.loads(l) for f in sorted(glob.glob(sys.argv[1])) for l in gzip.open(f, 'rt')]
conc = sys.argv[2].split(',') if len(sys.argv) > 2 else ['oz', 'wz']
out = defaultdict(list)
for r in rows:
    if 'error' in r or r['concept'] not in conc: continue
    seen = set(); fr = r['frames']; ps = r['ps']
    at = lambda t: min(fr, key=lambda f: abs(f['t'] - t))
    for slot, p in r['plan0'].items():
        cb = p['combo']
        if not cb or not cb['backer'] or tuple(cb['members']) in seen: continue
        seen.add(tuple(cb['members']))
        bi = r['slots'].index(cb['backer']); mi = [r['slots'].index(m) for m in cb['members']]
        f0 = next((f for f in fr if any(tg[0] in mi and tg[1] == bi for tg in f['tg'])), None)
        if not f0: continue
        ci = next(tg[0] for tg in f0['tg'] if tg[0] in mi and tg[1] == bi)
        other = [m for m in mi if m != ci][0]
        side = 'playside' if (f0['p'][ci][1] - f0['p'][other][1]) * ps > 0 else 'backside'
        d = lambda f: math.hypot(f['p'][ci][0] - f['p'][bi][0], f['p'][ci][1] - f['p'][bi][1])
        f5, f10 = at(f0['t'] + .5), at(f0['t'] + 1.0)
        travel = math.hypot(f5['p'][ci][0] - f0['p'][ci][0], f5['p'][ci][1] - f0['p'][ci][1])
        out[(r['concept'], side)].append((travel, d(f0), d(f5), d(f10)))
for k in sorted(out):
    v = out[k]
    print(k, len(v), 'travel0.5s %.2f' % st.median(x[0] for x in v), '| dist to backer at release %.2f, +0.5 %.2f, +1.0 %.2f' % tuple(st.median(x[i] for x in v) for i in (1, 2, 3)),
          '| stuck(<0.6yd in 0.5s) %.0f%%' % (100 * sum(x[0] < .6 for x in v) / len(v)))
