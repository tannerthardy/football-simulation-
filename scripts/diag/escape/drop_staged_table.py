"""QB lane: paired table for the staged CONCEPT_DROPS read (drop-staged rows, the same plays off and on).
usage: python3 -I drop_staged_table.py off.jsonl on.jsonl"""
import json, sys, statistics as st
L = lambda f: {(r['concept'], r['coverage'], r['roster'], r['seed']): r for r in (json.loads(l) for l in open(f) if l.startswith('{'))}
A, B = L(sys.argv[1]), L(sys.argv[2])
TEN = 'smash mesh flood drive sail_corner corner_flat trips_sail trips_outs double_outs comebacks'.split()
G = lambda c: 'ten five-step' if c in TEN else 'dagger,y_cross' if c in ('dagger', 'y_cross') else 'verts to gun3' if c in ('four_verts', 'verts_hitch') else 'untouched'
def summ(K, D):
    R = [D[k] for k in K]; T = [r for r in R if r['thr'] and not r['thr']['away']]; C = [r for r in T if r['cmp']]
    m = lambda v: (st.median(v) if v else float('nan'))
    return (f"plays {len(R):4d} att {len(T):4d} cmp {100 * len(C) / max(1, len(T)):3.0f}% y/a {sum(r['yards'] for r in C) / max(1, len(T)):5.2f} y/play {sum((r['yards'] or 0) for r in R) / len(R):5.2f} | aim {m([r['thr']['aim'] for r in T if r['thr']['aim'] is not None]):4.1f} "
            f"| ttt {m([r['thr']['t'] for r in T]):4.2f} | sep {m([r['thr']['sep'] for r in T if r['thr']['sep'] is not None]):3.1f} | read# {st.mean([r['thr']['readIdx'] or 0 for r in T]):4.2f} | sacks {sum(r['sacked'] for r in R):3d} int {sum(r['int'] for r in R):3d} | 20+ {sum(1 for r in C if (r['yards'] or 0) >= 20):3d}")
keys = [k for k in A if k in B]
for g in ['ten five-step', 'dagger,y_cross', 'verts to gun3', 'untouched'] + TEN + ['dagger', 'y_cross', 'four_verts', 'verts_hitch', 'stick', 'curl_flat']:
    K = [k for k in keys if G(k[0]) == g or k[0] == g]
    if K: print(f"{g:15s} off: {summ(K, A)}\n{'':15s} on : {summ(K, B)}")
U = [k for k in keys if G(k[0]) == 'untouched']
print('untouched concepts with identical yards off and on:', sum(1 for k in U if A[k]['yards'] == B[k]['yards']), 'of', len(U))
