"""What the first tackle contact was on long gains (observation only, saved lab
traces). For plays with a first hold or tackle event, by outcome band: whether
the first try was a whiff (missed_tackle before any hold), a hold that later
broke, or a hold that finished; the carrier's and holder's speed at the hold,
the hold's lifetime, and how much speed the carrier lost while held.
usage: tailcontact.py LABEL [LABEL ...]"""
import gzip, json, sys
from collections import Counter
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for L in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt') if l.strip()]
    rows = [r for r in rows if 'error' not in r]
    for band, lo, hi in (('gain <10', -99, 10), ('10-19', 10, 20), ('20+', 20, 999)):
        sel = [r for r in rows if lo <= r['gain'] < hi]
        kinds = Counter(); cs, ds, life, kept = [], [], [], []
        for r in sel:
            ev = sorted(r.get('events') or [], key=lambda e: e['t'])
            holds = sorted(r.get('holds') or [], key=lambda h: h['t'])
            firstMiss = next((e['t'] for e in ev if e['type'] == 'missed_tackle'), None)
            h0 = holds[0] if holds else None
            if h0 is None and firstMiss is None: kinds['no tackle try'] += 1; continue
            if firstMiss is not None and (h0 is None or firstMiss < h0['t']): kinds['whiff first'] += 1; continue
            kinds['hold broke' if h0.get('broke') is not None else 'hold finished'] += 1
            cs.append(h0['cs']); ds.append(h0['ds'])
            if h0.get('broke') is not None: life.append(h0['broke']); kept.append(h0['csMin'] / max(.1, h0['cs']))
        n = len(sel)
        print(f"{L:8s} {band:8s} n {n:4d} | " + ' '.join(f"{k} {100*v/max(1,n):.0f}%" for k, v in kinds.most_common()) +
              f" | first hold: carrier {q(cs)} holder {q(ds)} yd/s | broken holds last {q(life)} s, carrier kept {q(kept)} of his speed")
