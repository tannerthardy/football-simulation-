import json, sys
from collections import defaultdict
for path in sys.argv[1:]:
    bins = defaultdict(list)
    for r in json.load(open(path)):
        if r['dPos'] not in ('DT', 'EDGE'): continue
        b = round(min(max(r['massB'] / r['massD'], 0.85), 1.35) * 20) / 20
        for s in r['samples']:
            if 0.5 <= s['t'] <= 3 and s['helpers'] == 0: bins[b].append(s['vD'])
    print(path, ' single blocks: defender backward speed p50 by mass ratio')
    print('   ' + '  '.join(f"{b:.2f}:{sorted(v)[len(v)//2]:+.2f}" for b, v in sorted(bins.items()) if len(v) > 150))
