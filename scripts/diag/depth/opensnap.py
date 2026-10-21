"""Every defender when the runner first reaches +5 (open-field snapshot in the
lab trace), by slot family: engaged (in a block), down, or free, and his x
relative to the carrier (ahead > 0). Split by final gain band.
usage: opensnap.py LABEL [LABEL ...]"""
import gzip, json, sys
from collections import defaultdict
fam = lambda s: 'DL' if s[:2] in ('DE', 'DT', 'NT') else 'LB' if s.startswith('LB') else 'CB' if s.startswith('CB') or s == 'NB' else 'S'
for L in sys.argv[1:]:
    for band, lo, hi in (('5-19', 5, 20), ('20+', 20, 999)):
        n = 0; agg = defaultdict(lambda: defaultdict(float))
        for line in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt'):
            r = json.loads(line)
            if 'error' in r or not r.get('snap') or not (lo <= r['gain'] < hi): continue
            n += 1
            path = r['path']; cx = path[0][1] if path else None
            dirn = r['dir'] if 'dir' in r else 1
            # carrier x at the open moment (first path row); sign by attack direction from common frames
            com = r['common']; c = com['carrier']; k = int(round(r['openAt'] / com['dt'])) if r.get('openAt') else 0
            k = min(k, len(com['xy']) - 1)
            cxr = com['xy'][k][2 * c]
            off = sum(1 for p in com['players'] if p['side'] == 'O')
            for i, d in enumerate(r['snap']):
                f = fam(d['d']); a = agg[f]
                a['n'] += 1
                state = 'down' if d['down'] else 'eng' if d['eng'] else 'free'
                a[state] += 1
                rel = com['xy'][k][2 * (off + i)] - cxr if com['xy'][k][2 * (off + i)] is not None else 0
                if state == 'free': a['ahead'] += rel > 0; a['near'] += abs(rel) <= 3
        print(f"{L:8s} {band:5s} runs {n}: " + ' | '.join(
            f"{f} eng {a['eng']/n:.2f} down {a['down']/n:.2f} free {a['free']/n:.2f} (ahead {a['ahead']/n:.2f})"
            for f, a in sorted(agg.items())))
