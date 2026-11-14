"""Join recog-time.mts off / on rows by id: per concept class (run, draw, PA, pass), box LBs' first commitment time
p25/50/75, the share whose first commitment was right, the share reading run at the ball, and mean yards.
usage: python3 -I scripts/diag/eyes/recog_time_table.py off.jsonl on.jsonl"""
import json, sys
def load(p): return {r['id']: r for r in map(json.loads, open(p))}
def q(v, f): v = sorted(v); return v[int(f * (len(v) - 1))] if v else float('nan')
A, B = load(sys.argv[1]), load(sys.argv[2]); ids = [i for i in A if i in B]
cls = lambda r: 'draw' if r['concept'] == 'draw' else 'PA' if r['concept'].startswith('pa_') else 'run' if r['isRun'] else 'pass'
print(f'paired plays {len(ids)}; yards identical {sum(1 for i in ids if abs(A[i]["y"] - B[i]["y"]) < 1e-9)}')
for c in ['run', 'draw', 'PA', 'pass']:
    I = [i for i in ids if cls(A[i]) == c]
    if not I: continue
    for name, D in (('off', A), ('on', B)):
        L = [l for i in I for l in D[i]['lb']]
        t = [l['first'] for l in L if l['first'] is not None]
        right = [l['right'] for l in L if l['right'] is not None]
        run = [l['atBall'] == 'run' for l in L if l['atBall'] is not None]
        print(f'{c:5} {name:3} plays {len(I):4} LBs {len(L):4} | first commit p25/50/75 {q(t,.25):.2f}/{q(t,.5):.2f}/{q(t,.75):.2f} s | first right {100*sum(right)/max(1,len(right)):5.1f}% | reading run at the ball {100*sum(run)/max(1,len(run)):5.1f}% | yards {sum(D[i]["y"] for i in I)/len(I):6.2f}')
