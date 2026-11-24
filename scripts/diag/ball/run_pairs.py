"""Compare two run_pairs.mts arms (BALL_DRAG off vs on) on plays with an identical pre-snap setup (same index, same setup key).
  python3 -I scripts/diag/ball/run_pairs.py OFF_A.json ON_A.json [OFF_B.json ON_B.json ...]"""
import json, sys, collections
a = sys.argv[1:]
tot = collections.Counter(); first = []; diffs = []
for i in range(0, len(a), 2):
    off = json.load(open(a[i])); on = json.load(open(a[i + 1]))
    for go, gn in zip(off, on):
        div = None
        for p, q in zip(go['plays'], gn['plays']):
            same_setup = p['key'] == q['key']
            if div is None and (p['text'] != q['text'] or p['yards'] != q['yards'] or not same_setup): div = (p['n'], p['kind'], same_setup)
            if not same_setup: continue
            k = 'run' if p['kind'] == 'run' else 'pass' if p['kind'] == 'pass' else p['kind']
            tot[(k, 'identical setup')] += 1
            if p['text'] == q['text'] and p['yards'] == q['yards']: tot[(k, 'same result')] += 1
            else:
                tot[(k, 'different result')] += 1; diffs.append((go['seed'], p['n'], k, p['key'], p['text'][:90], q['text'][:90]))
        first.append((go['seed'], div, len(go['plays']), len(gn['plays'])))
print('first divergence per game (seed, (play index, kind of the off-arm play, same setup?), plays off, plays on):')
for f in first: print(' ', f)
print()
for k in sorted(set(k for k, _ in tot)): print(f'{k}: identical-setup plays {tot[(k, "identical setup")]}, same result {tot[(k, "same result")]}, different result {tot[(k, "different result")]}')
print()
for d in diffs[:12]: print(d)
