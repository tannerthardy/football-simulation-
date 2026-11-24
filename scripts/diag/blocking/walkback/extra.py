import pickle, numpy as np
D = pickle.load(open('/tmp/claude-0/walkback/pairs.pkl','rb')); pairs=D['pairs']
for a,c in [(0,.5),(.5,1),(1,1.5),(1.5,2.5)]:
    s=[f['sep'] for P in pairs for f in P['fr'] if a<=f['dtc']<c]
    print(f"since contact {a}-{c}: mean sep {np.mean(s):.2f} yd; mean rusher-alone v {np.mean([f['vr'] for P in pairs for f in P['fr'] if 'vr' in f and a<=f['dtc']<c]):+.2f}; blocker-alone {np.mean([f['vb'] for P in pairs for f in P['fr'] if 'vb' in f and a<=f['dtc']<c]):+.2f}")
# per-pair separation change first 0.5 s
ch=[]
for P in pairs:
    f=[x for x in P['fr'] if x['dtc']<0.55]
    if len(f)>=5: ch.append(f[-1]['sep']-f[0]['sep'])
print("sep change over first 0.5 s since contact: mean", round(np.mean(ch),2), "p10/50/90", np.quantile(ch,[.1,.5,.9]).round(2), "n", len(ch))
# rusher-alone slope on diff 0-1 s, DL
def pm(P,lo,hi,k):
    v=[f[k] for f in P['fr'] if k in f and lo<=f['dtc']<hi]; return np.mean(v) if len(v)>=3 else None
for k in ('vr','vb'):
  for lo,hi in ((0,1),(1,2.5)):
    r=[(P['wr']-P['wb'],pm(P,lo,hi,k)) for P in pairs if P['rg']=='DL']; r=[x for x in r if x[1] is not None]
    X=np.array([x[0] for x in r]);Y=np.array([x[1] for x in r]); b=np.polyfit(X,Y,1)[0]
    print(k,lo,hi,"slope per 30 lb",round(30*b,3),"n",len(r))
