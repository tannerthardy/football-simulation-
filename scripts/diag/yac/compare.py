"""Paired comparison of replay.ts outputs from two checkouts (files r-<seed>.jsonl in each dir, same setups).
python3 -I compare.py A_DIR B_DIR"""
import json, sys, glob, statistics as st
def load(d):
    out = {}
    for f in glob.glob(f'{d}/r-*.jsonl'):
        seed = f.split('r-')[-1].split('.')[0]
        for l in open(f):
            if l.strip():
                r = json.loads(l); out[f'{seed}:{r["key"]}'] = r
    return out
A, B = load(sys.argv[1]), load(sys.argv[2])
keys = sorted(set(A) & set(B))
err = sum('error' in A[k] or 'error' in B[k] for k in keys)
keys = [k for k in keys if 'error' not in A[k] and 'error' not in B[k]]
same = sum(A[k] == B[k] for k in keys)
def mean(v): return sum(v) / len(v) if v else float('nan')
def summ(R, lab):
    comp = [r for r in R if r['comp']]
    yac = [r['yac'] for r in comp if r['yac'] is not None]
    sep = [r['sep'] for r in R if r['sep'] is not None]
    air = [r['air'] for r in comp if r['air'] is not None]
    ct = [r['contactT'] for r in comp if r['contactT'] is not None]
    print(f"  {lab}: plays {len(R)} comp {100*len(comp)/len(R):.1f}% | YAC/catch {mean(yac):.2f} | sep (att) {mean(sep):.2f} | catch depth {mean(air):.2f} | catch→contact {mean(ct):.2f}s (no contact {sum(r['contactT'] is None for r in comp)}) | first-contact tackles {100*mean([r['firstTackled'] for r in comp if r['contactT'] is not None]):.0f}% | missed {mean([r['missed'] for r in comp]):.2f} broken {mean([r['broken'] for r in comp]):.2f} | TD {sum(r['td'] for r in comp)} | yds/play {mean([r['yards'] for r in R]):.2f} sacks {sum(r['sack'] for r in R)} ints {sum(r['int'] for r in R)}")
print(f'paired {len(keys)} (errors {err}); identical rows {same} ({100*same/len(keys):.1f}%)')
summ([A[k] for k in keys], 'A'); summ([B[k] for k in keys], 'B')
both = [k for k in keys if A[k]['comp'] and B[k]['comp']]
d = [B[k]['yac'] - A[k]['yac'] for k in both if A[k]['yac'] is not None and B[k]['yac'] is not None]
print(f'  both complete {len(both)}: YAC diff mean {mean(d):+.2f} (SE {st.pstdev(d)/len(d)**.5 if d else 0:.2f}); comp flips A->B: lost {sum(A[k]["comp"] and not B[k]["comp"] for k in keys)}, gained {sum(B[k]["comp"] and not A[k]["comp"] for k in keys)}')
