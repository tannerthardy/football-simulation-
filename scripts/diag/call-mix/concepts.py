"""Per called concept, from collect.ts rows: how often it is called, completion and yards an attempt, sacks, the share
of throws to its first two reads, and where the ball goes (the target's route). Report only.

  python3 -I scripts/diag/call-mix/concepts.py out/call-mix/plays.jsonl [--only id,id,...]
"""
import json, sys, collections as C
from statistics import mean

rows = []; prog = {}
for l in open(sys.argv[1]):
    r = json.loads(l)
    if r.get('rec') == 'prog': prog.update(r['prog'])
    if r.get('rec') == 'play' and r['callKind'] == 'pass': rows.append(r)
only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
by = C.defaultdict(list)
for r in rows: by[r['concept']].append(r)
n = len(rows)
print(f'{n} called passes')
print('concept | called (share) | att | completion | Y/A | sack | to the first two reads | where the ball goes (target route)')
for cid, R in sorted(by.items(), key=lambda t: -len(t[1])):
    if only and cid not in only: continue
    A = [r for r in R if r['att'] and not r['throwaway']]
    comp = sum(r['cmp'] for r in A); first = prog.get(cid, [])[:2]
    to2 = sum(1 for r in A if r['target'] and r['target']['ref'] in first)
    where = C.Counter(f"{r['target']['ref']}:{r['target']['route']}" for r in A if r['target'])
    ya = mean(r['yards'] for r in A) if A else float('nan')
    print(f"{cid} | {len(R)} ({100 * len(R) / n:.1f}%) | {len(A)} | {100 * comp / max(1, len(A)):.0f}% | {ya:.1f} | {100 * sum(r['sack'] for r in R) / len(R):.0f}% | "
          f"{to2}/{len(A)} | " + ', '.join(f'{k} {v}' for k, v in where.most_common(4)))
