"""The QB's depth against time on dropbacks, by alignment (Integration, 2026-11-13: TACKLE_SET's floor against where
the QB actually is). Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/qb-depth.py <plays.jsonl.gz> [...]

Alignment from the QB's depth at the snap: gun (3 yd or deeper), under center (shallower than 2 yd). Per 0.25 s from
0.5 to 3.0 s, frames with the ball still in his hands: his depth behind the line (p25/50/75) and n. The sim's
play-action concepts are dropped (cell.concept begins 'pa'); the NFL set has no play-action label and is not split.
"""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
TS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0]

for path in sys.argv[1:]:
    acc = {a: {t: [] for t in TS} for a in ('gun', 'under')}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        if str((raw.get('cell') or {}).get('concept', '')).startswith('pa'): continue
        p = Play(raw); qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; x0 = p.pos(qb, 0)[0]
        if x0 is None: continue
        al = 'gun' if x0 <= -3 else 'under' if x0 > -2 else None
        if al is None: continue
        fw = raw['events'].get('pass_forward'); end = fw if fw is not None else p.end
        for t in TS:
            if t >= end: break
            x = p.pos(qb, p.k(t))[0]
            if x is not None: acc[al][t].append(x)
    print(f"== {os.path.basename(path)}")
    for al, d in acc.items():
        print(f"   {al}: " + " | ".join(f"{t:.2f}s {q(v):+.2f} (n {len(v)})" for t, v in d.items() if len(v) >= 10))
