"""Catch -> first contact on completed passes, same code both sides: the first frame from the catch at which a defender is within
1.0 yd of the catcher (the shared first-contact rule), until the play ends. p25/50/75 time, share with no contact in 3.0 s,
and yards gained from the catch to the end (YAC by the catcher's x) p50/mean for catches with contact."""
import sys, os, json, gzip, math, statistics as st
for path in sys.argv[1:]:
    T=[]; none=0; n=0; Y=[]
    for l in gzip.open(path,'rt'):
        p=json.loads(l); ev=p.get('events',{})
        if p.get('kind')!='pass' or 'catch' not in ev: continue
        c=p.get('receiver',p.get('target')); X=p['xy']
        if c is None: continue
        f=int(round(ev['catch']/0.1)); end=min(len(X)-1,int(round(ev.get('end',99)/0.1)))
        if f<1 or f>=end: continue
        D=[i for i,q in enumerate(p['players']) if q['side']=='D']; n+=1
        t=next((k for k in range(f,min(end,f+30)+1) if min(math.dist((X[k][2*i],X[k][2*i+1]),(X[k][2*c],X[k][2*c+1])) for i in D)<=1.0),None)
        if t is None: none+=1
        else: T.append((t-f)/10)
        Y.append(X[end][2*c]-X[f][2*c])
    q=st.quantiles(T,n=4)
    print(f"== {os.path.basename(path)}: {n} catches | catch -> first contact p25/50/75 {q[0]:.1f}/{q[1]:.1f}/{q[2]:.1f} s | none within 3 s {none/n:.0%} | catcher x gain catch->end p50 {st.median(Y):.1f} mean {st.mean(Y):.1f}")
