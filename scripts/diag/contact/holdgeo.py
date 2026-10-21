"""Holds by approach angle and how they were made (lab traces): break rate,
speeds, slack at the grab, capacity, and for broken holds their life and the
speed the carrier kept. usage: holdgeo.py LABEL [LABEL ...]"""
import gzip, json, sys
from collections import defaultdict
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for L in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt') if l.strip()]
    rows = [r for r in rows if 'error' not in r]
    H = [h for r in rows for h in (r.get('holds') or [])]
    print(L, 'holds', len(H), 'plays', len(rows))
    g = defaultdict(list)
    for h in H:
        a = 'head' if h['cosA'] > .3 else 'behind' if h['cosA'] < -.3 else 'side'
        o = h['origin'].split('+')[0]
        g[(a, o)].append(h); g[(a, '*')].append(h)
    for k in sorted(g):
        v = g[k]; br = [h for h in v if h.get('broke') is not None]
        print(f"  {k[0]:6s} {k[1]:6s} n {len(v):5d} broke {100*len(br)/len(v):3.0f}% | cs {q([h['cs'] for h in v])} ds {q([h['ds'] for h in v])} slack {q([h['reach']-h['hold0'] for h in v])} cap0 {q([h['cap0'] for h in v])} | broken: life {q([h['broke'] for h in br])} kept {q([h['csMin']/max(.1,h['cs']) for h in br])} dSup {sum(h.get('dSup')!='up' for h in br)} slip {sum(bool(h.get('slipping')) for h in br)}")
