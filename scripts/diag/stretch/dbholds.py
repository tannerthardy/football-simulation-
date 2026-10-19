"""Holds by defensive backs in one or more lab arms (trace 'holds' records):
share that broke (the hold slipped before the play ended, 'broke' recorded),
by the carrier's speed at the hold and by the hold's origin, with the grip at
the hold. A sim-only mechanism table; NFL tracking has no grasp labels.
usage: dbholds.py ARM [ARM ...] [--concept power]"""
import gzip, json, sys
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
concept = opt('--concept')
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for arm in [a for a in sys.argv[1:] if not a.startswith('--') and a != concept]:
    rows = []
    for r in map(json.loads, gzip.open(f'out/open-field/all/{arm}.jsonl.gz', 'rt')):
        if 'error' in r or (concept and r['concept'] != concept): continue
        for h in r.get('holds') or []:
            if h.get('d', '')[:2] in ('CB', 'FS', 'SS', 'NB'): rows.append({**h, 'gain': r['gain']})
    print(f"{arm}{' ' + concept if concept else ''}: DB holds {len(rows)}")
    for lo, hi in ((0, 5), (5, 7), (7, 8.5), (8.5, 99)):
        s = [h for h in rows if lo <= h.get('cs', 0) < hi]
        if s: print(f"  carrier {lo}-{hi} yd/s: n {len(s):4d} broke {100*sum(1 for h in s if h.get('broke') is not None)/len(s):3.0f}% | grip at hold p50 {q([h.get('grip0', 0) for h in s])} | tackler speed p50 {q([h.get('ds', 0) for h in s])} | open field {100*sum(1 for h in s if h.get('open'))/len(s):.0f}%")
