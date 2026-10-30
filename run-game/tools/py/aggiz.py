import json,glob,statistics as st,collections,sys
R=collections.defaultdict(list); T=collections.Counter()
for f in glob.glob(sys.argv[1]):
    for line in open(f):
        if line.startswith('JSON '):
            d=json.loads(line[5:])
            for k,v in d['R'].items(): R[k]+=v
            for k,v in d['T'].items(): T[k]+=v
q=lambda v,p: sorted(v)[int(p*(len(v)-1))]
for k in sorted(R): v=R[k]; print(f"{k:48} n {len(v):4} med {st.median(v):6.2f} p25 {q(v,.25):6.2f} p75 {q(v,.75):6.2f}")
for k in sorted(T): print(f"{k:48} {T[k]}")
