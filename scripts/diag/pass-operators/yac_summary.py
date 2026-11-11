import json, sys, statistics as st
def load(p): return [json.loads(l) for l in open(p) if l.strip()]
N=load(sys.argv[1]); S=load(sys.argv[2])
B=[('behind',-99,0),('0-5',0,5),('5-10',5,10),('10-15',10,15),('15-20',15,20),('20+',20,999)]
def q(v,p): v=sorted(v); return v[int(p*(len(v)-1))] if v else float('nan')
def mean(v): return sum(v)/len(v) if v else float('nan')
mN=mean([r['yac'] for r in N]); mS=mean([r['yac'] for r in S])
print(f"YAC a reception: NFL {mN:.2f} (n {len(N)})  sim {mS:.2f} (n {len(S)})  excess {mS-mN:+.2f}")
print("bucket | share NFL/sim | YAC mean NFL/sim | p50 | p90 | excess explained: within-bucket + composition = total")
tot=0
for name,lo,hi in B:
  n=[r for r in N if lo<=r['air']<hi]; s=[r for r in S if lo<=r['air']<hi]
  sn,ss=len(n)/len(N),len(s)/len(S); an,as_=mean([r['yac'] for r in n]),mean([r['yac'] for r in s])
  within=ss*(as_-an) if s and n else 0; comp=(ss-sn)*an if n else 0; tot+=within+comp
  print(f"{name:7s}| {sn:.3f}/{ss:.3f} | {an:5.2f}/{as_:5.2f} | {q([r['yac'] for r in n],.5):.1f}/{q([r['yac'] for r in s],.5):.1f} | {q([r['yac'] for r in n],.9):.1f}/{q([r['yac'] for r in s],.9):.1f} | {within:+.2f} {comp:+.2f} = {within+comp:+.2f}")
print(f"sum {tot:+.2f}")
print("\ndefenders deeper than the receiver at the catch: share NFL/sim, YAC mean NFL/sim, excess explained")
for name,f in [('0',lambda r:r['deeper']==0),('1',lambda r:r['deeper']==1),('2+',lambda r:r['deeper']>=2)]:
  n=[r for r in N if f(r)]; s=[r for r in S if f(r)]; sn,ss=len(n)/len(N),len(s)/len(S); an,as_=mean([r['yac'] for r in n]),mean([r['yac'] for r in s])
  print(f"{name:3s}| {sn:.3f}/{ss:.3f} | {an:5.2f}/{as_:5.2f} | within {ss*(as_-an):+.2f} comp {(ss-sn)*an:+.2f}")
print("\nby depth x nobody deeper (share of receptions; YAC):")
for name,lo,hi in B:
  for dn,f in [('0 deeper',lambda r:r['deeper']==0),('1+ deeper',lambda r:r['deeper']>=1)]:
    n=[r for r in N if lo<=r['air']<hi and f(r)]; s=[r for r in S if lo<=r['air']<hi and f(r)]
    if len(n)+len(s)==0: continue
    print(f"  {name:7s} {dn:9s} NFL {len(n)/len(N):.3f} {mean([r['yac'] for r in n]):5.2f} | sim {len(s)/len(S):.3f} {mean([r['yac'] for r in s]):5.2f} | excess {len(s)/len(S)*mean([r['yac'] for r in s] or [0]) - len(n)/len(N)*mean([r['yac'] for r in n] or [0]):+.2f}")
print("\nstages (median; contact = defender centre within 1.0 yd):")
for lab,key in [('nearest at catch (yd)','near'),('closing speed (yd/s)','closing'),('defenders within 3 yd at catch','n3'),('within 5','n5')]:
  print(f"  {lab:34s} NFL {q([r[key] for r in N],.5):.2f}  sim {q([r[key] for r in S],.5):.2f}")
for lab,key in [('time catch -> first contact (s)','tContact'),('yards catch -> first contact','ydsToContact'),('yards after first contact','afterContact'),('time first contact -> end (s)','endAfter'),('second defender within 1 yd (s after catch)','tSecond')]:
  vn=[r[key] for r in N if r.get(key) is not None]; vs=[r[key] for r in S if r.get(key) is not None]
  print(f"  {lab:34s} NFL {q(vn,.5):.2f} (mean {mean(vn):.2f}, n {len(vn)})  sim {q(vs,.5):.2f} (mean {mean(vs):.2f}, n {len(vs)})")
nc=[r for r in N if r.get('tContact') is None]; sc=[r for r in S if r.get('tContact') is None]
print(f"  no contact before the end: NFL {len(nc)/len(N):.3f} (YAC {mean([r['yac'] for r in nc]):.2f})  sim {len(sc)/len(S):.3f} (YAC {mean([r['yac'] for r in sc]):.2f})")
for lim in (1,2,3):
  print(f"  play over within 0.5 s of first contact... yards after contact <= {lim}: NFL {mean([r['afterContact']<=lim for r in N if r.get('afterContact') is not None]):.2f} sim {mean([r['afterContact']<=lim for r in S if r.get('afterContact') is not None]):.2f}")
print("\ntail:")
for lim in (10,15,30): print(f"  YAC > {lim}: NFL {mean([r['yac']>lim for r in N]):.3f} sim {mean([r['yac']>lim for r in S]):.3f}; share of total YAC NFL {sum(r['yac'] for r in N if r['yac']>lim)/sum(r['yac'] for r in N):.2f} sim {sum(r['yac'] for r in S if r['yac']>lim)/sum(r['yac'] for r in S):.2f}")
for lab,f in [('YAC>15',lambda r:r['yac']>15),('YAC<=15',lambda r:r['yac']<=15)]:
  for side,R in (('NFL',N),('sim',S)):
    L=[r for r in R if f(r)]; sp=[p[0] for r in L for p in r['pursuit'][:2]]; an=[p[1] for r in L for p in r['pursuit'][:2] if p[1] is not None]
    print(f"  {lab:8s} {side}: nearest two at the catch: speed p50 {q(sp,.5):.2f} angle-to-carrier p50 {q(an,.5):.0f} deg; nearest {q([r['near'] for r in L],.5):.2f} yd; deeper=0 share {mean([r['deeper']==0 for r in L]):.2f}")
print("\nman/zone (sim: any man assignment on the play; NFL: pff_manZone):")
for side,R in (('NFL',N),('sim',S)):
  for m in ('Man','Zone'):
    L=[r for r in R if r['man']==m]; print(f"  {side} {m}: share {len(L)/len(R):.2f} YAC {mean([r['yac'] for r in L]):.2f} nearest {q([r['near'] for r in L],.5):.2f}")
