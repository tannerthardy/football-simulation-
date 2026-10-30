import json, sys
from collections import Counter
for arm, paths in [(a.split('=')[0], a.split('=')[1].split(',')) for a in sys.argv[1:]]:
    hs = []; tfl = Counter()
    for path in paths:
        for p in json.load(open(path)):
            s = p['setup']
            if s.get('scheme') in ('draw', 'qbDraw', None) or not p['frames']: continue
            h = next((e['t'] for e in p['events'] if e['type'] == 'handoff'), None)
            if h is None: continue
            hs.append(h)
            b = 'late>=1.6' if h >= 1.6 else 'ok'
            tfl[(b, 'n')] += 1; tfl[(b, 'yd')] += p['yards']; tfl[(b, 'loss')] += p['yards'] < 0
    n = len(hs); hs.sort()
    print(arm, f"handoffs {n}, p50 {hs[n//2]:.2f} p90 {hs[int(n*.9)]:.2f} p99 {hs[int(n*.99)]:.2f}, >=1.6 s {sum(h>=1.6 for h in hs)/n:.1%}",
          {b: f"n {int(tfl[(b,'n')])} yd {tfl[(b,'yd')]/max(1,tfl[(b,'n')]):.2f} loss {tfl[(b,'loss')]/max(1,tfl[(b,'n')]):.0%}" for b in ('ok','late>=1.6')})
