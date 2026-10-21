"""The cap's encounters (deep-zone DB: FS/SS in deep zones, deep-third/quarter
corners) on long runs, from the lab trace: per run with an encounter by a
cap slot, the first such encounter's outcome (wrap/miss/...), carrier and
defender speed, along/across geometry, closing speed, depth; whether a hold
followed and broke. usage: capmeet.py LABEL [MIN_GAIN=20]"""
import gzip, json, sys
from collections import Counter
L = sys.argv[1]; G = float(sys.argv[2]) if len(sys.argv) > 2 else 20
CAP = {'FS', 'SS', 'CB_S', 'CB_W'}
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
out = Counter(); rows = []
for line in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt'):
    r = json.loads(line)
    if 'error' in r or r['gain'] < G: continue
    enc = [e for e in (r.get('enc') or []) if e['d'] in CAP and e['depth'] > 6]
    if not enc: out['no deep encounter'] += 1; continue
    e = enc[0]
    h = next((h for h in (r.get('holds') or []) if h['d'] == e['d'] and h['t'] >= e['t'] - .05), None)
    res = e['out'] + ('/hold-broke' if h and h.get('broke') is not None else '/hold-kept' if h else '/no-hold')
    out[res] += 1
    rows.append(dict(cs=e['cs'], ds=e['ds'], along=e['along'], across=e['across'], closing=e['closing'], depth=e['depth'], dAlong=e['dAlong']))
n = sum(out.values())
print(f"{L}: runs {G:.0f}+ {n} | " + ', '.join(f"{k} {v}" for k, v in out.most_common()))
if rows:
    for k in ('depth', 'cs', 'ds', 'closing', 'along', 'across', 'dAlong'):
        print(f"   {k:8s} p25/50/75 {q([x[k] for x in rows], .25)}/{q([x[k] for x in rows])}/{q([x[k] for x in rows], .75)}")
