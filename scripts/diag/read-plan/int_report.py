"""His interception belief against how picks happen (risk work: the INT counterpart of the defended-ball calibration).
hot-games.ts rows with throwRec (P, intRisk, parts.intPath / intJump / intContest at the aimed point) and intKind (how
the pick happened: tipped first, on the path more than 0.15 s before the planned arrival, or at the catch point).
Reliability by his intRisk band; then, by which of his terms dominates, the observed INT rate and kind.
   python3 -I scripts/diag/read-plan/int_report.py <rows.jsonl> ...
"""
import json, sys
from collections import Counter
rows = [json.loads(l) for p in sys.argv[1:] for l in open(p)]
T = [r for r in rows if r['att'] and not r['throwaway'] and r.get('throwRec') and r['target'] == r['throwRec'].get('ref')]
print(f"throws {len(T)}, INT {sum(r['int'] for r in T)}, kinds {dict(Counter(r.get('intKind') for r in T if r['int']))}")
print("| his intRisk | n | predicted | observed | completion | yd/att |")
print("|---|---|---|---|---|---|")
for lo, hi in ((0, .005), (.005, .02), (.02, .05), (.05, 1)):
    g = [r for r in T if lo <= r['throwRec']['intRisk'] < hi]
    if g: print(f"| {lo}-{hi} | {len(g)} | {sum(r['throwRec']['intRisk'] for r in g)/len(g):.4f} | {sum(r['int'] for r in g)/len(g):.4f} | {sum(r['cmp'] for r in g)/len(g):.2f} | {sum(r['yards'] for r in g)/len(g):.1f} |")
print("\nBy his dominant INT term (at the aimed point):")
print("| dominant term | n | his path / jump / contest (mean) | observed INT | kinds |")
print("|---|---|---|---|---|")
P = [r for r in T if r['throwRec'].get('parts') and r['throwRec']['parts'].get('intPath') is not None]
def dom(p):
    a = {'path': p['intPath'], 'jump': p['intJump'], 'contest': p['intContest']}
    return 'none' if max(a.values()) < 1e-4 else max(a, key=a.get)
for k in ('none', 'path', 'jump', 'contest'):
    g = [r for r in P if dom(r['throwRec']['parts']) == k]
    if not g: continue
    m = lambda f: sum(r['throwRec']['parts'][f] for r in g) / len(g)
    print(f"| {k} | {len(g)} | {m('intPath'):.4f} / {m('intJump'):.4f} / {m('intContest'):.4f} | {sum(r['int'] for r in g)/len(g):.4f} | {dict(Counter(r.get('intKind') for r in g if r['int']))} |")
