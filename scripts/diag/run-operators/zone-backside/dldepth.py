# Hand-down depth (x off the LOS at the snap) of front defenders by the OL they line over: nearest OL laterally, |lat| <= 1.0, depth <= 1.6.
import sys, collections, statistics as st
exec(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'hloader.py')).read())
for path in sys.argv[1:]:
    R=collections.defaultdict(list)
    for hf, con, ol, ot, df, car, fc, sh in plays(path):
        line=sorted(ol[0],key=lambda q:q[1])
        for d in df[0]:
            if not (0 < d[0] <= 1.6): continue
            k=min(range(5),key=lambda i:abs(line[i][1]-d[1]))
            if abs(line[k][1]-d[1])>1.0: continue
            R[('C','G','T')[abs(k-2)]].append(d[0])
    print(path.split('/')[-1], ' '.join(f"over {s}: n{len(R[s])} p25/50/75 {st.quantiles(R[s],n=4)[0]:.2f}/{st.median(R[s]):.2f}/{st.quantiles(R[s],n=4)[2]:.2f}" for s in 'CGT'))
