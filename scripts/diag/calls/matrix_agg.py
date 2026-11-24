"""Summary of the call-theory matrix cells (scripts/diag/calls/matrix.ts output; one jsonl per cell). python3 -I matrix_agg.py [DIR]"""
import json, glob, statistics as st, collections, sys
DIR = sys.argv[1] if len(sys.argv) > 1 else 'out/matrix'
def load(n): return [json.loads(l) for l in open(f'{DIR}/{n}.jsonl') if l.startswith('{')]
def med(v): v=[x for x in v if x is not None]; return round(st.median(v),2) if v else None
def recv(rows, ref, k): return [next((r[k] for r in d['receivers'] if r['ref']==ref), None) for d in rows]
def mandefs(rows, refs):
    out=collections.defaultdict(list)
    for d in rows:
        for x in d['defense']:
            if x['man'] in refs and x['traffic']: out[x['man']].append(x['traffic'])
    return {k:(f"{sum(t['ticks']>0 for t in v)}/{len(v)} with traffic, extra p50 {med([t['extra'] for t in v])}") for k,v in out.items()}
def routes(rows): return collections.Counter(tuple((r['ref'],r['route']) for r in d['receivers']) for d in rows).most_common(1)[0][0]
for n in ['c1','c1ctl','c2','c3','c3ctl','c4','c4ctl','c5','c5ctl','c5a','c5b','c6','c6ctl']:
    R=load(n); print(f'== {n} {R[0]["concept"]} {R[0]["coverage"]} {R[0]["formation"]} press={R[0]["press"]} n={len(R)}')
    print('  routes', routes(R))
    for ref in ('S1','S2','S3','W1','W2','B'):
        s15=recv(R,ref,'sep15')
        if any(x is not None for x in s15): print(f'  {ref}: sep p50 1.0/1.5/2.0/2.5 = {med(recv(R,ref,"sep10"))}/{med(s15)}/{med(recv(R,ref,"sep20"))}/{med(recv(R,ref,"sep25"))}; nearest safety @2.0 p50 {med(recv(R,ref,"safety20"))}')
    print('  man defenders:', mandefs(R, {'S1','S2','S3','W1','W2','B'}))
    if n.startswith('c5'): print('  mesh gap p50', med([d['mesh']['gap'] for d in R if d['mesh']]), 'S2 def to W2 p50', med([d['mesh']['s2DefToW2'] for d in R if d['mesh']]), 'W2 def to S2 p50', med([d['mesh']['w2DefToS2'] for d in R if d['mesh']]))
    if n.startswith('c3'):
        print('  W1: defenders within 5 yd @2.0:', collections.Counter(tuple(sorted(x)) for x in recv(R,'W1','near20') if x is not None).most_common(4))
    cov=collections.defaultdict(collections.Counter)
    for d in R:
        for x in d['defense']:
            if x['slot'] in ('CB_S','CB_W','NB','SS','FS','LB_M','LB_S','LB_W'): cov[x['slot']][f"{x['role']}:{x['man'] or '-'}->{x['covered']}"]+=1
    print('  covered:', {k:v.most_common(2) for k,v in cov.items()})
