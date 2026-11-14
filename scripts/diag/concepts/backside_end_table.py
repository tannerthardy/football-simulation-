"""Backside end on flow away, from backside-end.ts output (Defense's operator, 2026-11-13). Unblocked ends only:
rows whose engagedAt is set at or before 1.5 s are excluded. At 1.5 s: mean toPlay (yd toward the play along the
line), mean depth (yd into the backfield), mean speed (yd/s), and the chase share (toPlay > 0). All rows (run + pa)
and runs only. NFL 2.7 / 1.3 / 3.4 / 77%.
usage: python3 -I scripts/diag/concepts/backside_end_table.py a.jsonl [b.jsonl ...]"""
import json, sys
R = [json.loads(l) for f in sys.argv[1:] for l in open(f) if l.strip()]
R = [r for r in R if not (r.get('engagedAt') is not None and r['engagedAt'] <= 1.5) and r['marks'].get('1.5')]
for lab, rs in (('all', R), ('runs', [r for r in R if r['kind'] == 'run'])):
    m = [r['marks']['1.5'] for r in rs]
    if not m: print(f'{lab}: none'); continue
    mean = lambda k: sum(x.get(k, 0) or 0 for x in m) / len(m)
    print(f"{lab:4s} n {len(m):4d} | toPlay {mean('toPlay'):.2f} | depth {mean('depth'):.2f} | speed {mean('speed'):.2f} | chase {100*sum(x['toPlay'] > 0 for x in m)/len(m):.0f}%")
