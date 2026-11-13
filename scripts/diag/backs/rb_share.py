"""RB share of targets and time to throw to the back, ours (read-pass.ts JSONL, one file per arm) by concept and by the
NFL table's route shapes (nfl_checkdown.py: four-verts shape = 3+ receivers on go/seam; hitches = 3+ hitches; other).
   python3 -I scripts/diag/backs/rb_share.py off=out/backs/reads-0.jsonl on=out/backs/reads-1.jsonl"""
import json, sys, collections
def q(v):
    v = sorted(v); return '-' if len(v) < 4 else '/'.join(f'{v[int(p * (len(v) - 1))]:.2f}' for p in (.25, .5, .75))
def shape(reads):
    rt = [x.split(':')[1] for x in reads if not x.startswith('RB:')]
    if sum(r in ('go', 'seam') for r in rt) >= 3: return 'four-verts shape'
    if sum(r == 'hitch' for r in rt) >= 3: return 'hitches shape'
    return 'other'
arms = {a.split('=')[0]: [json.loads(l) for l in open(a.split('=')[1])] for a in sys.argv[1:]}
for name, R in arms.items():
    T = [r for r in R if r['thr']]
    rb = lambda X: [r for r in X if r['thr']['pos'] in ('RB', 'FB')]
    print(f"== {name}: targets {len(T)}, RB share {100 * len(rb(T)) / len(T):.1f}%, time to throw to the RB {q([r['thr']['t'] for r in rb(T)])}, to others {q([r['thr']['t'] for r in T if r not in rb(T)])}")
    for s in ('four-verts shape', 'hitches shape', 'other'):
        X = [r for r in T if shape(r['reads']) == s]
        if X: print(f"   {s:17} n {len(X):4} RB {100 * len(rb(X)) / len(X):4.0f}%  TTT RB {q([r['thr']['t'] for r in rb(X)])}")
    by = collections.defaultdict(list)
    for r in T: by[r['concept']].append(r)
    top = sorted(by.items(), key=lambda kv: -len(kv[1]))[:14]
    print('   by concept (n, RB%):', ', '.join(f"{c} {len(X)} {100 * len(rb(X)) / len(X):.0f}%" for c, X in top))
