"""The urgency bar (thr - 0.32u, maxInt + 0.08u): each started throw that was thrown (hot-games.ts rows with
throwRec), by urgency band: what he accepted (mean P, mean intRisk) against what happened (completion, INT, yards
an attempt), and the throws that clear the lowered bar but would not clear his normal one, against the NFL's
pressured throws (48% complete, 6.8 yd/att, 3% INT; Integration's figures).
   python3 -I scripts/diag/read-plan/urgency_report.py out/read-plan/<rows>.jsonl ...
"""
import json, sys

BANDS = [(-1e-9, 1e-9, 'u = 0'), (1e-9, .25, '0-.25'), (.25, .5, '.25-.5'), (.5, .75, '.5-.75'), (.75, 1.01, '.75-1')]

def line(name, g):
    if not g: return f"| {name} | 0 | | | | | | |"
    n = len(g)
    return (f"| {name} | {n} | {sum(r['throwRec']['P'] for r in g) / n:.2f} | {sum(r['cmp'] for r in g) / n:.2f} | "
            f"{sum(r['throwRec']['intRisk'] for r in g) / n:.3f} | {sum(r['int'] for r in g) / n:.3f} | {sum(r['yards'] for r in g) / n:.1f} | "
            f"{sum(1 for r in g if r['throwRec']['clearsNormal']) / n:.2f} |")

rows = [json.loads(l) for p in sys.argv[1:] for l in open(p)]
# A started throw that went to its target (not a throwaway or a pumped-and-changed throw).
thr = [r for r in rows if r['att'] and not r['throwaway'] and r.get('throwRec') and r['throwRec'].get('u') is not None
       and r['target'] == r['throwRec']['ref']]
print(f"{', '.join(sys.argv[1:])}: passes {len(rows)}, throws with a record {len(thr)}")
print("| u band | n | mean P accepted | completion | mean intRisk | INT rate | yd/att | share clearing the normal bar |")
print("|---|---|---|---|---|---|---|---|")
for lo, hi, name in BANDS:
    print(line(name, [r for r in thr if lo < r['throwRec']['u'] <= hi or (name == 'u = 0' and r['throwRec']['u'] == 0)]))
print(line('all', thr))
up = [r for r in thr if r['throwRec']['u'] > 0]
print("\nThrows under urgency (u > 0), by whether the normal bar would have taken them:")
print("| | n | mean P accepted | completion | mean intRisk | INT rate | yd/att | |")
print("|---|---|---|---|---|---|---|---|")
print(line('clears the normal bar', [r for r in up if r['throwRec']['clearsNormal']]))
print(line('only the lowered bar', [r for r in up if not r['throwRec']['clearsNormal']]))
print(line('of which hot path', [r for r in up if not r['throwRec']['clearsNormal'] and r['throwRec']['hot']]))
print("| NFL pressured throws | | | 0.48 | | 0.03 | 6.8 | |")
fr = [r for r in up if r['press'] and r['press']['free']]
print(f"\nFree rusher at 2 yd, thrown under urgency: {len(fr)}; only the lowered bar {sum(1 for r in fr if not r['throwRec']['clearsNormal'])}; "
      f"completion {sum(r['cmp'] for r in fr) / max(1, len(fr)):.2f}, mean P {sum(r['throwRec']['P'] for r in fr) / max(1, len(fr)):.2f}")
