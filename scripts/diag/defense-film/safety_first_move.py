"""Read safety-first-move.mts rows: first committed move direction by play type; for lateral first moves, which movement
label, role and coverage sent him sideways (counts and shares); and his depth / width change from the snap spot at
0.5 / 1.0 / 1.5 / 2.0 s by role group and play type (width + = outward, away from the ball).
usage: python3 -I scripts/diag/defense-film/safety_first_move.py ROWS.jsonl [...]"""
import json, sys, collections
import numpy as np
R = [json.loads(l) for p in sys.argv[1:] for l in open(p)]
def grp(role):
    r = role or ''
    if r.startswith('deep_mid') or r == 'tampa_mid': return 'deep middle'
    if r.startswith('deep_half'): return 'deep half'
    if r.startswith('quarter'): return 'quarter'
    if r.startswith('deep_third'): return 'deep third'
    if r in ('man', 'blitz', 'rush'): return r
    return 'underneath / other' if r else 'none'
print(f'safety-plays {len(R)}')
for pt in ('run', 'play action', 'dropback', 'screen'):
    A = [r for r in R if r['ptype'] == pt and r['first']]
    C = collections.Counter(r['first']['dir'] for r in A)
    print(f'\n## {pt}: n {len(A)}: ' + ', '.join(f'{k} {100 * v / len(A):.0f}%' for k, v in C.most_common()))
    L = [r for r in A if r['first']['dir'].startswith('lateral')]
    print('  lateral first, by label at the move: ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(r['first']['label'] for r in L).most_common(8)))
    print('  lateral first, by role: ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(r['role'] for r in L).most_common(8)))
    print('  lateral first, by coverage family: ' + ', '.join(f'{k} {v}' for k, v in collections.Counter(r['fam'] for r in L).most_common(8)))
    print('  by role group: share lateral first / depth change at 0.5 / 1.0 / 1.5 / 2.0 s / width change (out +) at 0.5 / 1.0 / 1.5 / 2.0 s')
    for g in ('deep middle', 'deep half', 'quarter', 'deep third', 'underneath / other', 'man'):
        G = [r for r in A if grp(r['role']) == g]
        if len(G) < 8: continue
        lat = sum(r['first']['dir'].startswith('lateral') for r in G) / len(G)
        dd = ' / '.join(f"{np.median([r['path'][t][0] for r in G]):+.1f}" for t in ('0.5', '1.0', '1.5', '2.0'))
        ww = ' / '.join(f"{np.median([r['path'][t][1] for r in G]):+.1f}" for t in ('0.5', '1.0', '1.5', '2.0'))
        print(f'    {g:18s} n {len(G):4d}: lateral {100 * lat:3.0f}% | depth {dd} | width {ww}')
